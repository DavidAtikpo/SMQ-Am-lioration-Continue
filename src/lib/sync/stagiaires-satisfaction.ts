import { getCordistePool, schemaFromEnv, table } from "@/lib/sync/external-db";
import { upsertIndicators } from "@/lib/sync/indicators-db";
import type { IndicatorUpsert, SyncResult } from "@/lib/sync/types";

export async function syncStagiairesIndicators(): Promise<SyncResult> {
  const pool = getCordistePool();
  if (!pool) throw new Error("CORDISTE_DATABASE_URL manquant");

  const schema = schemaFromEnv(process.env.CORDISTE_DATABASE_URL, "webirata");
  const tExam = table(schema, "IrataExamValidation");
  const tKpi = table(schema, "KpiDonneesManuelles");
  const year = new Date().getFullYear();

  const examStats = (
    await pool.query<{ reussis: string; echoues: string; total: string }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE validated = true)::text AS reussis,
        COUNT(*) FILTER (WHERE validated = false)::text AS echoues,
        COUNT(*)::text AS total
      FROM ${tExam}
      WHERE session ILIKE $1 OR "validatedAt" >= $2::date
    `,
      [`%${year}%`, `${year}-01-01`],
    )
  ).rows[0];

  const kpiRows = (
    await pool.query<{
      annee: number;
      reussi: number;
      echoue: number;
      stagiairesInscrits: number;
      libellePeriode: string;
      pays: string | null;
    }>(
      `
      SELECT annee, reussi, echoue, "stagiairesInscrits", "libellePeriode", pays
      FROM ${tKpi}
      WHERE annee >= $1
      ORDER BY annee DESC, "libellePeriode" ASC
    `,
      [year - 1],
    )
  ).rows;

  const rows: IndicatorUpsert[] = [
    {
      id: `STAG-EXAM-REUSSIS-${year}`,
      source: "webirata-stagiaires",
      category: "formation",
      label: "Examens réussis",
      value: examStats?.reussis ?? "0",
      numeric: Number(examStats?.reussis ?? 0),
      period: String(year),
      detail: "IrataExamValidation (sessions récentes)",
    },
    {
      id: `STAG-EXAM-ECHOUES-${year}`,
      source: "webirata-stagiaires",
      category: "formation",
      label: "Examens non validés",
      value: examStats?.echoues ?? "0",
      numeric: Number(examStats?.echoues ?? 0),
      period: String(year),
    },
    {
      id: `STAG-EXAM-TOTAL-${year}`,
      source: "webirata-stagiaires",
      category: "formation",
      label: "Examens enregistrés",
      value: examStats?.total ?? "0",
      numeric: Number(examStats?.total ?? 0),
      period: String(year),
    },
  ];

  for (const k of kpiRows) {
    const suffix = `${k.annee}-${k.libellePeriode.replace(/\s+/g, "-").slice(0, 24)}`;
    rows.push(
      {
        id: `STAG-KPI-REUSSIS-${suffix}`,
        source: "webirata-stagiaires",
        category: "formation",
        label: `Réussis (${k.libellePeriode})`,
        value: String(k.reussi),
        numeric: k.reussi,
        period: `${k.annee}${k.pays ? ` · ${k.pays}` : ""}`,
        detail: k.libellePeriode,
      },
      {
        id: `STAG-KPI-ECHOUES-${suffix}`,
        source: "webirata-stagiaires",
        category: "formation",
        label: `Échoués (${k.libellePeriode})`,
        value: String(k.echoue),
        numeric: k.echoue,
        period: `${k.annee}${k.pays ? ` · ${k.pays}` : ""}`,
        detail: k.libellePeriode,
      },
      {
        id: `STAG-KPI-INSCRITS-${suffix}`,
        source: "webirata-stagiaires",
        category: "formation",
        label: `Stagiaires inscrits (${k.libellePeriode})`,
        value: String(k.stagiairesInscrits),
        numeric: k.stagiairesInscrits,
        period: `${k.annee}${k.pays ? ` · ${k.pays}` : ""}`,
        detail: k.libellePeriode,
      },
    );
  }

  return upsertIndicators(rows);
}

export async function syncSatisfactionIndicators(): Promise<SyncResult> {
  const pool = getCordistePool();
  if (!pool) throw new Error("CORDISTE_DATABASE_URL manquant");

  const schema = schemaFromEnv(process.env.CORDISTE_DATABASE_URL, "webirata");
  const tChaud = table(schema, "SatisfactionStagiaireChaud");
  const tFroid = table(schema, "SatisfactionStagiaireFroid");
  const tEnt = table(schema, "SatisfactionEntrepriseFroid");
  const year = new Date().getFullYear();

  const chaud = (
    await pool.query<{ total: string; recommend: string }>(
      `
      SELECT COUNT(*)::text AS total,
        COUNT(*) FILTER (
          WHERE lower(coalesce("q4Recommander", '')) LIKE '%oui%'
            OR lower(coalesce("q4Recommander", '')) LIKE '%yes%'
        )::text AS recommend
      FROM ${tChaud}
      WHERE "createdAt" >= $1::date
    `,
      [`${year}-01-01`],
    )
  ).rows[0];

  const froid = (
    await pool.query<{ total: string; recommend: string }>(
      `
      SELECT COUNT(*)::text AS total,
        COUNT(*) FILTER (
          WHERE lower(coalesce("q4Recommander", '')) LIKE '%oui%'
            OR lower(coalesce("q4Recommander", '')) LIKE '%yes%'
        )::text AS recommend
      FROM ${tFroid}
      WHERE "createdAt" >= $1::date
    `,
      [`${year}-01-01`],
    )
  ).rows[0];

  const entreprise = (
    await pool.query<{ total: string; recommend: string }>(
      `
      SELECT COUNT(*)::text AS total,
        COUNT(*) FILTER (
          WHERE lower(coalesce("q3RecommanderFormation", '')) LIKE '%oui%'
            OR lower(coalesce("q3RecommanderFormation", '')) LIKE '%yes%'
        )::text AS recommend
      FROM ${tEnt}
      WHERE "createdAt" >= $1::date
    `,
      [`${year}-01-01`],
    )
  ).rows[0];

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  const chaudTotal = Number(chaud?.total ?? 0);
  const chaudRec = Number(chaud?.recommend ?? 0);
  const froidTotal = Number(froid?.total ?? 0);
  const froidRec = Number(froid?.recommend ?? 0);
  const entTotal = Number(entreprise?.total ?? 0);
  const entRec = Number(entreprise?.recommend ?? 0);

  return upsertIndicators([
    {
      id: `SAT-CHAUD-TOTAL-${year}`,
      source: "webirata-satisfaction",
      category: "satisfaction",
      label: "Satisfaction à chaud (réponses)",
      value: String(chaudTotal),
      numeric: chaudTotal,
      period: String(year),
    },
    {
      id: `SAT-CHAUD-RECOMMEND-${year}`,
      source: "webirata-satisfaction",
      category: "satisfaction",
      label: "Recommanderaient (chaud)",
      value: `${pct(chaudRec, chaudTotal)}%`,
      numeric: pct(chaudRec, chaudTotal),
      period: String(year),
      detail: `${chaudRec}/${chaudTotal} réponses positives`,
    },
    {
      id: `SAT-FROID-TOTAL-${year}`,
      source: "webirata-satisfaction",
      category: "satisfaction",
      label: "Satisfaction à froid stagiaire",
      value: String(froidTotal),
      numeric: froidTotal,
      period: String(year),
    },
    {
      id: `SAT-FROID-RECOMMEND-${year}`,
      source: "webirata-satisfaction",
      category: "satisfaction",
      label: "Recommanderaient (froid stagiaire)",
      value: `${pct(froidRec, froidTotal)}%`,
      numeric: pct(froidRec, froidTotal),
      period: String(year),
      detail: `${froidRec}/${froidTotal} réponses positives`,
    },
    {
      id: `SAT-ENT-TOTAL-${year}`,
      source: "webirata-satisfaction",
      category: "satisfaction",
      label: "Satisfaction entreprise inscriptrice",
      value: String(entTotal),
      numeric: entTotal,
      period: String(year),
    },
    {
      id: `SAT-ENT-RECOMMEND-${year}`,
      source: "webirata-satisfaction",
      category: "satisfaction",
      label: "Entreprises recommanderaient",
      value: `${pct(entRec, entTotal)}%`,
      numeric: pct(entRec, entTotal),
      period: String(year),
      detail: `${entRec}/${entTotal} réponses positives`,
    },
  ]);
}
