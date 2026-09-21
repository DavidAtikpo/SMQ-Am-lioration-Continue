import { prisma } from "@/lib/db";
import type { NonConformite, SmqAction, SmqData, SmqEvent } from "@/lib/types";
import { todayISO } from "@/lib/utils";

function mapNonConformite(row: {
  id: string;
  date: string;
  serviceId: string;
  service: { id: string; name: string };
  source: string;
  gravite: string;
  statut: string;
  description: string;
  causeRacine: string;
  responsable: string;
  zone?: string;
}): NonConformite {
  return {
    id: row.id,
    date: row.date,
    serviceId: row.serviceId,
    service: row.service,
    source: row.source,
    gravite: row.gravite,
    statut: row.statut,
    description: row.description,
    causeRacine: row.causeRacine,
    responsable: row.responsable,
    zone: row.zone ?? "",
  };
}

function mapAction(row: {
  id: string;
  type: string;
  origine: string;
  description: string;
  serviceId: string;
  service: { id: string; name: string };
  responsable: string;
  dateCreation: string;
  echeance: string;
  statut: string;
  priorite: string;
  efficacite: string;
  ncId: string | null;
  zone?: string;
}): SmqAction {
  return {
    id: row.id,
    type: row.type,
    origine: row.origine,
    description: row.description,
    serviceId: row.serviceId,
    service: row.service,
    responsable: row.responsable,
    dateCreation: row.dateCreation,
    echeance: row.echeance,
    statut: row.statut,
    priorite: row.priorite,
    efficacite: row.efficacite,
    ncId: row.ncId,
    zone: row.zone ?? "",
  };
}

function mapEvent(event: {
  id: string;
  type: string;
  date: string;
  statut: string;
  servicesConcernes: unknown;
  participants: string;
  ordreDuJour: string;
  compteRendu: string;
}): SmqEvent {
  const servicesConcernes = Array.isArray(event.servicesConcernes)
    ? (event.servicesConcernes as string[])
    : [];

  return {
    id: event.id,
    type: event.type,
    date: event.date,
    statut: event.statut,
    servicesConcernes,
    participants: event.participants,
    ordreDuJour: event.ordreDuJour,
    compteRendu: event.compteRendu,
  };
}

export async function getSmqData(): Promise<SmqData> {
  const [services, nonConformites, actions, events, indicators] = await Promise.all([
    prisma.service.findMany({ orderBy: { name: "asc" } }),
    prisma.nonConformite.findMany({
      include: { service: true },
      orderBy: { date: "desc" },
    }),
    prisma.action.findMany({
      include: { service: true },
      orderBy: { echeance: "asc" },
    }),
    prisma.event.findMany({ orderBy: { date: "asc" } }),
    prisma.indicator.findMany({ orderBy: [{ category: "asc" }, { label: "asc" }] }),
  ]);

  return {
    services,
    nonConformites: nonConformites.map(mapNonConformite),
    actions: actions.map(mapAction),
    events: events.map(mapEvent),
    indicators,
  };
}

export function buildSmqContext(data: SmqData): string {
  const summary = {
    services: data.services.map((s) => s.name),
    non_conformites: data.nonConformites.map((n) => ({
      id: n.id,
      date: n.date,
      service: n.service.name,
      source: n.source,
      gravite: n.gravite,
      statut: n.statut,
      description: n.description,
    })),
    actions: data.actions.map((a) => ({
      id: a.id,
      type: a.type,
      service: a.service.name,
      statut: a.statut,
      priorite: a.priorite,
      echeance: a.echeance,
      description: a.description,
      origine: a.origine,
    })),
    evenements: data.events.map((e) => ({
      id: e.id,
      type: e.type,
      date: e.date,
      statut: e.statut,
      services: e.servicesConcernes,
    })),
    indicateurs: data.indicators.map((i) => ({
      id: i.id,
      source: i.source,
      category: i.category,
      label: i.label,
      value: i.value,
      period: i.period,
      detail: i.detail,
    })),
    date_du_jour: todayISO(),
  };

  return JSON.stringify(summary);
}
