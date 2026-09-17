import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/admin-require";
import { buildAuditActionMonitoringPdf } from "@/lib/audit-action-monitoring-pdf";
import { getSmqData } from "@/lib/smq-context";

export async function GET() {
  const denied = await assertAdminApi();
  if (denied) return denied;

  try {
    const data = await getSmqData();
    const pdfBytes = buildAuditActionMonitoringPdf(data.actions, data.nonConformites);
    const fileName = `audit-action-monitoring-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF actions:", error);
    return NextResponse.json(
      { error: "Impossible de générer le PDF" },
      { status: 500 },
    );
  }
}
