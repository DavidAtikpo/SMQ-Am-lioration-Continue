export type Service = {
  id: string;
  name: string;
};

export type NonConformite = {
  id: string;
  date: string;
  serviceId: string;
  service: Service;
  source: string;
  gravite: string;
  statut: string;
  description: string;
  causeRacine: string;
  responsable: string;
};

export type SmqAction = {
  id: string;
  type: string;
  origine: string;
  description: string;
  serviceId: string;
  service: Service;
  responsable: string;
  dateCreation: string;
  echeance: string;
  statut: string;
  priorite: string;
  efficacite: string;
  ncId: string | null;
};

export type SmqEvent = {
  id: string;
  type: string;
  date: string;
  statut: string;
  servicesConcernes: string[];
  participants: string;
  ordreDuJour: string;
  compteRendu: string;
};

export type SmqIndicator = {
  id: string;
  source: string;
  category: string;
  label: string;
  value: string;
  numeric: number | null;
  period: string;
  detail: string;
};

export type SmqData = {
  services: Service[];
  nonConformites: NonConformite[];
  actions: SmqAction[];
  events: SmqEvent[];
  indicators: SmqIndicator[];
};

export type AiKind =
  | "synthese"
  | "nc-suggest"
  | "agenda"
  | "audit-prep"
  | "revue-prep"
  | "chat";

export type AiRequest =
  | { kind: "synthese" }
  | { kind: "nc-suggest"; payload: Record<string, unknown> }
  | { kind: "agenda"; payload: Record<string, unknown> }
  | { kind: "audit-prep"; payload?: Record<string, unknown> }
  | { kind: "revue-prep"; payload?: Record<string, unknown> }
  | { kind: "chat"; messages: Array<{ role: "user" | "assistant"; text: string }> };
