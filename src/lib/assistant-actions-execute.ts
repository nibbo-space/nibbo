import type { Priority } from "@prisma/client";
import { DEFAULT_EVENT_TIME_ZONE, parseEventInstantForUserTz } from "@/lib/assistant-event-datetime";
import { taskAccessibleWhere, taskBoardVisibleWhere } from "@/lib/family-private-scope";
import { prisma } from "@/lib/prisma";
import { taskRelationInclude } from "@/lib/task-prisma-include";
import { fireAndForgetNotifyTaskAssigneeChanged } from "@/lib/notifications/task-assigned";

const PRIORITIES = new Set<Priority>(["LOW", "MEDIUM", "HIGH", "URGENT"]);

type OpResult = { op: string; ok: boolean; detail?: string; id?: string };

async function defaultTaskColumnId(familyId: string, userId: string): Promise<string | null> {
  const board = await prisma.taskBoard.findFirst({
    where: taskBoardVisibleWhere(familyId, userId),
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      columns: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: { id: true }, take: 1 },
    },
  });
  return board?.columns[0]?.id ?? null;
}

function parseYmd(s: unknown): Date | null {
  if (s === null || s === undefined || s === "") return null;
  const t = String(s).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function executeAssistantActions(
  userId: string,
  familyId: string,
  rawActions: unknown[],
  eventTimeZone?: string
): Promise<{ results: OpResult[] }> {
  const results: OpResult[] = [];
  const defCol = await defaultTaskColumnId(familyId, userId);
  const tz = eventTimeZone?.trim() || DEFAULT_EVENT_TIME_ZONE;

  for (const raw of rawActions.slice(0, 8)) {
    if (!raw || typeof raw !== "object") {
      results.push({ op: "?", ok: false, detail: "invalid" });
      continue;
    }
    const a = raw as Record<string, unknown>;
    const op = String(a.op || "");

    try {
      if (op === "task_create") {
        const title = String(a.title || "").trim().slice(0, 500);
        if (!title) {
          results.push({ op, ok: false, detail: "title" });
          continue;
        }
        let columnId = a.columnId ? String(a.columnId) : defCol;
        if (!columnId) {
          results.push({ op, ok: false, detail: "no-column" });
          continue;
        }
        const col = await prisma.taskColumn.findFirst({
          where: { id: columnId, board: taskBoardVisibleWhere(familyId, userId) },
          select: { id: true, board: { select: { isPrivate: true } } },
        });
        if (!col) {
          results.push({ op, ok: false, detail: "column" });
          continue;
        }
        const boardPrivate = col.board.isPrivate;
        let priority: Priority = "MEDIUM";
        if (a.priority !== undefined && a.priority !== null) {
          const p = String(a.priority) as Priority;
          if (PRIORITIES.has(p)) priority = p;
        }
        let assigneeId: string | null | undefined = undefined;
        if (a.assigneeId !== undefined) {
          if (a.assigneeId === null || a.assigneeId === "") assigneeId = null;
          else {
            const uid = String(a.assigneeId);
            const u = await prisma.user.findFirst({ where: { id: uid, familyId }, select: { id: true } });
            assigneeId = u ? uid : undefined;
            if (assigneeId === undefined) {
              results.push({ op, ok: false, detail: "assignee" });
              continue;
            }
          }
        }
        const dueDate = a.dueDate !== undefined ? parseYmd(a.dueDate) : undefined;
        if (a.dueDate !== undefined && a.dueDate !== null && a.dueDate !== "" && dueDate === null) {
          results.push({ op, ok: false, detail: "dueDate" });
          continue;
        }
        let resolvedAssignee = assigneeId === undefined ? userId : assigneeId;
        if (boardPrivate) resolvedAssignee = userId;
        const assigneeSeenAt =
          resolvedAssignee && resolvedAssignee !== userId ? null : resolvedAssignee ? new Date() : null;
        const task = await prisma.task.create({
          data: {
            title,
            description: a.description ? String(a.description).slice(0, 4000) : undefined,
            priority,
            dueDate: dueDate ?? undefined,
            columnId,
            assigneeId: resolvedAssignee,
            assigneeSeenAt,
            creatorId: userId,
            labels: [],
            order: 0,
          },
          include: taskRelationInclude,
        });
        fireAndForgetNotifyTaskAssigneeChanged({
          actorUserId: userId,
          previousAssigneeId: null,
          task: { id: task.id, title: task.title, assigneeId: task.assigneeId },
          actorDisplayName: null,
        });
        results.push({ op, ok: true, id: task.id });
        continue;
      }

      if (op === "task_update") {
        const id = String(a.id || "");
        if (!id) {
          results.push({ op, ok: false, detail: "id" });
          continue;
        }
        const existing = await prisma.task.findFirst({
          where: { id, ...taskAccessibleWhere(familyId, userId) },
        });
        if (!existing) {
          results.push({ op, ok: false, detail: "not-found" });
          continue;
        }
        const data: Parameters<typeof prisma.task.update>[0]["data"] = {};
        if (a.title !== undefined) data.title = String(a.title).trim().slice(0, 500);
        if (a.priority !== undefined) {
          const p = String(a.priority) as Priority;
          if (PRIORITIES.has(p)) data.priority = p;
        }
        if (a.completed === true || a.completed === false) {
          data.completed = Boolean(a.completed);
          data.completedAt = a.completed ? new Date() : null;
        }
        if ("dueDate" in a) {
          const d = parseYmd(a.dueDate);
          if (a.dueDate !== null && a.dueDate !== "" && d === null) {
            results.push({ op, ok: false, detail: "dueDate" });
            continue;
          }
          data.dueDate = d;
        }
        if (Object.keys(data).length === 0) {
          results.push({ op, ok: false, detail: "no-fields" });
          continue;
        }
        const task = await prisma.task.update({ where: { id }, data, include: taskRelationInclude });
        results.push({ op, ok: true, id: task.id });
        continue;
      }

      if (op === "event_create") {
        const title = String(a.title || "").trim().slice(0, 500);
        if (!title) {
          results.push({ op, ok: false, detail: "title" });
          continue;
        }
        const start = a.startDate ? parseEventInstantForUserTz(a.startDate, tz) : null;
        const end = a.endDate ? parseEventInstantForUserTz(a.endDate, tz) : null;
        if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          results.push({ op, ok: false, detail: "dates" });
          continue;
        }
        let assigneeId: string | undefined = undefined;
        if (a.assigneeId) {
          const u = await prisma.user.findFirst({
            where: { id: String(a.assigneeId), familyId },
            select: { id: true },
          });
          if (!u) {
            results.push({ op, ok: false, detail: "assignee" });
            continue;
          }
          assigneeId = u.id;
        }
        const ev = await prisma.event.create({
          data: {
            title,
            description: a.description ? String(a.description).slice(0, 4000) : undefined,
            emoji: "📅",
            color: "#8b5cf6",
            startDate: start,
            endDate: end,
            allDay: Boolean(a.allDay),
            weeklyRepeat: false,
            weeklyDay: null,
            location: a.location ? String(a.location).slice(0, 500) : undefined,
            assigneeId,
            familyId,
          },
        });
        results.push({ op, ok: true, id: ev.id });
        continue;
      }

      if (op === "event_update") {
        const id = String(a.id || "");
        if (!id) {
          results.push({ op, ok: false, detail: "id" });
          continue;
        }
        const existing = await prisma.event.findFirst({ where: { id, familyId }, select: { id: true } });
        if (!existing) {
          results.push({ op, ok: false, detail: "not-found" });
          continue;
        }
        const data: Parameters<typeof prisma.event.update>[0]["data"] = {};
        if (a.title !== undefined) data.title = String(a.title).trim().slice(0, 500);
        if (a.description !== undefined) {
          data.description =
            a.description === null || a.description === ""
              ? null
              : String(a.description).slice(0, 4000);
        }
        if (a.startDate !== undefined) {
          const d = parseEventInstantForUserTz(a.startDate, tz);
          if (!d || Number.isNaN(d.getTime())) {
            results.push({ op, ok: false, detail: "startDate" });
            continue;
          }
          data.startDate = d;
        }
        if (a.endDate !== undefined) {
          const d = parseEventInstantForUserTz(a.endDate, tz);
          if (!d || Number.isNaN(d.getTime())) {
            results.push({ op, ok: false, detail: "endDate" });
            continue;
          }
          data.endDate = d;
        }
        if (a.allDay !== undefined) data.allDay = Boolean(a.allDay);
        if (a.location !== undefined) {
          data.location =
            a.location === null || a.location === "" ? null : String(a.location).slice(0, 500);
        }
        if (a.assigneeId !== undefined) {
          if (a.assigneeId === null || a.assigneeId === "") {
            data.assigneeId = null;
          } else {
            const uid = String(a.assigneeId);
            const u = await prisma.user.findFirst({ where: { id: uid, familyId }, select: { id: true } });
            if (!u) {
              results.push({ op, ok: false, detail: "assignee" });
              continue;
            }
            data.assigneeId = uid;
          }
        }
        if (Object.keys(data).length === 0) {
          results.push({ op, ok: false, detail: "no-fields" });
          continue;
        }
        const ev = await prisma.event.update({ where: { id }, data });
        results.push({ op, ok: true, id: ev.id });
        continue;
      }

      if (op === "event_delete") {
        const id = String(a.id || "").trim();
        if (!id) {
          results.push({ op, ok: false, detail: "id" });
          continue;
        }
        const existing = await prisma.event.findFirst({ where: { id, familyId }, select: { id: true } });
        if (!existing) {
          results.push({ op, ok: false, detail: "not-found" });
          continue;
        }
        await prisma.event.delete({ where: { id } });
        results.push({ op, ok: true, id });
        continue;
      }

      if (op === "expense_create") {
        const title = String(a.title || "").trim().slice(0, 500);
        const amount = Number(a.amount);
        if (!title || !Number.isFinite(amount) || amount <= 0) {
          results.push({ op, ok: false, detail: "title-amount" });
          continue;
        }
        let categoryId: string | undefined = undefined;
        if (a.categoryId !== undefined && a.categoryId !== null && a.categoryId !== "") {
          const cid = String(a.categoryId);
          const c = await prisma.expenseCategory.findFirst({ where: { id: cid, familyId }, select: { id: true } });
          if (!c) {
            results.push({ op, ok: false, detail: "category" });
            continue;
          }
          categoryId = cid;
        }
        const date = a.date !== undefined ? parseYmd(a.date) : new Date();
        if (a.date !== undefined && a.date !== null && a.date !== "" && !date) {
          results.push({ op, ok: false, detail: "date" });
          continue;
        }
        const ex = await prisma.expense.create({
          data: {
            title,
            amount,
            date: date ?? new Date(),
            categoryId,
            userId,
            familyId,
            note: a.note ? String(a.note).slice(0, 2000) : undefined,
          },
        });
        results.push({ op, ok: true, id: ex.id });
        continue;
      }

      if (op === "expense_update") {
        const id = String(a.id || "");
        if (!id) {
          results.push({ op, ok: false, detail: "id" });
          continue;
        }
        const existing = await prisma.expense.findFirst({ where: { id, familyId }, select: { id: true } });
        if (!existing) {
          results.push({ op, ok: false, detail: "not-found" });
          continue;
        }
        const data: Parameters<typeof prisma.expense.update>[0]["data"] = {};
        if (a.title !== undefined) data.title = String(a.title).trim().slice(0, 500);
        if (a.amount !== undefined) {
          const amt = Number(a.amount);
          if (!Number.isFinite(amt) || amt <= 0) {
            results.push({ op, ok: false, detail: "amount" });
            continue;
          }
          data.amount = amt;
        }
        if ("date" in a) {
          const d = parseYmd(a.date);
          if (a.date !== null && a.date !== "" && !d) {
            results.push({ op, ok: false, detail: "date" });
            continue;
          }
          if (d) data.date = d;
        }
        if ("categoryId" in a) {
          if (a.categoryId === null || a.categoryId === "") data.categoryId = null;
          else {
            const cid = String(a.categoryId);
            const c = await prisma.expenseCategory.findFirst({ where: { id: cid, familyId }, select: { id: true } });
            if (!c) {
              results.push({ op, ok: false, detail: "category" });
              continue;
            }
            data.categoryId = cid;
          }
        }
        if (a.note !== undefined) data.note = a.note === null ? null : String(a.note).slice(0, 2000);
        if (Object.keys(data).length === 0) {
          results.push({ op, ok: false, detail: "no-fields" });
          continue;
        }
        const ex = await prisma.expense.update({ where: { id }, data });
        results.push({ op, ok: true, id: ex.id });
        continue;
      }

      results.push({ op: op || "?", ok: false, detail: "unknown-op" });
    } catch (e) {
      results.push({
        op,
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 200) : "error",
      });
    }
  }

  return { results };
}
