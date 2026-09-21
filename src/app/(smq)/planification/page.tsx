"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AgendaGanttPanel } from "@/components/planning/agenda-gantt-panel";
import { AgendaKanbanPanel } from "@/components/planning/agenda-kanban-panel";
import { PlanningPanel } from "@/components/planning/planning-panel";
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

export default function PlanificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const ganttFilter: GanttFilter =
    filterParam === "tasks" || filterParam === "sessions" ? filterParam : "all";
  const tab = resolveTab(searchParams.get("view"), filterParam);

  function setTab(next: PlanTab) {
    router.push(planHref(next, ganttFilter));
  }

  const tabStyle = (active: boolean) => ({
    borderColor: active ? COLORS.ink : COLORS.line,
    background: active ? COLORS.ink : "transparent",
    color: active ? COLORS.paper : "#5B5648",
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("smq")}
          className="cursor-pointer rounded-full border-[1.5px] px-3 py-1.5 text-[11.5px] font-semibold transition-colors sm:px-3.5 sm:text-[12.5px]"
          style={tabStyle(tab === "smq")}
        >
          Calendrier SMQ
        </button>
        <button
          type="button"
          onClick={() => setTab("gantt")}
          className="cursor-pointer rounded-full border-[1.5px] px-3 py-1.5 text-[11.5px] font-semibold transition-colors sm:px-3.5 sm:text-[12.5px]"
          style={tabStyle(tab === "gantt")}
        >
          Gantt Agenda
        </button>
        <button
          type="button"
          onClick={() => setTab("tasks")}
          className="cursor-pointer rounded-full border-[1.5px] px-3 py-1.5 text-[11.5px] font-semibold transition-colors sm:px-3.5 sm:text-[12.5px]"
          style={tabStyle(tab === "tasks")}
        >
          Tâches Agenda
        </button>
      </div>

      {tab === "smq" ? (
        <PlanningPanel />
      ) : tab === "tasks" ? (
        <AgendaKanbanPanel />
      ) : (
        <AgendaGanttPanel key={ganttFilter} initialFilter={ganttFilter} />
      )}
    </div>
  );
}
