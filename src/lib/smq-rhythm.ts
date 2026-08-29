/** Rythme QHSE cible — base pour planification automatique par l'IA. */
export const SMQ_RHYTHME = {
  reunionInterne: { cibleParAn: 4, periode: "trimestre" as const },
  auditInterne: { cibleParAn: 2, periode: "semestre" as const },
  revueDirection: { cibleParAn: 1, periode: "annuel" as const },
} as const;

export type SmqEventTypePlanifie = "Réunion interne" | "Audit interne" | "Revue de Direction";

export const SMQ_EVENT_TYPES: SmqEventTypePlanifie[] = [
  "Réunion interne",
  "Audit interne",
  "Revue de Direction",
];

/** Fenêtres suggérées pour génération automatique (mois 1-12). */
export const SMQ_CALENDRIER_SUGGERE = {
  reunionInterne: [3, 6, 9, 12],
  auditInterne: [6, 12],
  revueDirection: [12],
} as const;
