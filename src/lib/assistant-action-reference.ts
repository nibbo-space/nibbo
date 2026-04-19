import {
  DEFAULT_EVENT_TIME_ZONE,
  formatEventDayForAssistant,
  formatEventInstantForAssistant,
} from "@/lib/assistant-event-datetime";
import { taskBoardVisibleWhere } from "@/lib/family-private-scope";
import { prisma } from "@/lib/prisma";
import { AUTO_BILLING_MARKER } from "@/lib/subscription-calendar";

const MAX_REF = 9000;

function dayStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function buildAssistantActionReference(userId: string, familyId: string): Promise<string> {
  const [board, tasks, events, categories, expenses, members, viewer] = await Promise.all([
    prisma.taskBoard.findFirst({
      where: taskBoardVisibleWhere(familyId, userId),
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        columns: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: { id: true, name: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        completed: false,
        column: { board: taskBoardVisibleWhere(familyId, userId) },
        OR: [{ isPrivate: false }, { isPrivate: true, creatorId: userId }],
      },
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        assigneeId: true,
        columnId: true,
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 28,
    }),
    prisma.event.findMany({
      where: {
        familyId,
        NOT: { description: { startsWith: AUTO_BILLING_MARKER } },
      },
      select: { id: true, title: true, startDate: true, endDate: true, allDay: true },
      orderBy: { updatedAt: "desc" },
      take: 45,
    }),
    prisma.expenseCategory.findMany({
      where: { familyId },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 40,
    }),
    prisma.expense.findMany({
      where: { familyId },
      select: { id: true, title: true, amount: true, date: true, categoryId: true },
      orderBy: { date: "desc" },
      take: 18,
    }),
    prisma.user.findMany({
      where: { familyId },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 24,
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } }),
  ]);

  const tz = viewer?.timeZone?.trim() || DEFAULT_EVENT_TIME_ZONE;

  const lines: string[] = [];
  lines.push("--- Action reference: use these exact ids in NIBBO_ACTION JSON only when the user has confirmed details ---");

  if (board) {
    const defCol = board.columns[0];
    lines.push(`Default task board: "${board.name}" (board id ${board.id})`);
    lines.push(
      defCol
        ? `Default column for new tasks (use if user does not pick another): id=${defCol.id} name="${defCol.name}"`
        : "No columns on default board — task_create cannot run until user creates a column."
    );
    lines.push("Columns on default board:");
    for (const c of board.columns) {
      lines.push(`- column ${c.id} | ${c.name}`);
    }
  } else {
    lines.push("No task boards in this family — task_create is unavailable until a board exists.");
  }

  lines.push("--- Open tasks (family boards) ---");
  for (const t of tasks) {
    const due = t.dueDate ? dayStr(t.dueDate) : "no-date";
    const a = t.assigneeId ? `assignee:${t.assigneeId}` : "unassigned";
    lines.push(`- task ${t.id} | col:${t.columnId} | [${t.priority}] ${t.title} | due:${due} | ${a}`);
  }

  lines.push("--- Calendar events (ids for event_update / event_delete; recently changed first) ---");
  for (const e of events) {
    const s = e.allDay
      ? formatEventDayForAssistant(e.startDate, tz)
      : formatEventInstantForAssistant(e.startDate, tz);
    lines.push(`- event ${e.id} | ${e.title} | start:${s}`);
  }

  lines.push("--- Family members (assigneeId for tasks and calendar events) ---");
  for (const u of members) {
    const label = (u.name && u.name.trim()) || u.email?.split("@")[0] || "member";
    lines.push(`- user ${u.id} | ${label}`);
  }

  lines.push("--- Expense categories ---");
  for (const c of categories) {
    lines.push(`- category ${c.id} | ${c.name}`);
  }

  lines.push("--- Recent expenses (for edit by id) ---");
  for (const x of expenses) {
    const cat = x.categoryId || "none";
    lines.push(`- expense ${x.id} | ${dayStr(x.date)} | ${x.amount} | cat:${cat} | ${x.title}`);
  }

  lines.push(`Current user id (assignee default): ${userId}`);

  let text = lines.join("\n");
  if (text.length > MAX_REF) text = text.slice(0, MAX_REF) + "\n…(truncated)";
  return text;
}
