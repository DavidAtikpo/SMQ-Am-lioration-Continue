import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { nextCode } from "@/lib/utils";

export async function GET() {
  const actions = await prisma.action.findMany({
    include: { service: true },
    orderBy: { echeance: "asc" },
  });
  return NextResponse.json(actions);
}

export async function POST(request: Request) {
  const body = await request.json();
  const existing = await prisma.action.findMany({ select: { id: true } });
  const id = body.id || nextCode("CA", existing.map((item) => item.id));

  const service = await prisma.service.findUnique({ where: { id: body.serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Service introuvable" }, { status: 400 });
  }

  const action = await prisma.action.upsert({
    where: { id },
    update: {
      type: body.type,
      origine: body.origine ?? "",
      description: body.description,
      serviceId: body.serviceId,
      responsable: body.responsable ?? "",
      dateCreation: body.dateCreation,
      echeance: body.echeance ?? "",
      statut: body.statut,
      priorite: body.priorite,
      efficacite: body.efficacite ?? "",
      ncId: body.ncId ?? null,
    },
    create: {
      id,
      type: body.type,
      origine: body.origine ?? "",
      description: body.description,
      serviceId: body.serviceId,
      responsable: body.responsable ?? "",
      dateCreation: body.dateCreation,
      echeance: body.echeance ?? "",
      statut: body.statut,
      priorite: body.priorite,
      efficacite: body.efficacite ?? "",
      ncId: body.ncId ?? null,
    },
    include: { service: true },
  });

  return NextResponse.json(action, { status: body.id ? 200 : 201 });
}
