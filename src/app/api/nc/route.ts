import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/admin-require";
import { prisma } from "@/lib/db";
import { nextCode } from "@/lib/utils";

export async function GET() {
  const denied = await assertAdminApi();
  if (denied) return denied;
  const nonConformites = await prisma.nonConformite.findMany({
    include: { service: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(nonConformites);
}

export async function POST(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  const body = await request.json();
  const existing = await prisma.nonConformite.findMany({ select: { id: true } });
  const id = body.id || nextCode("NC", existing.map((item: { id: string }) => item.id));

  const service = await prisma.service.findUnique({ where: { id: body.serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Service introuvable" }, { status: 400 });
  }

  const nonConformite = await prisma.nonConformite.upsert({
    where: { id },
    update: {
      date: body.date,
      serviceId: body.serviceId,
      source: body.source,
      gravite: body.gravite,
      statut: body.statut,
      description: body.description,
      causeRacine: body.causeRacine ?? "",
      responsable: body.responsable ?? "",
    },
    create: {
      id,
      date: body.date,
      serviceId: body.serviceId,
      source: body.source,
      gravite: body.gravite,
      statut: body.statut,
      description: body.description,
      causeRacine: body.causeRacine ?? "",
      responsable: body.responsable ?? "",
    },
    include: { service: true },
  });

  return NextResponse.json(nonConformite, { status: body.id ? 200 : 201 });
}
