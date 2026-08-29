"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  LayoutGrid,
  Sparkles,
  Stamp,
} from "lucide-react";
import { NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SmqProvider } from "@/hooks/use-smq-data";

const ICONS = {
  dashboard: LayoutGrid,
  nc: AlertTriangle,
  actions: ClipboardCheck,
  planning: CalendarClock,
  services: Building2,
  assistant: Sparkles,
} as const;

export function SmqShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SmqProvider>
      <div className="flex h-screen overflow-hidden bg-paper text-ink">
        <aside className="flex h-full w-[220px] shrink-0 flex-col gap-1 overflow-y-auto bg-ink px-3.5 py-5 text-paper">
          <div className="mb-3 flex items-center gap-2 border-b border-white/10 px-2 pb-5">
            <Stamp size={18} />
            <div className="font-display text-sm font-bold leading-tight">
              SMQ · Amélioration
              <br />
              Continue
            </div>
          </div>

          {NAV.map((item) => {
            const Icon = ICONS[item.key];
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13.5px] font-semibold transition-colors",
                  active ? "bg-white/10 text-white" : "text-[#C9C4B4] hover:bg-white/5",
                )}
              >
                <Icon size={16} />
                {item.label}
                {active && <ChevronRight size={13} className="ml-auto" />}
              </Link>
            );
          })}

          <p className="mt-auto border-t border-white/10 px-2 pt-3.5 text-[10.5px] leading-relaxed text-[#8A8577]">
            Données centralisées pour le pilotage SMQ. Référentiel QHSE européen — cycle PDCA.
          </p>
        </aside>

        <main className="h-full flex-1 overflow-y-auto px-7 py-6">{children}</main>
      </div>
    </SmqProvider>
  );
}
