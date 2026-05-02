import { auth } from "@/lib/auth";
import { syncFamilyMemberUnlocks, syncUserStatUnlocks } from "@/lib/achievements/evaluate";
import { taskAccessibleWhere, taskBoardVisibleWhere } from "@/lib/family-private-scope";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { taskRelationInclude } from "@/lib/task-prisma-include";
import { fireAndForgetNotifyTaskAssigneeChanged } from "@/lib/notifications/task-assigned";
import { DEFAULT_TIME_ZONE, formatYmdInTimeZone } from "@/lib/calendar-tz";
import { applyReminderFieldsFromBody } from "@/lib/task-reminder-api";
import { awardXp, syncFamilyXpUnlocksFromLedger } from "@/lib/xp-ledger";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const body = await req.json();

  if (body.type === "move-task") {
    const canMove = await prisma.task.findFirst({
      where: { id, ...taskAccessibleWhere(familyId, userId) },
      select: { id: true },
    });
    if (!canMove) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const targetColumn = await prisma.taskColumn.findFirst({
      where: { id: body.columnId, board: taskBoardVisibleWhere(familyId, userId) },
      select: { id: true },
    });
    if (!targetColumn) return NextResponse.json({ error: "Column not found" }, { status: 404 });
    const task = await prisma.task.update({
      where: { id },
      data: { columnId: body.columnId, order: body.order },
      include: taskRelationInclude,
    });
    return NextResponse.json(task);
  }

  const existing = await prisma.task.findFirst({
    where: { id, ...taskAccessibleWhere(familyId, userId) },
    include: { column: { include: { board: { select: { isPrivate: true } } } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Parameters<typeof prisma.task.update>[0]["data"] = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.completed !== undefined) {
    data.completed = body.completed;
    if (body.completed) {
      if (!existing.completed) data.completedAt = new Date();
    } else {
      data.completedAt = null;
    }
  }
  if (body.labels !== undefined) data.labels = body.labels;
  if (body.order !== undefined) data.order = body.order;
  if (body.columnId !== undefined) data.columnId = body.columnId;
  if (body.columnId !== undefined) {
    const targetColumn = await prisma.taskColumn.findFirst({
      where: { id: body.columnId, board: taskBoardVisibleWhere(familyId, userId) },
      select: { id: true },
    });
    if (!targetColumn) return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }
  if ("dueDate" in body) {
    data.dueDate =
      body.dueDate === null || body.dueDate === ""
        ? null
        : body.dueDate
          ? new Date(body.dueDate as string)
          : null;
  }
  if (body.isPrivate === true) {
    data.isPrivate = true;
    data.assigneeId = session.user.id;
    data.assigneeSeenAt = new Date();
  } else if (body.isPrivate === false) {
    data.isPrivate = false;
  }
  if (body.assigneeId !== undefined && body.isPrivate !== true) {
    const locked = existing.isPrivate || existing.column.board.isPrivate;
    let nextId =
      body.assigneeId === null || body.assigneeId === "" ? null : String(body.assigneeId);
    if (locked) nextId = session.user.id;
    if (nextId !== existing.assigneeId) {
      data.assigneeId = nextId;
      if (!nextId) data.assigneeSeenAt = null;
      else if (nextId === session.user.id) data.assigneeSeenAt = new Date();
      else data.assigneeSeenAt = null;
    }
    if (nextId) {
      const assignee = await prisma.user.findFirst({
        where: { id: nextId, familyId },
        select: { id: true },
      });
      if (!assignee) return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
    }
  }

  const tz = session.user.timeZone || DEFAULT_TIME_ZONE;
  const reminderPatch: Record<string, unknown> = {};
  applyReminderFieldsFromBody(reminderPatch, body as Record<string, unknown>, {
    todayAnchorYmd: formatYmdInTimeZone(new Date(), tz),
    previousCadence: existing.reminderCadenceDays ?? null,
    previousAnchor: existing.reminderAnchorYmd ?? null,
  });
  Object.assign(data, reminderPatch);

  const task = await prisma.task.update({
    where: { id },
    data,
    include: taskRelationInclude,
  });

  fireAndForgetNotifyTaskAssigneeChanged({
    actorUserId: userId,
    previousAssigneeId: existing.assigneeId,
    task: { id: task.id, title: task.title, assigneeId: task.assigneeId },
    actorDisplayName: session.user.name,
  });

  let awardedPoints = 0;
  if (body.completed === true && existing.completed === false) {
    awardedPoints = await awardXp({
      familyId,
      userId,
      eventType: "task_completed",
      sourceType: "task",
      sourceId: task.id,
      dedupeKey: `task_completed:task:${task.id}`,
      createdAt: task.completedAt ?? new Date(),
    });
  }

  let newAchievementIds: string[] = [];
  if (body.completed === true && existing.completed === false) {
    const xpNew = await syncFamilyXpUnlocksFromLedger(familyId);
    const memNew = await syncFamilyMemberUnlocks(familyId);
    const statNew = await syncUserStatUnlocks(session.user.id, familyId);
    newAchievementIds = [...xpNew, ...memNew, ...statNew];
  }

  return NextResponse.json({ ...task, awardedPoints, newAchievementIds });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const existing = await prisma.task.findFirst({
    where: { id, ...taskAccessibleWhere(familyId, userId) },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
