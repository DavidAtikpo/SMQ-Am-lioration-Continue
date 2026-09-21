import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Search,
  Zap,
} from "lucide-react";
import type { CSSProperties } from "react";
import { COLORS } from "@/lib/constants";

export type AgendaTaskStatus = "todo" | "urgent" | "doing" | "testing" | "review" | "done";
export type AgendaTaskPriority = "low" | "medium" | "high" | "urgent";

export type KanbanColumnDef = {
  id: AgendaTaskStatus;
  label: string;
  Icon: LucideIcon;
  /** Couleur d'accent SMQ (colonnes, icônes) */
  accent: string;
};

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: "todo", label: "À faire", Icon: ClipboardList, accent: COLORS.steel },
  { id: "urgent", label: "Urgence / bug", Icon: AlertTriangle, accent: COLORS.rust },
  { id: "doing", label: "En cours", Icon: Zap, accent: COLORS.amber },
  { id: "testing", label: "En cours de test", Icon: Search, accent: COLORS.ink },
  { id: "review", label: "Révision", Icon: Clock, accent: "#5B5648" },
  { id: "done", label: "Terminé", Icon: CheckCircle2, accent: COLORS.teal },
];

export type PriorityStyle = {
  label: string;
  color: string;
  background: string;
  border: string;
};

export const PRIORITY_CONFIG: Record<AgendaTaskPriority, PriorityStyle> = {
  low: {
    label: "Basse",
    color: "#5B5648",
    background: `${COLORS.paperAlt}CC`,
    border: COLORS.line,
  },
  medium: {
    label: "Moyenne",
    color: COLORS.amber,
    background: `${COLORS.amber}18`,
    border: `${COLORS.amber}55`,
  },
  high: {
    label: "Haute",
    color: COLORS.rust,
    background: `${COLORS.rust}14`,
    border: `${COLORS.rust}44`,
  },
  urgent: {
    label: "Urgent",
    color: COLORS.rust,
    background: `${COLORS.rust}22`,
    border: COLORS.rust,
  },
};

const AVATAR_COLORS = [COLORS.steel, COLORS.teal, COLORS.amber, COLORS.rust, COLORS.ink, "#8A8370"];

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatKanbanDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function isTaskOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === "done") return false;
  return new Date(dueDate) < new Date();
}

export function normalizeTaskStatus(status: string): AgendaTaskStatus {
  if (status === "issues") return "urgent";
  const known = KANBAN_COLUMNS.find((col) => col.id === status);
  return known ? known.id : "todo";
}

export function normalizeTaskPriority(priority: string): AgendaTaskPriority {
  if (priority === "low" || priority === "medium" || priority === "high" || priority === "urgent") {
    return priority;
  }
  return "medium";
}

export function columnHeaderStyle(accent: string): CSSProperties {
  return {
    borderColor: accent,
    backgroundColor: `${accent}12`,
  };
}

export function priorityBadgeStyle(priority: AgendaTaskPriority): CSSProperties {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return {
    color: cfg.color,
    backgroundColor: cfg.background,
    borderColor: cfg.border,
  };
}
