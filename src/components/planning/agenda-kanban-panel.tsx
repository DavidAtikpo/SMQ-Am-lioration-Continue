"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import {
  columnHeaderStyle,
  formatKanbanDate,
  isTaskOverdue,
  KANBAN_COLUMNS,
  normalizeTaskPriority,
  normalizeTaskStatus,
  priorityBadgeStyle,
  PRIORITY_CONFIG,
  type AgendaTaskStatus,
} from "@/lib/agenda/kanban-config";
import type { AgendaGanttPayload, AgendaGanttTask } from "@/lib/agenda/types";
import { COLORS } from "@/lib/constants";
import { Btn, EmptyState, LoadingState, StatusStamp } from "@/components/ui";

function KanbanTaskCard({
  task,
  selected,
  onSelect,
}: {
  task: AgendaGanttTask;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = normalizeTaskStatus(task.status);
  const priority = normalizeTaskPriority(task.priority);
  const prio = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  const overdue = isTaskOverdue(task.dueDate, status);
  const assignees = task.assigneeDetails.length > 0 ? task.assigneeDetails : [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer rounded-[10px] border-[1.5px] bg-surface p-3 transition-all sm:p-3.5 ${
        selected
          ? "border-ink shadow-sm"
          : "border-line hover:border-ink/40 hover:shadow-sm"
      }`}
    >
      <div className="mb-2 flex items-start gap-2">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: prio.color }}
        />
        <p className="flex-1 text-sm font-semibold leading-snug text-ink">{task.title}</p>
      </div>

      {task.description ? (
        <p className="mb-3 line-clamp-2 pl-4 text-xs leading-relaxed text-muted">{task.description}</p>
      ) : null}

      {task.groupName ? (
        <div className="mb-2 flex items-center gap-1.5 pl-4">
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-paper"
            style={{ backgroundColor: COLORS.steel }}
          >
            {task.groupName.slice(0, 1)}
          </span>
          <span className="text-[10px] font-semibold text-steel">{task.groupName}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pl-4">
        <span
          className="rounded-full border-[1.5px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
          style={priorityBadgeStyle(priority)}
        >
          {prio.label}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {task.dueDate ? (
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                overdue ? "text-rust" : "text-muted-light"
              }`}
            >
              {overdue ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Calendar className="h-3.5 w-3.5 shrink-0" />
              )}
              {formatKanbanDate(task.dueDate)}
            </span>
          ) : null}
          {assignees.length > 0 ? (
            <div className="-space-x-1.5 flex items-center">
              {assignees.slice(0, 2).map((user) => (
                <div
                  key={user.name}
                  className="flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] font-semibold text-paper shadow-sm ring-2 ring-surface"
                  style={{ backgroundColor: user.color || COLORS.steel }}
                  title={user.name}
                >
                  {user.initials}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ColumnHeader({
  col,
  count,
}: {
  col: (typeof KANBAN_COLUMNS)[number];
  count: number;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-[10px] border-[1.5px] px-3 py-2.5"
      style={columnHeaderStyle(col.accent)}
    >
      <col.Icon className="h-5 w-5 shrink-0" style={{ color: col.accent }} />
      <span className="truncate text-sm font-semibold text-ink">{col.label}</span>
      <span
        className="ml-auto rounded-full border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums"
        style={{ color: col.accent }}
      >
        {count}
      </span>
    </div>
  );
}

async function fetchAgendaGantt(): Promise<{
  data: AgendaGanttPayload | null;
  error: string | null;
}> {
  try {
    const res = await fetch("/api/agenda/gantt");
    const json = (await res.json()) as AgendaGanttPayload & { error?: string };
    if (!res.ok) {
      return { data: null, error: json.error ?? "Données Agenda indisponibles" };
    }
    return { data: json, error: null };
  } catch {
    return { data: null, error: "Erreur de chargement" };
  }
}

export function AgendaKanbanPanel() {
  const [data, setData] = useState<AgendaGanttPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<AgendaGanttTask | null>(null);
  const [mobileStatusTab, setMobileStatusTab] = useState<AgendaTaskStatus>("todo");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchAgendaGantt();
    setData(result.data);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await fetchAgendaGantt();
      if (cancelled) return;
      setData(result.data);
      setError(result.error);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const tasksByStatus = useMemo(() => {
    const grouped = Object.fromEntries(
      KANBAN_COLUMNS.map((col) => [col.id, [] as AgendaGanttTask[]]),
    ) as Record<AgendaTaskStatus, AgendaGanttTask[]>;

    for (const task of data?.tasks ?? []) {
      const status = normalizeTaskStatus(task.status);
      grouped[status].push(task);
    }

    return grouped;
  }, [data?.tasks]);

  if (loading && !data) {
    return <LoadingState error={error} onRetry={() => void load()} />;
  }

  const totalTasks = data?.tasks.length ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <div className="text-sm text-muted">
          <span className="font-semibold text-ink">{totalTasks}</span> tâche{totalTasks > 1 ? "s" : ""}
          {data?.syncedAt ? (
            <span className="text-muted-light">
              {" "}
              · MAJ {new Date(data.syncedAt).toLocaleString("fr-FR")}
            </span>
          ) : null}
        </div>
        <div className="flex-1" />
        <Btn kind="ghost" disabled={loading} onClick={() => void load()}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Actualiser
        </Btn>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] border border-line bg-surface px-4 py-3 text-sm text-muted">
          {error}
        </div>
      )}

      {totalTasks === 0 ? (
        <EmptyState
          icon={ClipboardList}
          text="Aucune tâche Agenda dans le périmètre SMQ (Laurent ↔ David). Vérifiez AGENDA_DATABASE_URL."
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Mobile : onglets de colonnes */}
          <div className="mb-3 flex shrink-0 gap-1 overflow-x-auto rounded-[10px] border border-line bg-paper-alt px-2 py-2 lg:hidden">
            {KANBAN_COLUMNS.map((col) => {
              const active = mobileStatusTab === col.id;
              const count = tasksByStatus[col.id].length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setMobileStatusTab(col.id)}
                  className={`flex min-w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors ${
                    active ? "border border-line bg-surface" : "hover:bg-surface/60"
                  }`}
                >
                  <col.Icon
                    className="h-4 w-4"
                    style={{ color: active ? col.accent : "#8A8370" }}
                  />
                  <span
                    className={`max-w-[4.75rem] truncate text-center text-[9px] font-semibold leading-tight ${
                      active ? "text-ink" : "text-muted-light"
                    }`}
                  >
                    {col.label}
                  </span>
                  <span
                    className="font-mono text-[10px] font-bold tabular-nums"
                    style={{ color: active ? col.accent : "#8A8370" }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mobile : colonne active */}
          <div className="flex min-h-0 flex-1 flex-col lg:hidden">
            {(() => {
              const col = KANBAN_COLUMNS.find((c) => c.id === mobileStatusTab)!;
              const colTasks = tasksByStatus[mobileStatusTab];
              return (
                <div className="flex h-full flex-col gap-2.5">
                  <ColumnHeader col={col} count={colTasks.length} />
                  <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pb-2">
                    {colTasks.length === 0 ? (
                      <div className="rounded-[10px] border-[1.5px] border-dashed border-line p-8 text-center">
                        <p className="text-xs text-muted-light">Aucune tâche</p>
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <KanbanTaskCard
                          key={task.id}
                          task={task}
                          selected={selectedTask?.id === task.id}
                          onSelect={() =>
                            setSelectedTask(selectedTask?.id === task.id ? null : task)
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Desktop : Kanban horizontal */}
          <div className="kanban-scroll hidden min-h-0 flex-1 overflow-x-auto lg:block">
            <div className="flex h-full min-w-max items-stretch gap-4 pb-1">
              {KANBAN_COLUMNS.map((col) => {
                const colTasks = tasksByStatus[col.id];
                return (
                  <div key={col.id} className="flex h-full w-72 shrink-0 flex-col gap-3">
                    <ColumnHeader col={col} count={colTasks.length} />
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                      {colTasks.length === 0 ? (
                        <div className="rounded-[10px] border-[1.5px] border-dashed border-line p-5 text-center">
                          <p className="text-xs text-muted-light">Aucune tâche</p>
                        </div>
                      ) : (
                        colTasks.map((task) => (
                          <KanbanTaskCard
                            key={task.id}
                            task={task}
                            selected={selectedTask?.id === task.id}
                            onSelect={() =>
                              setSelectedTask(selectedTask?.id === task.id ? null : task)
                            }
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Détail tâche */}
      {selectedTask ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="max-h-[min(92dvh,100%)] w-full max-w-md overflow-y-auto rounded-t-2xl border-[1.5px] border-line border-b-0 bg-surface shadow-lg sm:rounded-2xl sm:border-b"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h3 className="font-display font-bold leading-snug text-ink">{selectedTask.title}</h3>
                <StatusStamp
                  label={
                    KANBAN_COLUMNS.find((c) => c.id === normalizeTaskStatus(selectedTask.status))
                      ?.label ?? selectedTask.status
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-light transition-colors hover:bg-paper-alt hover:text-ink"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5 text-sm text-muted">
              {selectedTask.description ? (
                <p className="whitespace-pre-wrap leading-relaxed">{selectedTask.description}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="mb-1 font-semibold uppercase tracking-wide text-muted-light">
                    Priorité
                  </p>
                  <span
                    className="inline-flex rounded-full border-[1.5px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase"
                    style={priorityBadgeStyle(normalizeTaskPriority(selectedTask.priority))}
                  >
                    {(PRIORITY_CONFIG[normalizeTaskPriority(selectedTask.priority)] ??
                      PRIORITY_CONFIG.medium).label}
                  </span>
                </div>
                {selectedTask.dueDate ? (
                  <div>
                    <p className="mb-1 font-semibold uppercase tracking-wide text-muted-light">
                      Échéance
                    </p>
                    <p className="font-medium text-ink">{formatKanbanDate(selectedTask.dueDate)}</p>
                  </div>
                ) : null}
                {selectedTask.groupName ? (
                  <div className="col-span-2">
                    <p className="mb-1 font-semibold uppercase tracking-wide text-muted-light">
                      Groupe
                    </p>
                    <p className="font-medium text-ink">{selectedTask.groupName}</p>
                  </div>
                ) : null}
              </div>
              {selectedTask.assigneeDetails.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-light">
                    Assignés
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.assigneeDetails.map((user) => (
                      <span
                        key={user.name}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-alt px-2 py-1 text-xs font-medium text-ink"
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full font-mono text-[9px] font-bold text-paper"
                          style={{ backgroundColor: user.color || COLORS.steel }}
                        >
                          {user.initials}
                        </span>
                        {user.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <p className="text-[11px] text-muted-light">
                Créée par {selectedTask.creatorName || "—"} ·{" "}
                {formatKanbanDate(selectedTask.createdAt)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
