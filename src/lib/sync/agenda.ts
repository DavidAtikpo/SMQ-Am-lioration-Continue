import { prisma } from "@/lib/db";
import { getAgendaPool, schemaFromEnv, table, toIsoDate } from "@/lib/sync/external-db";
import {
  getAgendaSyncEmails,
  mapAgendaActionType,
  mapAgendaTaskPriorite,
  mapAgendaTaskStatut,
  SYNC_SERVICES,
} from "@/lib/sync/mappers";
import type { SyncResult } from "@/lib/sync/types";

type AgendaTaskRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  creator_name: string | null;
  assignees: string | null;
};

type AgendaSessionRow = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  examDate: Date | null;
  creator_name: string | null;
  participants: string | null;
};

function agendaTaskSmqId(agendaId: string): string {
  return `AGENDA-T-${agendaId.slice(-8).toUpperCase()}`;
}

function agendaSessionSmqId(agendaId: string): string {
  return `AGENDA-S-${agendaId.slice(-8).toUpperCase()}`;
}

async function ensureService(name: string): Promise<string> {
  const service = await prisma.service.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return service.id;
}

async function cleanupAgendaActions(keepIds: string[]): Promise<number> {
  const removed = await prisma.action.deleteMany({
    where: {
      id: { startsWith: "AGENDA-T-" },
      ...(keepIds.length > 0 ? { NOT: { id: { in: keepIds } } } : {}),
    },
  });
  return removed.count;
}

async function cleanupAgendaEvents(keepIds: string[]): Promise<number> {
  const removed = await prisma.event.deleteMany({
    where: {
      id: { startsWith: "AGENDA-S-" },
      ...(keepIds.length > 0 ? { NOT: { id: { in: keepIds } } } : {}),
    },
  });
  return removed.count;
}

export async function syncAgenda(): Promise<{
  tasks: SyncResult;
  sessions: SyncResult;
  removed: { tasks: number; sessions: number };
}> {
  const pool = getAgendaPool();
  if (!pool) {
    throw new Error("AGENDA_DATABASE_URL manquant dans .env");
  }

  const serviceId = await ensureService(SYNC_SERVICES.planification);
  const taskResult: SyncResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  const sessionResult: SyncResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  const syncedTaskIds: string[] = [];
  const syncedSessionIds: string[] = [];

  const schema = schemaFromEnv(process.env.AGENDA_DATABASE_URL, "agenda");
  const tTask = table(schema, "Task");
  const tUser = table(schema, "User");
  const tTaskAssignment = table(schema, "TaskAssignment");
  const tTrainingSession = table(schema, "TrainingSession");
  const tSessionAssignment = table(schema, "SessionAssignment");
  const syncEmails = getAgendaSyncEmails();

  // Uniquement tâches Laurent ↔ David :
  // - créateur Laurent ou David
  // - au moins un assigné (pas de tâche sans assignation)
  // - tous les assignés sont Laurent ou David (pas de tiers)
  // - assignation croisée (pas auto-assignation personnelle)
  const taskRows = (
    await pool.query<AgendaTaskRow>(
      `
      SELECT t.id, t.title, t.description, t.status, t.priority, t."dueDate", t."createdAt",
             cb.name AS creator_name,
             (
               SELECT string_agg(u.name, ', ' ORDER BY u.name)
               FROM ${tTaskAssignment} ta
               JOIN ${tUser} u ON ta."userId" = u.id
               WHERE ta."taskId" = t.id
                 AND lower(u.email) = ANY($1::text[])
             ) AS assignees
      FROM ${tTask} t
      JOIN ${tUser} cb ON t."createdById" = cb.id
      WHERE t.status NOT IN ('done')
        AND lower(cb.email) = ANY($1::text[])
        AND EXISTS (
          SELECT 1 FROM ${tTaskAssignment} ta WHERE ta."taskId" = t.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM ${tTaskAssignment} ta
          JOIN ${tUser} u ON ta."userId" = u.id
          WHERE ta."taskId" = t.id
            AND lower(u.email) <> ALL($1::text[])
        )
        AND EXISTS (
          SELECT 1
          FROM ${tTaskAssignment} ta
          JOIN ${tUser} u ON ta."userId" = u.id
          WHERE ta."taskId" = t.id
            AND lower(u.email) = ANY($1::text[])
            AND lower(u.email) <> lower(cb.email)
        )
      ORDER BY t."createdAt" DESC
    `,
      [syncEmails],
    )
  ).rows;

  for (const row of taskRows) {
    const smqId = agendaTaskSmqId(row.id);
    syncedTaskIds.push(smqId);
    const responsable = row.assignees || "";

    try {
      const existing = await prisma.action.findUnique({ where: { id: smqId } });
      await prisma.action.upsert({
        where: { id: smqId },
        update: {
          type: mapAgendaActionType(),
          origine: "Agenda",
          description: row.description?.trim()
            ? `${row.title.trim()}\n\n${row.description.trim()}`
            : row.title.trim(),
          serviceId,
          responsable,
          dateCreation: toIsoDate(row.createdAt),
          echeance: row.dueDate ? toIsoDate(row.dueDate) : "",
          statut: mapAgendaTaskStatut(),
          priorite: mapAgendaTaskPriorite(row.priority),
          efficacite: "",
          ncId: null,
        },
        create: {
          id: smqId,
          type: mapAgendaActionType(),
          origine: "Agenda",
          description: row.description?.trim()
            ? `${row.title.trim()}\n\n${row.description.trim()}`
            : row.title.trim(),
          serviceId,
          responsable,
          dateCreation: toIsoDate(row.createdAt),
          echeance: row.dueDate ? toIsoDate(row.dueDate) : "",
          statut: mapAgendaTaskStatut(),
          priorite: mapAgendaTaskPriorite(row.priority),
          efficacite: "",
          ncId: null,
        },
      });
      if (existing) taskResult.updated += 1;
      else taskResult.imported += 1;
    } catch (error) {
      taskResult.errors.push(`${row.title}: ${error instanceof Error ? error.message : "erreur"}`);
    }
  }

  // Sessions : créateur Laurent/David + intervenant l'autre (pas de session solo ni tiers).
  const sessionRows = (
    await pool.query<AgendaSessionRow>(
      `
      SELECT ts.id, ts.title, ts."startDate", ts."endDate", ts."examDate",
             cb.name AS creator_name,
             (
               SELECT string_agg(u.name || ' (' || sa.role || ')', ', ' ORDER BY u.name)
               FROM ${tSessionAssignment} sa
               JOIN ${tUser} u ON sa."userId" = u.id
               WHERE sa."sessionId" = ts.id
                 AND lower(u.email) = ANY($1::text[])
             ) AS participants
      FROM ${tTrainingSession} ts
      JOIN ${tUser} cb ON ts."createdById" = cb.id
      WHERE lower(cb.email) = ANY($1::text[])
        AND NOT EXISTS (
          SELECT 1
          FROM ${tSessionAssignment} sa
          JOIN ${tUser} u ON sa."userId" = u.id
          WHERE sa."sessionId" = ts.id
            AND lower(u.email) <> ALL($1::text[])
        )
        AND EXISTS (
          SELECT 1
          FROM ${tSessionAssignment} sa
          JOIN ${tUser} u ON sa."userId" = u.id
          WHERE sa."sessionId" = ts.id
            AND lower(u.email) = ANY($1::text[])
            AND lower(u.email) <> lower(cb.email)
        )
      ORDER BY ts."startDate" ASC
    `,
      [syncEmails],
    )
  ).rows;

  const today = new Date().toISOString().slice(0, 10);

  for (const row of sessionRows) {
    const smqId = agendaSessionSmqId(row.id);
    syncedSessionIds.push(smqId);
    const start = toIsoDate(row.startDate);
    const end = toIsoDate(row.endDate);
    const statut = start >= today ? "Planifié" : "Réalisé";
    const ordreDuJour = [
      `Session : ${row.title}`,
      `Période : ${start} → ${end}`,
      row.examDate ? `Examen : ${toIsoDate(row.examDate)}` : null,
      row.participants ? `Intervenants : ${row.participants}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const existing = await prisma.event.findUnique({ where: { id: smqId } });
      await prisma.event.upsert({
        where: { id: smqId },
        update: {
          type: "Réunion interne",
          date: start,
          statut,
          servicesConcernes: [SYNC_SERVICES.planification, SYNC_SERVICES.cordiste],
          participants: row.participants ?? row.creator_name ?? "",
          ordreDuJour,
          compteRendu: "",
        },
        create: {
          id: smqId,
          type: "Réunion interne",
          date: start,
          statut,
          servicesConcernes: [SYNC_SERVICES.planification, SYNC_SERVICES.cordiste],
          participants: row.participants ?? row.creator_name ?? "",
          ordreDuJour,
          compteRendu: "",
        },
      });
      if (existing) sessionResult.updated += 1;
      else sessionResult.imported += 1;
    } catch (error) {
      sessionResult.errors.push(`${row.title}: ${error instanceof Error ? error.message : "erreur"}`);
    }
  }

  const removedTasks = await cleanupAgendaActions(syncedTaskIds);
  const removedSessions = await cleanupAgendaEvents(syncedSessionIds);

  return {
    tasks: taskResult,
    sessions: sessionResult,
    removed: { tasks: removedTasks, sessions: removedSessions },
  };
}
