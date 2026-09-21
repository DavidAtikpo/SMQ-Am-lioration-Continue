"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  LayoutGrid,
  LogOut,
  Menu,
  Sparkles,
  Stamp,
  X,
} from "lucide-react";
import { NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SmqProvider } from "@/hooks/use-smq-data";
import { SmqZoneProvider } from "@/hooks/use-smq-zone";
import { SmqZoneFilter } from "@/components/layout/smq-zone-filter";

const ICONS = {
  dashboard: LayoutGrid,
  nc: AlertTriangle,
  actions: ClipboardCheck,
  planning: CalendarClock,
  services: Building2,
  assistant: Sparkles,
} as const;

function SidebarNav({
  pathname,
  adminName,
  onNavigate,
  className,
}: {
  pathname: string;
  adminName: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-1 overflow-y-auto bg-ink px-3.5 py-5 text-paper",
        className,
      )}
    >
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
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
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

      <div className="mt-auto border-t border-white/10 px-2 pt-3.5">
        <p className="truncate text-[11px] font-semibold text-white/90">{adminName}</p>
        <p className="mt-1 text-[10.5px] leading-relaxed text-[#8A8577]">
          Accès administrateur · SMQ interne
        </p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12px] font-semibold text-[#C9C4B4] transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

export function SmqShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [navOpen, setNavOpen] = useState(false);
  const adminName =
    [session?.user?.prenom, session?.user?.nom].filter(Boolean).join(" ") ||
    session?.user?.email ||
    "Administrateur";

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  return (
    <SmqProvider>
      <SmqZoneProvider>
        <div className="flex min-h-[100dvh] flex-col lg:h-screen lg:overflow-hidden">
          <header className="flex shrink-0 items-center justify-between border-b border-line bg-ink px-4 py-3 text-paper lg:hidden">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>
            <span className="font-display text-sm font-bold">SMQ C.IDES</span>
            <div className="w-9" aria-hidden />
          </header>

          <div className="flex min-h-0 flex-1 lg:overflow-hidden">
            {navOpen ? (
              <button
                type="button"
                className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
                aria-label="Fermer le menu"
                onClick={() => setNavOpen(false)}
              />
            ) : null}

            <SidebarNav
              pathname={pathname}
              adminName={adminName}
              onNavigate={() => setNavOpen(false)}
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-[min(280px,88vw)] shrink-0 shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:w-[220px] lg:translate-x-0 lg:shadow-none",
                navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
              )}
            />

            {navOpen ? (
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                className="fixed top-3 right-3 z-[60] flex h-9 w-9 items-center justify-center rounded-lg bg-ink/80 text-paper lg:hidden"
                aria-label="Fermer le menu"
              >
                <X size={18} />
              </button>
            ) : null}

            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 md:px-6 lg:px-7 lg:py-6">
              <SmqZoneFilter />
              {children}
            </main>
          </div>
        </div>
      </SmqZoneProvider>
    </SmqProvider>
  );
}
