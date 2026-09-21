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
  ChevronsLeft,
  ChevronsRight,
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

const SIDEBAR_COLLAPSED_KEY = "smq-sidebar-collapsed";

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
  collapsed,
  onToggleCollapse,
  onNavigate,
  className,
}: {
  pathname: string;
  adminName: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-1 overflow-y-auto overflow-x-hidden bg-ink py-5 text-paper transition-[width,padding] duration-200",
        collapsed ? "px-2" : "px-3.5",
        className,
      )}
    >
      <div
        className={cn(
          "mb-3 flex border-b border-white/10 pb-3",
          collapsed ? "flex-col items-center gap-2" : "items-start justify-between gap-2 px-2",
        )}
      >
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <Stamp size={18} className="shrink-0" />
          {!collapsed ? (
            <div className="font-display text-sm font-bold leading-tight">
              SMQ · Amélioration
              <br />
              Continue
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#C9C4B4] transition-colors hover:bg-white/10 hover:text-white lg:flex"
          aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
          title={collapsed ? "Agrandir le menu" : "Réduire le menu"}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
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
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={cn(
              "flex items-center rounded-lg py-2.5 text-[13.5px] font-semibold transition-colors",
              collapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
              active ? "bg-white/10 text-white" : "text-[#C9C4B4] hover:bg-white/5",
            )}
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed ? (
              <>
                <span className="truncate">{item.label}</span>
                {active ? <ChevronRight size={13} className="ml-auto shrink-0" /> : null}
              </>
            ) : null}
          </Link>
        );
      })}

      <div
        className={cn(
          "mt-auto border-t border-white/10 pt-3.5",
          collapsed ? "px-0" : "px-2",
        )}
      >
        {!collapsed ? (
          <>
            <p className="truncate text-[11px] font-semibold text-white/90">{adminName}</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-[#8A8577]">
              Accès administrateur · SMQ interne
            </p>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Déconnexion"
          className={cn(
            "mt-3 flex w-full items-center rounded-lg py-2 text-[12px] font-semibold text-[#C9C4B4] transition-colors hover:bg-white/5 hover:text-white",
            collapsed ? "justify-center px-2" : "gap-2 px-2 text-left",
          )}
        >
          <LogOut size={14} className="shrink-0" />
          {!collapsed ? "Déconnexion" : null}
        </button>
      </div>
    </aside>
  );
}

export function SmqShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const adminName =
    [session?.user?.prenom, session?.user?.nom].filter(Boolean).join(" ") ||
    session?.user?.email ||
    "Administrateur";

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

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
              collapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebarCollapsed}
              onNavigate={() => setNavOpen(false)}
              className={cn(
                "fixed inset-y-0 left-0 z-50 shrink-0 shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none",
                sidebarCollapsed ? "lg:w-[68px]" : "w-[min(280px,88vw)] lg:w-[220px]",
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

            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 md:px-6 lg:px-7 lg:py-6">
              {children}
            </main>
          </div>
        </div>
      </SmqZoneProvider>
    </SmqProvider>
  );
}
