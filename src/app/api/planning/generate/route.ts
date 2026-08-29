import { NextResponse } from "next/server";
import { ensureQhseCalendar } from "@/lib/smq-planning";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { year?: number };
    const year = body.year ?? new Date().getFullYear();
    const result = await ensureQhseCalendar(year);
    return NextResponse.json({ ok: true, year, ...result });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur planification QHSE" },
      { status: 500 },
    );
  }
}
