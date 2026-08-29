import { prisma } from "@/lib/db";
import type { SmqData, SmqEvent } from "@/lib/types";
import { todayISO } from "@/lib/utils";

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
    nonConformites,
    actions,
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
