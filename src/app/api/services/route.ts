import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/admin-require";
import { prisma } from "@/lib/db";
import { getSmqData } from "@/lib/smq-context";

export async function GET() {
  const denied = await assertAdminApi();
  if (denied) return denied;

  try {
    const data = await getSmqData();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de charger les données SMQ" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  try {
    const service = await prisma.service.create({ data: { name } });
    return NextResponse.json(service, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ce service existe déjà" }, { status: 409 });
  }
}
