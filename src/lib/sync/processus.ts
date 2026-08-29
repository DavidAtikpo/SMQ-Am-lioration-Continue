import { prisma } from "@/lib/db";
import { getCordistePool, schemaFromEnv, table, toIsoDate } from "@/lib/sync/external-db";
import { upsertIndicators } from "@/lib/sync/indicators-db";
import type { SyncResult } from "@/lib/sync/types";

const DELAI_JOURS_ALERTE = 7;

type DemandeRow = {
  id: string;
  session: string;
  entreprise: string | null;
  nomCompletStagiaire: string | null;
  createdAt: Date;
  jours_attente: number;
};

export async function syncProcessusIndicators(): Promise<{
  indicators: SyncResult;
  actions: SyncResult;
}> {
  const pool = getCordistePool();
  if (!pool) throw new Error("CORDISTE_DATABASE_URL manquant");

  const schema = schemaFromEnv(process.env.CORDISTE_DATABASE_URL, "webirata");
  const tDemande = table(schema, "Demande");
  const tDevis = table(schema, "Devis");
  const tSuivi = table(schema, "DemandeSuivi");
  const year = new Date().getFullYear();

  const stats = (
    await pool.query<{
      demandes_attente: string;
      demandes_retard: string;
      sans_devis: string;
      relances_3: string;
    }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE d.statut = 'EN_ATTENTE')::text AS demandes_attente,
        COUNT(*) FILTER (
          WHERE d.statut = 'EN_ATTENTE'
            AND d."createdAt" < NOW() - ($1 || ' days')::interval
        )::text AS demandes_retard,
        COUNT(*) FILTER (
          WHERE d.statut = 'EN_ATTENTE'
            AND NOT EXISTS (SELECT 1 FROM ${tDevis} dv WHERE dv."demandeId" = d.id)
            AND d."createdAt" < NOW() - ($1 || ' days')::interval
        )::text AS sans_devis,
        (SELECT COUNT(*)::text FROM ${tSuivi} s WHERE s."nombreRelances" >= 3) AS relances_3
      FROM ${tDemande} d
      WHERE d."createdAt" >= $2::date
    `,
      [String(DELAI_JOURS_ALERTE), `${year}-01-01`],
    )
  ).rows[0];

  const indicatorResult = await upsertIndicators([
    {
      id: `PROC-DEM-ATTENTE-${year}`,
      source: "webirata-processus",
      category: "commercial",
      label: "Demandes en attente",
      value: stats?.demandes_attente ?? "0",
      numeric: Number(stats?.demandes_attente ?? 0),
      period: String(year),
    },
    {
      id: `PROC-DEM-RETARD-${year}`,
      source: "webirata-processus",
      category: "commercial",
      label: `Demandes > ${DELAI_JOURS_ALERTE} j sans traitement`,
      value: stats?.demandes_retard ?? "0",
      numeric: Number(stats?.demandes_retard ?? 0),
      period: String(year),
      detail: "Délai de réponse — amélioration continue",
    },
    {
      id: `PROC-SANS-DEVIS-${year}`,
      source: "webirata-processus",
      category: "commercial",
      label: "Sans devis après délai",
      value: stats?.sans_devis ?? "0",
      numeric: Number(stats?.sans_devis ?? 0),
      period: String(year),
    },
    {
      id: `PROC-RELANCES-3-${year}`,
      source: "webirata-processus",
      category: "commercial",
      label: "Dossiers avec 3 relances",
      value: stats?.relances_3 ?? "0",
      numeric: Number(stats?.relances_3 ?? 0),
      period: String(year),
    },
  ]);

  const retardRows = (
    await pool.query<DemandeRow>(
      `
      SELECT d.id, d.session, d.entreprise, d."nomCompletStagiaire", d."createdAt",
             EXTRACT(day FROM NOW() - d."createdAt")::int AS jours_attente
      FROM ${tDemande} d
      WHERE d.statut = 'EN_ATTENTE'
        AND d."createdAt" < NOW() - ($1 || ' days')::interval
        AND NOT EXISTS (SELECT 1 FROM ${tDevis} dv WHERE dv."demandeId" = d.id)
      ORDER BY d."createdAt" ASC
      LIMIT 20
    `,
      [String(DELAI_JOURS_ALERTE)],
    )
  ).rows;

  const service = await prisma.service.upsert({
    where: { name: "Commercial" },
    update: {},
    create: { name: "Commercial" },
  });

  const actionResult: SyncResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of retardRows) {
    const smqId = `PROC-D-${row.id.slice(-8).toUpperCase()}`;
    const description = [
      `Demande en attente depuis ${row.jours_attente} jours — sans devis.`,
      `Session : ${row.session}`,
      row.entreprise ? `Entreprise : ${row.entreprise}` : null,
      row.nomCompletStagiaire ? `Stagiaire : ${row.nomCompletStagiaire}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const existing = await prisma.action.findUnique({ where: { id: smqId } });
      await prisma.action.upsert({
        where: { id: smqId },
        update: {
          description,
          echeance: toIsoDate(new Date()),
          statut: "À faire",
          priorite: row.jours_attente >= 14 ? "Haute" : "Moyenne",
        },
        create: {
          id: smqId,
          type: "Amélioration",
          origine: "Webirata · Processus",
          description,
          serviceId: service.id,
          responsable: "",
          dateCreation: toIsoDate(row.createdAt),
          echeance: toIsoDate(new Date()),
          statut: "À faire",
          priorite: row.jours_attente >= 14 ? "Haute" : "Moyenne",
          efficacite: "",
          ncId: null,
        },
      });
      if (existing) actionResult.updated += 1;
      else actionResult.imported += 1;
    } catch (error) {
      actionResult.errors.push(`${row.id}: ${error instanceof Error ? error.message : "erreur"}`);
    }
  }

  return { indicators: indicatorResult, actions: actionResult };
}
