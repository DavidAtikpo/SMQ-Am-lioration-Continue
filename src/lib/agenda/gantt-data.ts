import { buildGanttRows } from "@/lib/agenda/gantt-rows";
import type {
  AgendaAssignee,
  AgendaGanttPayload,
  AgendaGanttSession,
  AgendaGanttTask,
} from "@/lib/agenda/types";
import { getAgendaSyncEmails } from "@/lib/sync/mappers";
import { getAgendaPool, schemaFromEnv, table, toIsoDate } from "@/lib/sync/external-db";

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
  assignee_details: AgendaAssignee[] | null;
  group_name: string | null;
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

/** Même périmètre que syncAgenda : tâches et sessions Laurent ↔ David. */
export async function fetchAgendaGanttData(): Promise<AgendaGanttPayload> {
  const pool = getAgendaPool();
  if (!pool) {
    throw new Error("AGENDA_DATABASE_URL manquant dans .env");
  }

  const schema = schemaFromEnv(process.env.AGENDA_DATABASE_URL, "agenda");
  const tTask = table(schema, "Task");
  const tUser = table(schema, "User");
  const tTaskAssignment = table(schema, "TaskAssignment");
  const tGroup = table(schema, "Group");
  const tTrainingSession = table(schema, "TrainingSession");
  const tSessionAssignment = table(schema, "SessionAssignment");
  const syncEmails = getAgendaSyncEmails();

  const taskRows = (
    await pool.query<AgendaTaskRow>(
      `
      SELECT t.id, t.title, t.description, t.status, t.priority, t."dueDate", t."createdAt",
             cb.name AS creator_name,
             g.name AS group_name,
             (
               SELECT string_agg(u.name, ', ' ORDER BY u.name)
               FROM ${tTaskAssignment} ta
               JOIN ${tUser} u ON ta."userId" = u.id
               WHERE ta."taskId" = t.id
                 AND lower(u.email) = ANY($1::text[])
             ) AS assignees,
             (
               SELECT json_agg(
                 json_build_object('name', u.name, 'initials', u.initials, 'color', u.color)
                 ORDER BY u.name
               )
               FROM ${tTaskAssignment} ta
               JOIN ${tUser} u ON ta."userId" = u.id
               WHERE ta."taskId" = t.id
                 AND lower(u.email) = ANY($1::text[])
             ) AS assignee_details
      FROM ${tTask} t
      JOIN ${tUser} cb ON t."createdById" = cb.id
      LEFT JOIN ${tGroup} g ON t."groupId" = g.id
      WHERE lower(cb.email) = ANY($1::text[])
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

  const tasks: AgendaGanttTask[] = taskRows.map((row) => ({
    id: row.id,
    title: row.title.trim(),
    description: row.description?.trim() ?? "",
    status: row.status,
    priority: row.priority,
    createdAt: toIsoDate(row.createdAt),
    dueDate: row.dueDate ? toIsoDate(row.dueDate) : null,
    assignees: row.assignees ?? "",
    assigneeDetails: row.assignee_details ?? [],
    creatorName: row.creator_name ?? "",
    groupName: row.group_name?.trim() || null,
  }));

  const sessions: AgendaGanttSession[] = sessionRows.map((row) => ({
    id: row.id,
    title: row.title.trim(),
    startDate: toIsoDate(row.startDate),
    endDate: toIsoDate(row.endDate),
    examDate: row.examDate ? toIsoDate(row.examDate) : null,
    participants: row.participants ?? "",
    creatorName: row.creator_name ?? "",
  }));

  const rows = buildGanttRows(tasks, sessions);

  return {
    tasks,
    sessions,
    rows,
    syncedAt: new Date().toISOString(),
  };
}
