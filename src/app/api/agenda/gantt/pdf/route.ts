import { NextResponse } from "next/server";
import { fetchAgendaGanttData } from "@/lib/agenda/gantt-data";
import { buildAgendaGanttPdf } from "@/lib/agenda/gantt-pdf";
import { assertAdminApi } from "@/lib/admin-require";

export async function GET() {
  const denied = await assertAdminApi();
  if (denied) return denied;

  try {
    const data = await fetchAgendaGanttData();
    const pdfBytes = buildAgendaGanttPdf(data.rows);
    const fileName = `gantt-agenda-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF Gantt:", error);
    return NextResponse.json(
      { error: "Impossible de générer le PDF Gantt" },
      { status: 500 },
    );
  }
}
