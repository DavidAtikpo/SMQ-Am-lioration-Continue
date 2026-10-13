/** Traductions fixes (calendrier QHSE, libellés récurrents) — sans appel IA. */
export const SMQ_STATIC_EN: Readonly<Record<string, string>> = {
  "Points à auditer : NC, actions, indicateurs stagiaires, satisfaction, délais processus.":
    "Points to audit: non-conformities, actions, trainee indicators, satisfaction, process timelines.",
  "Synthèse des 2 audits internes, NC, actions, KPI formation et satisfaction.":
    "Summary of the 2 internal audits, NCs, actions, training KPIs and satisfaction.",
  "Suivi trimestriel des actions SMQ et indicateurs.":
    "Quarterly review of QMS actions and indicators.",
  "Contenu détaillé à générer via l'assistant IA.":
    "Detailed content to generate via the AI assistant.",
  "Direction · Qualité": "Management · Quality",
  "Planification · Qualité · Direction": "Scheduling · Quality · Management",
};

export function translateStaticLine(line: string): string {
  const t = line.trim();
  if (SMQ_STATIC_EN[t]) return SMQ_STATIC_EN[t];

  const audit = t.match(/^Audit interne S(\d+) (\d{4})$/i);
  if (audit) return `Internal audit S${audit[1]} ${audit[2]}`;

  const meeting = t.match(/^Réunion interne T(\d+) (\d{4})$/i);
  if (meeting) return `Internal meeting Q${meeting[1]} ${meeting[2]}`;

  const review = t.match(/^Revue de direction (\d{4})$/i);
  if (review) return `Management review ${review[1]}`;

  return line;
}

/** Applique les traductions ligne à ligne (calendrier + libellés connus). */
export function applyStaticTranslations(text: string): string {
  if (!text.trim()) return text;
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      const translated = translateStaticLine(trimmed);
      if (translated === trimmed) return line;
      return line.replace(trimmed, translated);
    })
    .join("\n");
}

export function staticEnForFrenchText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const exact = SMQ_STATIC_EN[trimmed];
  if (exact) return exact;

  const out = applyStaticTranslations(trimmed);
  if (out.trim() === trimmed) return null;
  return out;
}
