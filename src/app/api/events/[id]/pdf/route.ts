import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/admin-require";
import { prisma } from "@/lib/db";
import { parseSmqLocale } from "@/lib/smq-i18n";
import { buildSmqEventPdf } from "@/lib/smq-event-pdf";
import type { SmqEvent } from "@/lib/types";

function mapEvent(row: {
  id: string;
  type: string;
  date: string;
  statut: string;
  servicesConcernes: unknown;
  participants: string;
  ordreDuJour: string;
  compteRendu: string;
}): SmqEvent {
  const servicesConcernes = Array.isArray(row.servicesConcernes)
    ? (row.servicesConcernes as string[])
    : [];
  return {
    id: row.id,
    type: row.type,
    date: row.date,
    statut: row.statut,
    servicesConcernes,
    participants: row.participants,
    ordreDuJour: row.ordreDuJour,
    compteRendu: row.compteRendu,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const locale = parseSmqLocale(searchParams.get("lang"));

    const row = await prisma.event.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    }

    const event = mapEvent(row);
    const pdfBytes = buildSmqEventPdf(event, locale);
    const fileName = `${event.id}-${locale}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erreur PDF événement SMQ:", error);
    return NextResponse.json({ error: "Impossible de générer le PDF" }, { status: 500 });
  }
}
