"use client";

import { SMQ_ZONE_LABELS, SMQ_ZONES } from "@/lib/smq-zone";
import { COLORS } from "@/lib/constants";
import { useSmqZone } from "@/hooks/use-smq-zone";

export function SmqZoneFilter() {
  const { zone, setZone } = useSmqZone();

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="text-[12px] font-semibold text-muted">Périmètre :</span>
      {SMQ_ZONES.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setZone(key)}
          className="cursor-pointer rounded-full border-[1.5px] px-3 py-1 text-[12px] font-semibold transition-colors"
          style={{
            borderColor: zone === key ? COLORS.ink : COLORS.line,
            background: zone === key ? COLORS.ink : "transparent",
            color: zone === key ? COLORS.paper : "#5B5648",
          }}
        >
          {SMQ_ZONE_LABELS[key]}
        </button>
      ))}
    </div>
  );
}
