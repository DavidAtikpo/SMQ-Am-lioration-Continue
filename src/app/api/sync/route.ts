import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/admin-require";
import { ensureQhseCalendar } from "@/lib/smq-planning";
import { syncAgenda } from "@/lib/sync/agenda";
import { syncCordiste } from "@/lib/sync/cordiste";
import { syncProcessusIndicators } from "@/lib/sync/processus";
import {
  syncSatisfactionIndicators,
  syncStagiairesIndicators,
} from "@/lib/sync/stagiaires-satisfaction";

export async function POST() {
  const denied = await assertAdminApi();
  if (denied) return denied;

  const settled = await Promise.allSettled([
    syncCordiste(),
    syncAgenda(),
    syncStagiairesIndicators(),
    syncSatisfactionIndicators(),
    syncProcessusIndicators(),
    ensureQhseCalendar(),
  ]);

  const labels = ["cordiste", "agenda", "stagiaires", "satisfaction", "processus", "qhse"] as const;
  const payload: Record<string, unknown> = {
    ok: settled.every((item) => item.status === "fulfilled"),
    syncedAt: new Date().toISOString(),
    errors: {} as Record<string, string>,
  };

  settled.forEach((item, index) => {
    const key = labels[index];
    if (item.status === "fulfilled") {
      payload[key] = item.value;
    } else {
      const message = item.reason instanceof Error ? item.reason.message : String(item.reason);
      (payload.errors as Record<string, string>)[key] = message;
      console.error(`Sync ${key} failed:`, item.reason);
    }
  });

  const hasPartialFailure = Object.keys(payload.errors as Record<string, string>).length > 0;
  return NextResponse.json(payload, { status: hasPartialFailure && !payload.ok ? 207 : 200 });
}
