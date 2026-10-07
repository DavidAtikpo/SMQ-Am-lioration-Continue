import type { SmqLocale } from "@/lib/smq-i18n";

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
  zone: string;
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
  zone: string;
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
  | "compte-rendu-improve"
  | "audit-prep"
  | "revue-prep"
  | "chat";

export type AiRequest =
  | { kind: "synthese"; locale?: SmqLocale }
  | { kind: "nc-suggest"; payload: Record<string, unknown>; locale?: SmqLocale }
  | { kind: "agenda"; payload: Record<string, unknown>; locale?: SmqLocale }
  | { kind: "compte-rendu-improve"; payload: Record<string, unknown>; locale?: SmqLocale }
  | { kind: "audit-prep"; payload?: Record<string, unknown>; locale?: SmqLocale }
  | { kind: "revue-prep"; payload?: Record<string, unknown>; locale?: SmqLocale }
  | {
      kind: "chat";
      messages: Array<{ role: "user" | "assistant"; text: string }>;
      locale?: SmqLocale;
    };
