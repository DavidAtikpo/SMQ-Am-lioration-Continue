"use client";

import { SmqZoneFilter } from "@/components/layout/smq-zone-filter";
import { cn } from "@/lib/utils";

function HeaderDivider({ className }: { className?: string }) {
  return (
    <span
      className={cn("hidden h-4 w-px shrink-0 bg-line sm:block", className)}
      aria-hidden
    />
  );
}

export function SmqPageHeader({
  title,
  sub,
  code,
  actions,
  extra,
}: {
  title: string;
  sub?: string;
  code?: string;
  actions?: React.ReactNode;
  /** Onglets ou contrôles supplémentaires (ex. planification). */
  extra?: React.ReactNode;
}) {
  return (
    <div className="mb-2 border-b border-line pb-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <SmqZoneFilter inline />

        <HeaderDivider />

        <h1 className="shrink-0 font-display text-[12px] font-bold leading-none text-ink sm:text-[13px]">
          {title}
        </h1>

        {extra ? (
          <>
            <HeaderDivider className="md:block" />
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">{extra}</div>
          </>
        ) : null}

        {sub ? (
          <>
            <HeaderDivider className="md:block" />
            <p className="min-w-0 flex-1 truncate text-[11px] text-muted max-md:hidden">{sub}</p>
          </>
        ) : null}

        {actions ? (
          <div className="flex flex-wrap items-center gap-1.5 max-md:w-full md:ml-auto">
            {actions}
          </div>
        ) : null}

        {code ? (
          <span
            className={cn(
              "shrink-0 font-mono text-[10px] text-muted-light",
              !actions && "ml-auto",
            )}
          >
            DOC N° {code}
          </span>
        ) : null}
      </div>

      {sub ? <p className="mt-1 text-[11px] leading-snug text-muted md:hidden">{sub}</p> : null}
    </div>
  );
}
