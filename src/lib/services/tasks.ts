import { ensureUserFamily } from "@/lib/family";
import { taskAccessibleWhere, taskBoardVisibleWhere } from "@/lib/family-private-scope";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type TaskScope = "all" | "mine" | "today" | "overdue";

export type TaskDTO = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  isPrivate: boolean;
  labels: string[];
  assigneeId: string | null;
  creatorId: string;
  columnId: string;
  boardId: string;
  boardName: string;
  columnName: string;
  createdAt: string;
  updatedAt: string;
};

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  priority: true,
  dueDate: true,
  completed: true,
  completedAt: true,
  isPrivate: true,
  labels: true,
  assigneeId: true,
  creatorId: true,
  columnId: true,
  createdAt: true,
  updatedAt: true,
  column: {
    select: {
      name: true,
      boardId: true,
      board: { select: { name: true } },
    },
  },
} as const satisfies Prisma.TaskSelect;

type TaskRow = Prisma.TaskGetPayload<{ select: typeof TASK_SELECT }>;

function toDTO(row: TaskRow): TaskDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dueDate: row.dueDate?.toISOString() ?? null,
    completed: row.completed,
    completedAt: row.completedAt?.toISOString() ?? null,
    isPrivate: row.isPrivate,
    labels: row.labels,
    assigneeId: row.assigneeId,
    creatorId: row.creatorId,
    columnId: row.columnId,
    boardId: row.column.boardId,
    boardName: row.column.board.name,
    columnName: row.column.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureFamily(userId: string): Promise<string> {
  const familyId = await ensureUserFamily(userId);
  if (!familyId) throw new TasksServiceError("FAMILY_REQUIRED", "User has no family");
  return familyId;
}

export class TasksServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
    this.name = "TasksServiceError";
  }
}

function startOfTodayUtc(): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function endOfTodayUtc(): Date {
  const date = new Date();
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

export async function listTasks(
  userId: string,
  opts: { scope?: TaskScope; includeCompleted?: boolean } = {}
): Promise<TaskDTO[]> {
  const familyId = await ensureFamily(userId);
  const { scope = "all", includeCompleted = false } = opts;
  const where: Prisma.TaskWhereInput = { ...taskAccessibleWhere(familyId, userId) };

  if (!includeCompleted) where.completed = false;
  if (scope === "mine") where.assigneeId = userId;
  if (scope === "today") where.dueDate = { gte: startOfTodayUtc(), lte: endOfTodayUtc() };
  if (scope === "overdue") {
    where.dueDate = { lt: startOfTodayUtc() };
    where.completed = false;
  }

  const rows = await prisma.task.findMany({
    where,
    select: TASK_SELECT,
    orderBy: [
      { completed: "asc" },
      { dueDate: { sort: "asc", nulls: "last" } },
      { priority: "desc" },
      { createdAt: "desc" },
    ],
    take: 500,
  });
  return rows.map(toDTO);
}

export async function getTask(userId: string, taskId: string): Promise<TaskDTO | null> {
  const familyId = await ensureFamily(userId);
  const row = await prisma.task.findFirst({
    where: { id: taskId, ...taskAccessibleWhere(familyId, userId) },
    select: TASK_SELECT,
  });
  return row ? toDTO(row) : null;
}

async function pickDefaultColumn(familyId: string, userId: string): Promise<string | null> {
  const board = await prisma.taskBoard.findFirst({
    where: taskBoardVisibleWhere(familyId, userId),
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      columns: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true },
        take: 1,
      },
    },
  });
  return board?.columns[0]?.id ?? null;
}

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  columnId?: string | null;
  priority?: TaskDTO["priority"];
  dueDate?: string | null;
  isPrivate?: boolean;
  assigneeId?: string | null;
  labels?: string[];
};

export async function createTask(userId: string, input: CreateTaskInput): Promise<TaskDTO> {
  const familyId = await ensureFamily(userId);
  const title = input.title?.trim();
  if (!title) throw new TasksServiceError("TITLE_REQUIRED", "Title is required");

  let columnId = input.columnId ?? null;
  if (columnId) {
    const column = await prisma.taskColumn.findFirst({
      where: { id: columnId, board: taskBoardVisibleWhere(familyId, userId) },
      select: { id: true },
    });
    if (!column) throw new TasksServiceError("COLUMN_NOT_FOUND", "Column not found", 404);
  } else {
    columnId = await pickDefaultColumn(familyId, userId);
    if (!columnId) throw new TasksServiceError("NO_DEFAULT_COLUMN", "No default column to place task in");
  }

  const maxOrder = await prisma.task.aggregate({
    _max: { order: true },
    where: { columnId },
  });

  const row = await prisma.task.create({
    data: {
      title,
      description: input.description ?? null,
      priority: input.priority ?? "MEDIUM",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      isPrivate: Boolean(input.isPrivate),
      assigneeId: input.assigneeId ?? null,
      labels: input.labels ?? [],
      columnId,
      creatorId: userId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    select: TASK_SELECT,
  });
  return toDTO(row);
}

export type PatchTaskInput = Partial<{
  title: string;
  description: string | null;
  priority: TaskDTO["priority"];
  dueDate: string | null;
  completed: boolean;
  isPrivate: boolean;
  assigneeId: string | null;
  labels: string[];
  columnId: string;
}>;

export async function patchTask(userId: string, taskId: string, patch: PatchTaskInput): Promise<TaskDTO> {
  const familyId = await ensureFamily(userId);
  const existing = await prisma.task.findFirst({
    where: { id: taskId, ...taskAccessibleWhere(familyId, userId) },
    select: { id: true, columnId: true, completed: true },
  });
  if (!existing) throw new TasksServiceError("TASK_NOT_FOUND", "Task not found", 404);

  const data: Prisma.TaskUpdateInput = {};
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new TasksServiceError("TITLE_REQUIRED", "Title is required");
    data.title = title;
  }
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.dueDate !== undefined) data.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;
  if (patch.isPrivate !== undefined) data.isPrivate = patch.isPrivate;
  if (patch.assigneeId !== undefined) {
    data.assignee = patch.assigneeId ? { connect: { id: patch.assigneeId } } : { disconnect: true };
  }
  if (patch.labels !== undefined) data.labels = patch.labels;

  if (patch.completed !== undefined && patch.completed !== existing.completed) {
    data.completed = patch.completed;
    data.completedAt = patch.completed ? new Date() : null;
  }

  if (patch.columnId !== undefined && patch.columnId !== existing.columnId) {
    const column = await prisma.taskColumn.findFirst({
      where: { id: patch.columnId, board: taskBoardVisibleWhere(familyId, userId) },
      select: { id: true },
    });
    if (!column) throw new TasksServiceError("COLUMN_NOT_FOUND", "Column not found", 404);
    data.column = { connect: { id: patch.columnId } };
  }

  const row = await prisma.task.update({
    where: { id: taskId },
    data,
    select: TASK_SELECT,
  });
  return toDTO(row);
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const familyId = await ensureFamily(userId);
  const existing = await prisma.task.findFirst({
    where: { id: taskId, ...taskAccessibleWhere(familyId, userId) },
    select: { id: true },
  });
  if (!existing) throw new TasksServiceError("TASK_NOT_FOUND", "Task not found", 404);
  await prisma.task.delete({ where: { id: taskId } });
}
