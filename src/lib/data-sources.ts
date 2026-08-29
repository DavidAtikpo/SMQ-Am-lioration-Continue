/**
 * Registre des sources de données SMQ — connecteurs actuels et futurs.
 */
export type DataSourceStatus = "actif" | "partiel" | "planifie";

export type DataSourceDef = {
  id: string;
  label: string;
  schema?: string;
  status: DataSourceStatus;
  domaines: string[];
  tables?: string[];
  importSmq?: string[];
  envVar?: string;
};

export const DATA_SOURCES: DataSourceDef[] = [
  {
    id: "cordiste",
    label: "Webirata — Cordiste (NC & actions)",
    schema: "webirata",
    status: "actif",
    domaines: ["Non-conformités", "Actions correctives", "Matériel", "Formation"],
    tables: ["NonConformite", "ActionCorrective"],
    importSmq: ["NonConformite", "Action"],
    envVar: "CORDISTE_DATABASE_URL",
  },
  {
    id: "agenda",
    label: "Neurix — Planification (Laurent ↔ David)",
    schema: "agenda",
    status: "actif",
    domaines: ["Planification", "Actions internes"],
    tables: ["Task", "TrainingSession"],
    importSmq: ["Action", "Event"],
    envVar: "AGENDA_DATABASE_URL",
  },
  {
    id: "stagiaires",
    label: "Webirata — Résultats stagiaires",
    schema: "webirata",
    status: "actif",
    domaines: ["Formation", "Réussite / échec examen"],
    tables: ["IrataExamValidation", "Diplome", "KpiDonneesManuelles"],
    importSmq: ["Indicator"],
    envVar: "CORDISTE_DATABASE_URL",
  },
  {
    id: "satisfaction",
    label: "Webirata — Satisfaction (stagiaire & entreprise)",
    schema: "webirata",
    status: "actif",
    domaines: ["Satisfaction stagiaire", "Satisfaction entreprise", "Qualité pédagogie"],
    tables: [
      "SatisfactionStagiaireChaud",
      "SatisfactionStagiaireFroid",
      "SatisfactionEntrepriseFroid",
      "CustomerSatisfactionResponse",
    ],
    importSmq: ["Indicator"],
    envVar: "CORDISTE_DATABASE_URL",
  },
  {
    id: "demandes-devis",
    label: "Webirata — Inscriptions, devis, délais",
    schema: "webirata",
    status: "actif",
    domaines: ["Commercial", "Délais de réponse", "Procédures"],
    tables: ["Demande", "Devis", "DemandeSuivi", "Contrat"],
    importSmq: ["Indicator", "Action"],
    envVar: "CORDISTE_DATABASE_URL",
  },
  {
    id: "formulaires-admin",
    label: "Webirata — Formulaires & corrections admin",
    schema: "webirata",
    status: "planifie",
    domaines: ["Administration", "Formulaires", "Corrections secrétariat"],
    tables: ["FormulairesQuotidiens", "ReponseFormulaire", "CorrectionFormulaire"],
    importSmq: ["NC administratives", "Actions"],
  },
  {
    id: "equipement",
    label: "Webirata — Inspections matériel / centre",
    schema: "webirata",
    status: "planifie",
    domaines: ["Matériel", "Centre", "Sécurité"],
    tables: ["EquipmentDetailedInspection", "EquipmentInspection"],
    importSmq: ["NC", "Audit interne"],
  },
  {
    id: "compta",
    label: "Compta — Facturation (futur)",
    status: "planifie",
    domaines: ["Comptabilité", "Facturation"],
    importSmq: ["Indicateurs IA"],
  },
  {
    id: "hse-procedures",
    label: "Procédures HSE / dossiers société (futur)",
    schema: "webirata",
    status: "planifie",
    domaines: ["HSE", "Procédures", "Documentation"],
    tables: ["DossierAdministratifSociete", "AdministrativeFolder"],
    importSmq: ["Planification", "Audit interne"],
  },
];

export function activeDataSources(): DataSourceDef[] {
  return DATA_SOURCES.filter((s) => s.status === "actif");
}
