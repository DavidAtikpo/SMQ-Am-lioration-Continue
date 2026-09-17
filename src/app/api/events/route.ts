import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/admin-require";
import { prisma } from "@/lib/db";
import { nextCode } from "@/lib/utils";

function mapEvent(event: {
  id: string;
  type: string;
  date: string;
  statut: string;
  servicesConcernes: unknown;
  participants: string;
  ordreDuJour: string;
  compteRendu: string;
}) {
  return {
    ...event,
    servicesConcernes: Array.isArray(event.servicesConcernes)
      ? (event.servicesConcernes as string[])
      : [],
  };
}

export async function GET() {
  const denied = await assertAdminApi();
  if (denied) return denied;

  const events = await prisma.event.findMany({ orderBy: { date: "asc" } });
  return NextResponse.json(events.map(mapEvent));
}

export async function POST(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  const body = await request.json();
  const existing = await prisma.event.findMany({ select: { id: true } });
  const id = body.id || nextCode("EVT", existing.map((item: { id: string }) => item.id));

  const event = await prisma.event.upsert({
    where: { id },
    update: {
      type: body.type,
      date: body.date,
      statut: body.statut,
      servicesConcernes: body.servicesConcernes ?? [],
      participants: body.participants ?? "",
      ordreDuJour: body.ordreDuJour ?? "",
      compteRendu: body.compteRendu ?? "",
    },
    create: {
      id,
      type: body.type,
      date: body.date,
      statut: body.statut,
      servicesConcernes: body.servicesConcernes ?? [],
      participants: body.participants ?? "",
      ordreDuJour: body.ordreDuJour ?? "",
      compteRendu: body.compteRendu ?? "",
    },
  });

  return NextResponse.json(mapEvent(event), { status: body.id ? 200 : 201 });
}
