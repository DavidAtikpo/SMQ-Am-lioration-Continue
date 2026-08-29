import { NextResponse } from "next/server";
import { ensureQhseCalendar } from "@/lib/smq-planning";
import { syncAgenda } from "@/lib/sync/agenda";
import { syncCordiste } from "@/lib/sync/cordiste";
import { syncProcessusIndicators } from "@/lib/sync/processus";
import {
  syncSatisfactionIndicators,
  syncStagiairesIndicators,
} from "@/lib/sync/stagiaires-satisfaction";

export async function POST() {
  try {
    const [cordiste, agenda, stagiaires, satisfaction, processus, qhse] = await Promise.all([
      syncCordiste(),
      syncAgenda(),
      syncStagiairesIndicators(),
      syncSatisfactionIndicators(),
      syncProcessusIndicators(),
      ensureQhseCalendar(),
    ]);

    return NextResponse.json({
      ok: true,
      cordiste,
      agenda,
      stagiaires,
      satisfaction,
      processus,
      qhse,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur de synchronisation" },
      { status: 500 },
    );
  }
}
