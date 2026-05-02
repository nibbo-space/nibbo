import { auth } from "@/lib/auth";
import { taskBoardVisibleWhere } from "@/lib/family-private-scope";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { boardFullIncludeFor, columnWithTasksIncludeFor, taskRelationInclude } from "@/lib/task-prisma-include";
import { fireAndForgetNotifyTaskAssigneeChanged } from "@/lib/notifications/task-assigned";
import { DEFAULT_TIME_ZONE, formatYmdInTimeZone } from "@/lib/calendar-tz";
import { reminderFieldsForCreate } from "@/lib/task-reminder-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const boards = await prisma.taskBoard.findMany({
    where: taskBoardVisibleWhere(familyId, userId),
    include: boardFullIncludeFor(userId),
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(boards);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();

  if (body.type === "board") {
    const isPrivate = Boolean(body.isPrivate);
    const maxOrder = await prisma.taskBoard.aggregate({
      _max: { order: true },
      where: taskBoardVisibleWhere(familyId, userId),
    });
    const order = (maxOrder._max.order ?? -1) + 1;
    const board = await prisma.taskBoard.create({
      data: {
        name: body.name,
        description: body.description,
        emoji: body.emoji || "board",
        color: body.color || "#f43f5e",
        order,
        familyId,
        isPrivate,
        ownerUserId: isPrivate ? userId : null,
      },
      include: boardFullIncludeFor(userId),
    });
    return NextResponse.json(board);
  }

  if (body.type === "column") {
    const board = await prisma.taskBoard.findFirst({
      where: { id: body.boardId, ...taskBoardVisibleWhere(familyId, userId) },
      select: { id: true },
    });
    if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });
    const column = await prisma.taskColumn.create({
      data: {
        name: body.name,
        emoji: body.emoji || "📋",
        color: body.color || "#e7e5e4",
        boardId: body.boardId,
        order: body.order ?? 0,
      },
      include: columnWithTasksIncludeFor(userId),
    });
    return NextResponse.json(column);
  }

  if (body.type === "task") {
    const column = await prisma.taskColumn.findFirst({
      where: { id: body.columnId, board: taskBoardVisibleWhere(familyId, userId) },
      select: { id: true, board: { select: { isPrivate: true } } },
    });
    if (!column) return NextResponse.json({ error: "Column not found" }, { status: 404 });
    const taskIsPrivate = Boolean(body.isPrivate);
    let assigneeId = body.assigneeId || undefined;
    if (column.board.isPrivate || taskIsPrivate) {
      assigneeId = userId;
    }
    if (assigneeId) {
      const assignee = await prisma.user.findFirst({ where: { id: assigneeId, familyId }, select: { id: true } });
      if (!assignee) return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
    }
    const assigneeSeenAt =
      assigneeId && assigneeId !== session.user.id ? null : assigneeId ? new Date() : null;

    const tz = session.user.timeZone || DEFAULT_TIME_ZONE;
    const reminderExtra =
      reminderFieldsForCreate(body as Record<string, unknown>, formatYmdInTimeZone(new Date(), tz)) ?? {};

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority || "MEDIUM",
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        columnId: body.columnId,
        assigneeId,
        assigneeSeenAt,
        creatorId: session.user.id,
        isPrivate: taskIsPrivate,
        labels: body.labels || [],
        order: body.order || 0,
        ...reminderExtra,
      },
      include: taskRelationInclude,
    });
    fireAndForgetNotifyTaskAssigneeChanged({
      actorUserId: userId,
      previousAssigneeId: null,
      task: { id: task.id, title: task.title, assigneeId: task.assigneeId },
      actorDisplayName: session.user.name,
    });
    return NextResponse.json(task);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
