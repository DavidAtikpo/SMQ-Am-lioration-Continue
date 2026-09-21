import type { AgendaGanttSession, AgendaGanttTask, GanttRow } from "@/lib/agenda/types";

const DAY_MS = 86400000;

const TASK_STATUS_LABEL: Record<string, string> = {
  todo: "À faire",
  urgent: "Urgent",
  doing: "En cours",
  testing: "Test",
  review: "Revue",
  done: "Terminé",
};

const TASK_STATUS_PROGRESS: Record<string, number> = {
  todo: 0,
  urgent: 12,
  doing: 45,
  testing: 72,
  review: 88,
  done: 100,
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

type SessionStatusKey =
  | "noAssignees"
  | "reassign"
  | "confirmed"
  | "partiallyConfirmed"
  | "pendingValidation";

const SESSION_STATUS_LABEL: Record<SessionStatusKey, string> = {
  noAssignees: "Sans intervenant",
  reassign: "À réassigner",
  confirmed: "Confirmée",
  partiallyConfirmed: "Partiellement confirmée",
  pendingValidation: "En attente",
};

function parseDateMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (match) {
    const t = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function toIsoDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addDays(ms: number, days: number): number {
  return ms + days * DAY_MS;
}

function clampRange(startMs: number, endMs: number): { startMs: number; endMs: number } {
  if (endMs >= startMs) return { startMs, endMs };
  return { startMs, endMs: startMs + DAY_MS };
}

function sessionStatusFromParticipants(participants: string): {
  pct: number;
  key: SessionStatusKey;
} {
  if (!participants.trim()) return { pct: 0, key: "noAssignees" };
  return { pct: 50, key: "pendingValidation" };
}

export function buildGanttRows(
  tasks: AgendaGanttTask[],
  sessions: AgendaGanttSession[],
): GanttRow[] {
  const rows: GanttRow[] = [];

  for (const session of sessions) {
    const startRaw = parseDateMs(session.startDate);
    const endRaw = parseDateMs(session.endDate);
    const startMs = startRaw != null ? startOfDay(startRaw) : startOfDay(Date.now());
    const endMs = endRaw != null ? startOfDay(endRaw) : addDays(startMs, 4);
    const { startMs: sMs, endMs: eMs } = clampRange(startMs, endMs);
    const meta = sessionStatusFromParticipants(session.participants);
    rows.push({
      id: `session:${session.id}`,
      kind: "session",
      title: session.title,
      startDate: toIsoDate(sMs),
      endDate: toIsoDate(eMs),
      status: meta.key,
      statusLabel: SESSION_STATUS_LABEL[meta.key],
      progressPct: meta.pct,
      assignees: session.participants || session.creatorName,
    });
  }

  for (const task of tasks) {
    const created = parseDateMs(task.createdAt) ?? Date.now();
    const startMs = startOfDay(created);
    const due = parseDateMs(task.dueDate);
    const endMs = due != null ? startOfDay(due) : addDays(startMs, 14);
    const { startMs: s, endMs: e } = clampRange(startMs, endMs);
    rows.push({
      id: `task:${task.id}`,
      kind: "task",
      title: task.title,
      startDate: toIsoDate(s),
      endDate: toIsoDate(e),
      status: task.status,
      statusLabel: TASK_STATUS_LABEL[task.status] ?? task.status,
      priority: task.priority,
      priorityLabel: PRIORITY_LABEL[task.priority] ?? task.priority,
      progressPct: TASK_STATUS_PROGRESS[task.status] ?? null,
      assignees: task.assignees,
    });
  }

  return rows.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function ganttRangeMs(rows: GanttRow[]): { min: number; max: number } {
  if (rows.length === 0) {
    const now = Date.now();
    return { min: startOfDay(addDays(now, -7)), max: startOfDay(addDays(now, 45)) };
  }

  let min = parseDateMs(rows[0].startDate) ?? Date.now();
  let max = parseDateMs(rows[0].endDate) ?? min;
  for (const row of rows) {
    const s = parseDateMs(row.startDate) ?? min;
    const e = parseDateMs(row.endDate) ?? s;
    min = Math.min(min, s);
    max = Math.max(max, e);
  }

  const pad = Math.max(7 * DAY_MS, (max - min) * 0.08);
  return { min: min - pad, max: max + pad + DAY_MS };
}

export function barGeometry(
  startDate: string,
  endDate: string,
  rangeMin: number,
  rangeMax: number,
): { leftPct: number; widthPct: number } {
  const startMs = startOfDay(parseDateMs(startDate) ?? rangeMin);
  const endMs = startOfDay(parseDateMs(endDate) ?? startMs) + DAY_MS;
  const span = Math.max(DAY_MS, rangeMax - rangeMin);
  const leftPct = Math.max(0, ((startMs - rangeMin) / span) * 100);
  const rightPct = Math.min(100, ((endMs - rangeMin) / span) * 100);
  const widthPct = Math.max(1.5, rightPct - leftPct);
  return { leftPct, widthPct };
}
