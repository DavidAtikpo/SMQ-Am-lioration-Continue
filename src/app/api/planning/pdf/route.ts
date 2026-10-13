import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/admin-require";
import { getSmqData } from "@/lib/smq-context";
import { parseSmqLocale } from "@/lib/smq-i18n";
import { buildSmqPlanningPdf } from "@/lib/smq-planning-pdf";
import { filterEventsByZone, SMQ_ZONES, type SmqZone } from "@/lib/smq-zone";

/** Traduction IA des comptes-rendus longs avant génération PDF. */
export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const allYears = yearParam === "all";
    const year = allYears
      ? new Date().getFullYear()
      : Number.parseInt(yearParam ?? String(new Date().getFullYear()), 10);

    if (!allYears && !Number.isFinite(year)) {
      return NextResponse.json({ error: "Année invalide" }, { status: 400 });
    }

    const zoneParam = searchParams.get("zone");
    const zone: SmqZone =
      zoneParam && SMQ_ZONES.includes(zoneParam as SmqZone) ? (zoneParam as SmqZone) : "Monde";

    const data = await getSmqData();
    let events = allYears
      ? data.events
      : data.events.filter((e) => e.date.startsWith(String(year)));
    events = filterEventsByZone(events, zone);

    const locale = parseSmqLocale(searchParams.get("lang"));
    const pdfBytes = await buildSmqPlanningPdf(events, { year, allYears, locale });
    const zoneSlug = zone === "Monde" ? "" : `-${zone.toLowerCase()}`;
    const fileName = allYears
      ? `planification-smq${zoneSlug}-${new Date().toISOString().slice(0, 10)}.pdf`
      : `planification-smq${zoneSlug}-${year}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF planification SMQ:", error);
    return NextResponse.json(
      { error: "Impossible de générer le PDF de planification" },
      { status: 500 },
    );
  }
}
