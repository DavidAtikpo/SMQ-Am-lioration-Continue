import { prisma } from "@/lib/db";
import { getCordistePool, fullName, schemaFromEnv, table, toIsoDate } from "@/lib/sync/external-db";
import {
  mapActionPriorite,
  mapActionStatut,
  mapActionType,
  mapEfficacite,
  mapNcGravite,
  mapNcSource,
  mapNcStatut,
  SYNC_SERVICES,
} from "@/lib/sync/mappers";
import { formatCordisteDescription } from "@/lib/cordiste-text";
import type { SyncResult } from "@/lib/sync/types";

type CordisteNcRow = {
  id: string;
  numero: string;
  titre: string;
  description: string;
  type: string;
  gravite: string;
  statut: string;
  dateDetection: Date;
  analysisCauses: string | null;
  resp_nom: string | null;
  resp_prenom: string | null;
  det_nom: string | null;
  det_prenom: string | null;
};

type CordisteActionRow = {
  id: string;
  nonConformiteId: string | null;
  titre: string;
  description: string;
  type: string;
  statut: string;
  priorite: string;
  dateDebut: Date;
  dateEcheance: Date | null;
  efficacite: string | null;
  resultats: string | null;
  nc_numero: string | null;
  resp_nom: string | null;
  resp_prenom: string | null;
};

async function ensureService(name: string): Promise<string> {
  const service = await prisma.service.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return service.id;
}

export async function syncCordiste(): Promise<{
  nonConformites: SyncResult;
  actions: SyncResult;
}> {
  const pool = getCordistePool();
  if (!pool) {
    throw new Error("CORDISTE_DATABASE_URL manquant dans .env");
  }

  const serviceId = await ensureService(SYNC_SERVICES.cordiste);
  const ncResult: SyncResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  const actionResult: SyncResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  const schema = schemaFromEnv(process.env.CORDISTE_DATABASE_URL, "webirata");
  const tNc = table(schema, "NonConformite");
  const tUser = table(schema, "User");
  const tAction = table(schema, "ActionCorrective");

  const ncRows = (
    await pool.query<CordisteNcRow>(`
      SELECT nc.id, nc.numero, nc.titre, nc.description, nc.type, nc.gravite, nc.statut,
             nc."dateDetection", nc."analysisCauses",
             resp.nom AS resp_nom, resp.prenom AS resp_prenom,
             det.nom AS det_nom, det.prenom AS det_prenom
      FROM ${tNc} nc
      LEFT JOIN ${tUser} resp ON nc."responsableId" = resp.id
      LEFT JOIN ${tUser} det ON nc."detecteurId" = det.id
      WHERE nc.statut <> 'ANNULEE'
      ORDER BY nc."dateDetection" DESC
    `)
  ).rows;

  const ncIdByCordisteId = new Map<string, string>();

  for (const row of ncRows) {
    const statut = mapNcStatut(row.statut);
    if (!statut) {
      ncResult.skipped += 1;
      continue;
    }

    const smqId = `CORD-${row.numero}`;
    ncIdByCordisteId.set(row.id, smqId);
    const responsable =
      fullName(row.resp_nom, row.resp_prenom) ||
      fullName(row.det_nom, row.det_prenom);

    try {
      const existing = await prisma.nonConformite.findUnique({ where: { id: smqId } });
      await prisma.nonConformite.upsert({
        where: { id: smqId },
        update: {
          date: toIsoDate(row.dateDetection),
          serviceId,
          source: mapNcSource(row.type),
          gravite: mapNcGravite(row.gravite),
          statut,
          description: formatCordisteDescription(row.titre, row.description),
          causeRacine: row.analysisCauses ?? "",
          responsable,
        },
        create: {
          id: smqId,
          date: toIsoDate(row.dateDetection),
          serviceId,
          source: mapNcSource(row.type),
          gravite: mapNcGravite(row.gravite),
          statut,
          description: formatCordisteDescription(row.titre, row.description),
          causeRacine: row.analysisCauses ?? "",
          responsable,
        },
      });
      if (existing) ncResult.updated += 1;
      else ncResult.imported += 1;
    } catch (error) {
      ncResult.errors.push(`${row.numero}: ${error instanceof Error ? error.message : "erreur"}`);
    }
  }

  const actionRows = (
    await pool.query<CordisteActionRow>(`
      SELECT ac.id, ac."nonConformiteId", ac.titre, ac.description, ac.type, ac.statut, ac.priorite,
             ac."dateDebut", ac."dateEcheance", ac.efficacite, ac.resultats,
             nc.numero AS nc_numero,
             u.nom AS resp_nom, u.prenom AS resp_prenom
      FROM ${tAction} ac
      LEFT JOIN ${tNc} nc ON ac."nonConformiteId" = nc.id
      LEFT JOIN ${tUser} u ON ac."responsableId" = u.id
      WHERE ac.statut <> 'ANNULEE'
      ORDER BY ac."dateDebut" DESC
    `)
  ).rows;

  for (const row of actionRows) {
    const statut = mapActionStatut(row.statut);
    if (!statut) {
      actionResult.skipped += 1;
      continue;
    }

    const smqId = `CORD-AC-${row.id.slice(-8).toUpperCase()}`;
    const ncId = row.nonConformiteId
      ? ncIdByCordisteId.get(row.nonConformiteId) ??
        (row.nc_numero ? `CORD-${row.nc_numero}` : null)
      : null;

    try {
      const existing = await prisma.action.findUnique({ where: { id: smqId } });
      await prisma.action.upsert({
        where: { id: smqId },
        update: {
          type: mapActionType(row.type),
          origine: row.nc_numero ? `CORD-${row.nc_numero}` : "Cordiste",
          description: formatCordisteDescription(row.titre, row.description),
          serviceId,
          responsable: fullName(row.resp_nom, row.resp_prenom),
          dateCreation: toIsoDate(row.dateDebut),
          echeance: row.dateEcheance ? toIsoDate(row.dateEcheance) : "",
          statut,
          priorite: mapActionPriorite(row.priorite),
          efficacite: mapEfficacite(row.efficacite, row.resultats),
          ncId,
        },
        create: {
          id: smqId,
          type: mapActionType(row.type),
          origine: row.nc_numero ? `CORD-${row.nc_numero}` : "Cordiste",
          description: formatCordisteDescription(row.titre, row.description),
          serviceId,
          responsable: fullName(row.resp_nom, row.resp_prenom),
          dateCreation: toIsoDate(row.dateDebut),
          echeance: row.dateEcheance ? toIsoDate(row.dateEcheance) : "",
          statut,
          priorite: mapActionPriorite(row.priorite),
          efficacite: mapEfficacite(row.efficacite, row.resultats),
          ncId,
        },
      });
      if (existing) actionResult.updated += 1;
      else actionResult.imported += 1;
    } catch (error) {
      actionResult.errors.push(`${row.titre}: ${error instanceof Error ? error.message : "erreur"}`);
    }
  }

  return { nonConformites: ncResult, actions: actionResult };
}
