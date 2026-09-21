"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, GanttChart, Loader2, RefreshCw } from "lucide-react";
import { Btn, DocHeader, EmptyState, LoadingState, StatusStamp } from "@/components/ui";
import { barGeometry, ganttRangeMs } from "@/lib/agenda/gantt-rows";
import type { AgendaGanttPayload, GanttRow } from "@/lib/agenda/types";
import { COLORS } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";

type GanttFilter = "all" | "tasks" | "sessions";

const FILTER_LABELS: Record<GanttFilter, string> = {
  all: "Tout afficher",
  tasks: "Tâches uniquement",
  sessions: "Sessions uniquement",
};

function durationDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function monthLabels(min: number, max: number): { label: string; leftPct: number; widthPct: number }[] {
  const DAY_MS = 86400000;
  const span = Math.max(DAY_MS, max - min);
  const segments: { label: string; leftPct: number; widthPct: number }[] = [];
  const cursor = new Date(min);
  cursor.setDate(1);
  if (cursor.getTime() < min) cursor.setMonth(cursor.getMonth() + 1);

  while (cursor.getTime() < max) {
    const startMs = cursor.getTime();
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const endMs = Math.min(next.getTime(), max);
    segments.push({
      label: cursor.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
      leftPct: ((startMs - min) / span) * 100,
      widthPct: ((endMs - startMs) / span) * 100,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return segments;
}

function rowBarColor(row: GanttRow): string {
  if (row.kind === "session") return COLORS.steel;
  if (row.status === "done") return COLORS.teal;
  if (row.status === "urgent" || row.priority === "urgent") return COLORS.rust;
  return COLORS.teal;
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

export function AgendaGanttPanel({ initialFilter = "all" }: { initialFilter?: GanttFilter }) {
  const [data, setData] = useState<AgendaGanttPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<GanttFilter>(initialFilter);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

  const rows = useMemo(() => {
    if (!data) return [];
    if (filter === "tasks") return data.rows.filter((r) => r.kind === "task");
    if (filter === "sessions") return data.rows.filter((r) => r.kind === "session");
    return data.rows;
  }, [data, filter]);

  const range = useMemo(() => ganttRangeMs(rows), [rows]);
  const months = useMemo(() => monthLabels(range.min, range.max), [range]);

  async function downloadPdf() {
    setDownloadingPdf(true);
    try {
      const response = await fetch("/api/agenda/gantt/pdf");
      if (!response.ok) throw new Error("PDF indisponible");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `gantt-agenda-${new Date().toISOString().slice(0, 10)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Impossible de télécharger le PDF Gantt.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (loading && !data) {
    return <LoadingState error={error} onRetry={() => void load()} />;
  }

  return (
    <div>
      <DocHeader
        title="Diagramme de Gantt — Neurix Agenda"
        sub="Tâches et sessions de formation synchronisées depuis la base Agenda"
        code="SMQ-PLAN-GANTT"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as GanttFilter)}
          className="input-base w-full sm:w-auto sm:min-w-[180px]"
        >
          {(Object.keys(FILTER_LABELS) as GanttFilter[]).map((key) => (
            <option key={key} value={key}>
              {FILTER_LABELS[key]}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <Btn kind="ghost" disabled={loading} onClick={() => void load()}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Actualiser
        </Btn>
        <Btn kind="ghost" disabled={downloadingPdf || rows.length === 0} onClick={() => void downloadPdf()}>
          <Download size={14} />
          {downloadingPdf ? "PDF…" : "Exporter PDF"}
        </Btn>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] border border-line bg-surface px-4 py-3 text-sm text-muted">
          {error}
        </div>
      )}

      {data && (
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="card">
            <div className="text-[12.5px] font-semibold text-muted">Tâches Agenda</div>
            <div className="mt-1 font-display text-2xl font-bold">{data.tasks.length}</div>
          </div>
          <div className="card">
            <div className="text-[12.5px] font-semibold text-muted">Sessions formation</div>
            <div className="mt-1 font-display text-2xl font-bold">{data.sessions.length}</div>
          </div>
          <div className="card">
            <div className="text-[12.5px] font-semibold text-muted">Dernière lecture</div>
            <div className="mt-1 text-sm font-semibold">
              {new Date(data.syncedAt).toLocaleString("fr-FR")}
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={GanttChart}
          text="Aucune tâche ou session Agenda dans le périmètre SMQ (Laurent ↔ David). Vérifiez AGENDA_DATABASE_URL."
        />
      ) : (
        <div className="card overflow-hidden p-0">
          {/* Mobile : liste compacte */}
          <div className="divide-y divide-line lg:hidden">
            {rows.map((row) => (
              <div key={row.id} className="px-3 py-3 sm:px-4">
                <div className="mb-1 font-mono text-[10px] text-muted-light">
                  {row.kind === "task" ? "Tâche" : "Session"}
                </div>
                <div className="font-semibold leading-snug">{row.title}</div>
                {row.assignees ? (
                  <div className="mt-0.5 truncate text-[11px] text-muted">{row.assignees}</div>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <span>
                    {fmtDate(row.startDate)} → {fmtDate(row.endDate)}
                  </span>
                  <StatusStamp label={row.statusLabel} />
                </div>
              </div>
            ))}
          </div>

          <div className="hidden grid-cols-1 lg:grid lg:grid-cols-[minmax(280px,36%)_1fr]">
            <div className="border-b border-line lg:border-b-0 lg:border-r">
              <div className="grid grid-cols-[1fr_72px_72px_80px] gap-1 border-b border-line bg-paper-alt px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                <span>Élément</span>
                <span className="text-center">Début</span>
                <span className="text-center">Fin</span>
                <span className="text-center">État</span>
              </div>
              <div className="max-h-[480px] overflow-y-auto">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1fr_72px_72px_80px] items-center gap-1 border-b border-line/70 px-3 py-2.5 text-xs last:border-b-0"
                  >
                    <div>
                      <div className="mb-0.5 font-mono text-[10px] text-muted-light">
                        {row.kind === "task" ? "Tâche" : "Session"}
                      </div>
                      <div className="font-semibold leading-snug">{row.title}</div>
                      {row.assignees && (
                        <div className="mt-0.5 truncate text-[10px] text-muted">{row.assignees}</div>
                      )}
                    </div>
                    <span className="text-center text-[11px]">{fmtDate(row.startDate)}</span>
                    <span className="text-center text-[11px]">{fmtDate(row.endDate)}</span>
                    <div className="flex justify-center">
                      <StatusStamp label={row.statusLabel} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 overflow-x-auto">
              <div className="relative min-w-[520px]">
                <div className="relative h-8 border-b border-line bg-paper-alt">
                  {months.map((m) => (
                    <div
                      key={`${m.label}-${m.leftPct}`}
                      className="absolute top-0 flex h-full items-center border-r border-line/60 px-1 text-[10px] font-semibold text-muted"
                      style={{ left: `${m.leftPct}%`, width: `${m.widthPct}%` }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
                <div className="relative max-h-[480px] overflow-y-auto">
                  {rows.map((row) => {
                    const { leftPct, widthPct } = barGeometry(
                      row.startDate,
                      row.endDate,
                      range.min,
                      range.max,
                    );
                    return (
                      <div
                        key={row.id}
                        className="relative h-[52px] border-b border-line/70 last:border-b-0"
                      >
                        <div
                          className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md shadow-sm"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            backgroundColor: rowBarColor(row),
                            minWidth: 8,
                          }}
                          title={`${row.title} · ${durationDays(row.startDate, row.endDate)} j`}
                        >
                          {row.progressPct != null && row.progressPct > 0 && (
                            <div
                              className="h-full rounded-md bg-white/25"
                              style={{ width: `${row.progressPct}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
