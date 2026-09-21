export type AgendaAssignee = {
  name: string;
  initials: string;
  color: string;
};

export type AgendaGanttTask = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  dueDate: string | null;
  assignees: string;
  assigneeDetails: AgendaAssignee[];
  creatorName: string;
  groupName: string | null;
};

export type AgendaGanttSession = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  examDate: string | null;
  participants: string;
  creatorName: string;
};

export type GanttRowKind = "task" | "session";

export type GanttRow = {
  id: string;
  kind: GanttRowKind;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  statusLabel: string;
  priority?: string;
  priorityLabel?: string;
  progressPct: number | null;
  assignees?: string;
};

export type AgendaGanttPayload = {
  tasks: AgendaGanttTask[];
  sessions: AgendaGanttSession[];
  rows: GanttRow[];
  syncedAt: string;
};
