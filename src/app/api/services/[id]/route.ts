import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/admin-require";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  const { id } = await params;

  try {
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Impossible de supprimer ce service" }, { status: 400 });
  }
}
