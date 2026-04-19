export interface TaskBoardUser {
  id: string;
  name: string | null;
  image: string | null;
  color: string;
  emoji: string;
  timeZone?: string | null;
}

export interface TaskBoardTask {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  completed: boolean;
  order: number;
  columnId: string;
  isPrivate: boolean;
  assignee: TaskBoardUser | null;
  creator: TaskBoardUser;
  labels: string[];
  reminderCadenceDays?: number | null;
  reminderWindowStartMin?: number | null;
  reminderWindowEndMin?: number | null;
  reminderAnchorYmd?: string | null;
  reminderLastFiredYmd?: string | null;
}

export interface TaskBoardColumn {
  id: string;
  name: string;
  emoji: string;
  color: string;
  order: number;
  tasks: TaskBoardTask[];
}

export interface TaskBoardBoard {
  id: string;
  name: string;
  emoji: string;
  color: string;
  order: number;
  isPrivate: boolean;
  columns: TaskBoardColumn[];
}

function toIso(d: unknown): string | null {
  if (d == null) return null;
  if (typeof d === "string") return d;
  if (d instanceof Date) return d.toISOString();
  return null;
}

function normalizeColumnEmoji(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "column") return "📋";
  return s;
}

export function normalizeBoardsPayload(raw: unknown): TaskBoardBoard[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((board) => {
    const b = board as Record<string, unknown>;
    const columns = Array.isArray(b.columns) ? b.columns : [];
    return {
      id: String(b.id),
      name: String(b.name ?? ""),
      emoji: String(b.emoji ?? "board"),
      color: String(b.color ?? "#f43f5e"),
      order: typeof b.order === "number" ? b.order : 0,
      isPrivate: Boolean(b.isPrivate),
      columns: columns.map((col) => {
        const c = col as Record<string, unknown>;
        const tasks = Array.isArray(c.tasks) ? c.tasks : [];
        return {
          id: String(c.id),
          name: String(c.name ?? ""),
          emoji: normalizeColumnEmoji(c.emoji),
          color: String(c.color ?? "#e7e5e4"),
          order: typeof c.order === "number" ? c.order : 0,
          tasks: tasks.map((t) => {
            const x = t as Record<string, unknown>;
            return {
              id: String(x.id),
              title: String(x.title ?? ""),
              description: x.description != null ? String(x.description) : null,
              priority: (x.priority as TaskBoardTask["priority"]) || "MEDIUM",
              dueDate: toIso(x.dueDate),
              completed: Boolean(x.completed),
              order: typeof x.order === "number" ? x.order : 0,
              columnId: String(x.columnId),
              isPrivate: Boolean(x.isPrivate),
              assignee: (x.assignee as TaskBoardUser | null) ?? null,
              creator: x.creator as TaskBoardUser,
              labels: Array.isArray(x.labels) ? (x.labels as string[]) : [],
              reminderCadenceDays: typeof x.reminderCadenceDays === "number" ? x.reminderCadenceDays : null,
              reminderWindowStartMin: typeof x.reminderWindowStartMin === "number" ? x.reminderWindowStartMin : null,
              reminderWindowEndMin: typeof x.reminderWindowEndMin === "number" ? x.reminderWindowEndMin : null,
              reminderAnchorYmd: typeof x.reminderAnchorYmd === "string" ? x.reminderAnchorYmd : null,
              reminderLastFiredYmd: typeof x.reminderLastFiredYmd === "string" ? x.reminderLastFiredYmd : null,
            };
          }),
        };
      }),
    };
  });
}
