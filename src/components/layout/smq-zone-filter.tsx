"use client";

import { SMQ_ZONE_LABELS, SMQ_ZONES } from "@/lib/smq-zone";
import { COLORS } from "@/lib/constants";
import { useSmqZone } from "@/hooks/use-smq-zone";
import { cn } from "@/lib/utils";

export function SmqZoneFilter({ inline }: { inline?: boolean }) {
  const { zone, setZone } = useSmqZone();

  return (
    <div className={cn("flex shrink-0 flex-wrap items-center gap-1.5", !inline && "mb-2")}>
      <span className="text-[11px] font-semibold text-muted">Périmètre :</span>
      {SMQ_ZONES.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setZone(key)}
          className="cursor-pointer rounded-full border-[1.5px] px-2.5 py-0.5 text-[11px] font-semibold transition-colors"
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
