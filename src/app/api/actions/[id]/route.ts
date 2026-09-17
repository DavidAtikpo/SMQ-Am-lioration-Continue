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
  await prisma.action.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
