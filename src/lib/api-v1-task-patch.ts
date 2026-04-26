import type { Priority } from "@prisma/client";
import { syncFamilyMemberUnlocks, syncUserStatUnlocks } from "@/lib/achievements/evaluate";
import { taskAccessibleWhere, taskBoardVisibleWhere } from "@/lib/family-private-scope";
import { prisma } from "@/lib/prisma";
import { taskRelationInclude } from "@/lib/task-prisma-include";
import { fireAndForgetNotifyTaskAssigneeChanged } from "@/lib/notifications/task-assigned";
import { awardXp, syncFamilyXpUnlocksFromLedger } from "@/lib/xp-ledger";
import { NextResponse } from "next/server";

export async function handleV1TaskPatch(
  familyId: string,
  actorUserId: string,
  taskId: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  if (body.type === "move-task") {
    const canMove = await prisma.task.findFirst({
      where: { id: taskId, ...taskAccessibleWhere(familyId, actorUserId) },
      select: { id: true },
    });
    if (!canMove) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const targetColumn = await prisma.taskColumn.findFirst({
      where: { id: String(body.columnId), board: taskBoardVisibleWhere(familyId, actorUserId) },
      select: { id: true },
    });
    if (!targetColumn) return NextResponse.json({ error: "Column not found" }, { status: 404 });
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { columnId: String(body.columnId), order: Number(body.order) },
      include: taskRelationInclude,
    });
    return NextResponse.json(task);
  }

  const existing = await prisma.task.findFirst({
    where: { id: taskId, ...taskAccessibleWhere(familyId, actorUserId) },
    include: { column: { include: { board: { select: { isPrivate: true } } } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Parameters<typeof prisma.task.update>[0]["data"] = {};
  if (body.title !== undefined) data.title = body.title as string;
  if (body.description !== undefined) data.description = body.description as string | null;
  if (body.priority !== undefined) data.priority = body.priority as Priority;
  if (body.completed !== undefined) {
    data.completed = body.completed as boolean;
    if (body.completed) {
      if (!existing.completed) data.completedAt = new Date();
    } else {
      data.completedAt = null;
    }
  }
  if (body.labels !== undefined) data.labels = body.labels as string[];
  if (body.order !== undefined) data.order = body.order as number;
  if (body.columnId !== undefined) data.columnId = body.columnId as string;
  if (body.columnId !== undefined) {
    const targetColumn = await prisma.taskColumn.findFirst({
      where: { id: body.columnId as string, board: taskBoardVisibleWhere(familyId, actorUserId) },
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
    data.assigneeId = actorUserId;
    data.assigneeSeenAt = new Date();
  } else if (body.isPrivate === false) {
    data.isPrivate = false;
  }
  if (body.assigneeId !== undefined && body.isPrivate !== true) {
    const locked = existing.isPrivate || existing.column.board.isPrivate;
    let nextId =
      body.assigneeId === null || body.assigneeId === "" ? null : String(body.assigneeId);
    if (locked) nextId = actorUserId;
    if (nextId !== existing.assigneeId) {
      data.assigneeId = nextId;
      if (!nextId) data.assigneeSeenAt = null;
      else if (nextId === actorUserId) data.assigneeSeenAt = new Date();
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

  const task = await prisma.task.update({
    where: { id: taskId },
    data,
    include: taskRelationInclude,
  });

  fireAndForgetNotifyTaskAssigneeChanged({
    actorUserId: actorUserId,
    previousAssigneeId: existing.assigneeId,
    task: { id: task.id, title: task.title, assigneeId: task.assigneeId },
    actorDisplayName: null,
  });

  let awardedPoints = 0;
  if (body.completed === true && existing.completed === false) {
    awardedPoints = await awardXp({
      familyId,
      userId: actorUserId,
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
    const statNew = await syncUserStatUnlocks(actorUserId, familyId);
    newAchievementIds = [...xpNew, ...memNew, ...statNew];
  }

  return NextResponse.json({ ...task, awardedPoints, newAchievementIds });
}
