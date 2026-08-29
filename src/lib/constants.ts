export const SERVICES_DEFAUT = [
  "Direction",
  "Qualité",
  "Comptabilité",
  "Recouvrement",
  "Accueil",
  "Technique",
  "Logistique / Approvisionnement",
  "Commercial",
  "RH",
  "Formation cordiste",
  "Planification",
] as const;

export const NC_SOURCES = [
  "Audit interne",
  "Réclamation client",
  "Réclamation fournisseur",
  "Contrôle interne",
  "Incident sécurité",
  "Autre",
] as const;

export const NC_GRAVITES = ["Mineure", "Majeure", "Critique"] as const;
export const NC_STATUTS = ["Ouverte", "En traitement", "Clôturée"] as const;

export const ACTION_TYPES = ["Corrective", "Préventive", "Amélioration"] as const;
export const ACTION_STATUTS = ["À faire", "En cours", "Réalisée", "Vérifiée efficace"] as const;
export const ACTION_PRIORITES = ["Basse", "Moyenne", "Haute"] as const;

export const EVENT_TYPES = ["Réunion interne", "Audit interne", "Revue de Direction"] as const;
export const EVENT_STATUTS = ["Planifié", "Réalisé", "Reporté"] as const;

export const COLORS = {
  ink: "#20262E",
  paper: "#F4F1E8",
  paperAlt: "#EAE4D2",
  line: "#D7CFB8",
  rust: "#AE4E2C",
  amber: "#C1861F",
  teal: "#2E6B5E",
  steel: "#33566C",
} as const;

export const STATUT_COLOR: Record<string, string> = {
  Ouverte: COLORS.rust,
  "En traitement": COLORS.amber,
  Clôturée: COLORS.teal,
  "À faire": COLORS.rust,
  "En cours": COLORS.amber,
  Réalisée: COLORS.steel,
  "Vérifiée efficace": COLORS.teal,
  Planifié: COLORS.amber,
  Réalisé: COLORS.teal,
  Reporté: COLORS.rust,
};

export const SYSTEM_PROMPT = `Tu es l'assistant IA pilote du système de management de la qualité (SMQ) de CI.DES / formation cordiste, dédié à l'amélioration continue au sens des référentiels QHSE européens (ISO 9001 et principes associés).

Périmètre : tous les services (formation, technique, matériel, accueil, commercial, devis/facturation, compta, recouvrement, RH, direction…). L'amélioration continue porte aussi sur les délais de réponse, la simplicité des procédures et la satisfaction client (stagiaires et entreprises inscriptrices).

Sources de données (actuelles ou à venir) : Neurix (actions/planning), Webirata/Cordiste (NC, actions correctives), résultats stagiaires, satisfaction Calliope/questionnaires, parcours inscription/devis, formulaires administratifs, inspections matériel.

Rythme QHSE à respecter et proposer automatiquement :
- Réunion interne : 1 par trimestre (4/an)
- Audit interne : 2 par an — identifier et prioriser le ou les points faibles
- Revue de direction : 1 par an — synthèse des audits, NC, actions, indicateurs ; propositions déjà rédigées pour validation du dirigeant

Tes missions :
1. Analyser NC, actions, indicateurs et proposer des actions correctives/préventives réalistes.
2. Préparer ordres du jour, comptes rendus et synthèses pour réunions, audits et revue de direction.
3. Pour chaque audit interne, mettre en évidence le point le plus faible avec preuves dans les données.
4. Pour la revue de direction, produire un dossier quasi final (commentaires, constats, actions proposées) que le dirigeant valide et complète légèrement.

Réponds toujours en français, de façon concise, structurée et directement actionnable. Appuie-toi sur les données JSON fournies ; si insuffisantes, dis-le clairement sans inventer de chiffres.`;

export const NAV = [
  { key: "dashboard", href: "/", label: "Tableau de bord" },
  { key: "nc", href: "/non-conformites", label: "Non-conformités" },
  { key: "actions", href: "/actions", label: "Actions" },
  { key: "planning", href: "/planification", label: "Planification" },
  { key: "services", href: "/services", label: "Services" },
  { key: "assistant", href: "/assistant", label: "Assistant IA" },
] as const;
