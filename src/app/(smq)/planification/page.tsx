"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AgendaGanttPanel } from "@/components/planning/agenda-gantt-panel";
import { AgendaKanbanPanel } from "@/components/planning/agenda-kanban-panel";
import { PlanningPanel } from "@/components/planning/planning-panel";
import { SmqPageHeader } from "@/components/layout/smq-page-header";
import { COLORS } from "@/lib/constants";

type PlanTab = "smq" | "gantt" | "tasks";
type GanttFilter = "all" | "tasks" | "sessions";

function planHref(tab: PlanTab, filter?: GanttFilter): string {
  if (tab === "smq") return "/planification";
  if (tab === "tasks") return "/planification?view=tasks";
  const params = new URLSearchParams({ view: "gantt" });
  if (filter && filter !== "all") params.set("filter", filter);
  return `/planification?${params.toString()}`;
}

function resolveTab(view: string | null, filter: string | null): PlanTab {
  if (view === "tasks" || filter === "tasks") return "tasks";
  if (view === "gantt") return "gantt";
  return "smq";
}

const TAB_LABELS: Record<PlanTab, string> = {
  smq: "Calendrier SMQ",
  gantt: "Gantt Agenda",
  tasks: "Tâches Agenda",
};

export default function PlanificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const ganttFilter: GanttFilter =
    filterParam === "tasks" || filterParam === "sessions" ? filterParam : "all";
  const tab = resolveTab(searchParams.get("view"), filterParam);
  const year = new Date().getFullYear();

  const tabMeta: Record<PlanTab, { sub: string; code: string }> = {
    smq: {
      sub: `Réunions, audits et revue de direction — ${year}`,
      code: "SMQ-PLAN",
    },
    gantt: {
      sub: "Tâches et sessions Neurix — lecture seule",
      code: "SMQ-PLAN-GANTT",
    },
    tasks: {
      sub: "Kanban Neurix (Laurent ↔ David) — lecture seule",
      code: "SMQ-PLAN-TASKS",
    },
  };

  function setTab(next: PlanTab) {
    router.push(planHref(next, ganttFilter));
  }

  const tabStyle = (active: boolean) => ({
    borderColor: active ? COLORS.ink : COLORS.line,
    background: active ? COLORS.ink : "transparent",
    color: active ? COLORS.paper : "#5B5648",
  });

  const meta = tabMeta[tab];

  const fullHeightPanel = tab === "tasks";

  return (
    <div
      className={
        fullHeightPanel
          ? "flex min-h-[calc(100dvh-7rem)] flex-1 flex-col lg:min-h-0"
          : undefined
      }
    >
      <SmqPageHeader
        title="Planification"
        sub={meta.sub}
        code={meta.code}
        extra={
          <nav className="flex flex-wrap items-center gap-1.5" aria-label="Vues planification">
            {(Object.keys(TAB_LABELS) as PlanTab[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className="cursor-pointer rounded-full border-[1.5px] px-2.5 py-1 text-[11px] font-semibold transition-colors sm:px-3 sm:text-[12px]"
                style={tabStyle(tab === key)}
              >
                {TAB_LABELS[key]}
              </button>
            ))}
          </nav>
        }
      />

      <div className={fullHeightPanel ? "min-h-0 flex-1" : undefined}>
        {tab === "smq" ? (
          <PlanningPanel />
        ) : tab === "tasks" ? (
          <AgendaKanbanPanel />
        ) : (
          <AgendaGanttPanel key={ganttFilter} initialFilter={ganttFilter} />
        )}
      </div>
    </div>
  );
}
