export const SYNC_SERVICES = {
  cordiste: "Formation cordiste",
  planification: "Planification",
} as const;

/** Comptes Agenda inclus dans la sync SMQ (planification ciblée). */
export const AGENDA_SYNC_EMAILS_DEFAULT = [
  "pm@cides.tf",
  "davidatikpo44@gmail.com",
] as const;

export function getAgendaSyncEmails(): string[] {
  const fromEnv = process.env.AGENDA_SYNC_EMAILS?.trim();
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }
  return [...AGENDA_SYNC_EMAILS_DEFAULT];
}

export function mapNcGravite(value: string): string {
  const map: Record<string, string> = {
    MINEURE: "Mineure",
    MAJEURE: "Majeure",
    CRITIQUE: "Critique",
  };
  return map[value] ?? "Mineure";
}

export function mapNcStatut(value: string): string | null {
  const map: Record<string, string> = {
    OUVERTE: "Ouverte",
    EN_COURS: "En traitement",
    FERMEE: "Clôturée",
  };
  return map[value] ?? null;
}

export function mapNcSource(type: string): string {
  const labels: Record<string, string> = {
    SECURITE: "Sécurité",
    QUALITE: "Qualité",
    PROCEDURE: "Procédure",
    EQUIPEMENT: "Équipement",
    FORMATION: "Formation",
    DOCUMENTATION: "Documentation",
    ENVIRONNEMENT: "Environnement",
    AUTRE: "Autre",
  };
  return `Cordiste · ${labels[type] ?? type}`;
}

export function mapActionType(value: string): string {
  const map: Record<string, string> = {
    CORRECTION_IMMEDIATE: "Corrective",
    ACTION_CORRECTIVE: "Corrective",
    ACTION_PREVENTIVE: "Préventive",
    AMELIORATION_CONTINUE: "Amélioration",
  };
  return map[value] ?? "Corrective";
}

export function mapActionStatut(value: string): string | null {
  const map: Record<string, string> = {
    EN_ATTENTE: "À faire",
    EN_COURS: "En cours",
    TERMINEE: "Réalisée",
  };
  return map[value] ?? null;
}

export function mapActionPriorite(value: string): string {
  const map: Record<string, string> = {
    BASSE: "Basse",
    MOYENNE: "Moyenne",
    HAUTE: "Haute",
    CRITIQUE: "Haute",
  };
  return map[value] ?? "Moyenne";
}

/** Statut SMQ simplifié — on ne reproduit pas le Kanban Neurix (doing, testing, review…). */
export function mapAgendaTaskStatut(): string {
  return "À faire";
}

export function mapAgendaTaskPriorite(value: string): string {
  const map: Record<string, string> = {
    low: "Basse",
    medium: "Moyenne",
    high: "Haute",
    urgent: "Haute",
  };
  return map[value] ?? "Moyenne";
}

/** Les tâches Agenda alimentent le suivi SMQ comme actions d'amélioration. */
export function mapAgendaActionType(): string {
  return "Amélioration";
}

export function mapEfficacite(value: string | null | undefined, resultats?: string | null): string {
  const labels: Record<string, string> = {
    TRES_EFFICACE: "Très efficace",
    EFFICACE: "Efficace",
    PARTIELLEMENT_EFFICACE: "Partiellement efficace",
    INEFFICACE: "Inefficace",
    very: "Très efficace",
    good: "Efficace",
  };
  const parts = [value ? labels[value] ?? value : "", resultats ?? ""].filter(Boolean);
  return parts.join(" — ");
}
