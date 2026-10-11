export type SmqLocale = "fr" | "en";

export const SMQ_LOCALE_STORAGE_KEY = "smq-locale";

export function parseSmqLocale(value: unknown): SmqLocale {
  return value === "en" ? "en" : "fr";
}

const PDF_LABELS = {
  fr: {
    docCodeAudit: "SMQ-AUDIT-INT",
    docCodePlan: "SMQ-PLAN",
    internalAuditSheet: "Fiche — Audit interne SMQ",
    planningTitle: "Planification SMQ — Calendrier QHSE",
    generatedOn: "Généré le",
    reference: "Référence",
    type: "Type",
    date: "Date",
    status: "Statut",
    services: "Services concernés",
    participants: "Participants",
    agenda: "Ordre du jour",
    minutes: "Compte-rendu / constats",
    rhythm: "Rythme QHSE",
    internalMeetings: "Réunions internes",
    internalAudits: "Audits internes",
    managementReview: "Revue de Direction",
    footer: "CI.DES — Système de management de la qualité",
    none: "—",
    year: "Année",
    allPeriods: "Toutes périodes",
    tableReference: "Référence",
    tableType: "Type",
    tableDate: "Date",
    tableStatus: "Statut",
    tableServices: "Services",
    tableParticipants: "Participants",
    tableAgenda: "Ordre du jour",
    noEventsPeriod: "Aucun événement planifié pour cette période.",
    detailsSection: "Détails — ordre du jour et comptes-rendus",
    lineAgenda: "Ordre du jour",
    lineMinutes: "Compte-rendu",
  },
  en: {
    docCodeAudit: "SMQ-AUDIT-INT",
    docCodePlan: "SMQ-PLAN",
    internalAuditSheet: "Internal QMS Audit Sheet",
    planningTitle: "QMS Planning — QHSE Calendar",
    generatedOn: "Generated on",
    reference: "Reference",
    type: "Type",
    date: "Date",
    status: "Status",
    services: "Services involved",
    participants: "Participants",
    agenda: "Agenda",
    minutes: "Minutes / findings",
    rhythm: "QHSE rhythm",
    internalMeetings: "Internal meetings",
    internalAudits: "Internal audits",
    managementReview: "Management review",
    footer: "CI.DES — Quality management system",
    none: "—",
    year: "Year",
    allPeriods: "All periods",
    tableReference: "Reference",
    tableType: "Type",
    tableDate: "Date",
    tableStatus: "Status",
    tableServices: "Services",
    tableParticipants: "Participants",
    tableAgenda: "Agenda",
    noEventsPeriod: "No events scheduled for this period.",
    detailsSection: "Details — agenda and minutes",
    lineAgenda: "Agenda",
    lineMinutes: "Minutes",
  },
} as const;

export function getSmqPdfLabels(locale: SmqLocale) {
  return PDF_LABELS[locale];
}

export function aiLocaleInstruction(locale: SmqLocale): string {
  return locale === "en"
    ? "Respond entirely in English. Use professional QMS / IRATA audit vocabulary."
    : "Réponds entièrement en français. Vocabulaire professionnel SMQ / audit IRATA.";
}

export { translateSmqStoredLabel, getSmqUi, type SmqUiKey } from "@/lib/smq-i18n-ui";
