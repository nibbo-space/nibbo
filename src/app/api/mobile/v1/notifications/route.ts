import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

function notificationWhere(userId: string, familyId: string) {
  return {
    assigneeId: userId,
    assigneeSeenAt: null,
    creatorId: { not: userId },
    completed: false,
    column: { board: { familyId } },
  };
}

export const GET = withMobileAuth(async (_req, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const where = notificationWhere(ctx.userId, familyId);
  const [count, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, emoji: true } },
        column: { select: { name: true, board: { select: { id: true, name: true, emoji: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    count,
    items: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      boardId: t.column.board.id,
      boardName: t.column.board.name,
      boardEmoji: t.column.board.emoji,
      columnName: t.column.name,
      creatorId: t.creator.id,
      creatorName: t.creator.name,
      creatorEmoji: t.creator.emoji,
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
});

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (body.markAll === true) {
    await prisma.task.updateMany({
      where: notificationWhere(ctx.userId, familyId),
      data: { assigneeSeenAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  const taskId = String(body.taskId || "").trim();
  if (!taskId) return NextResponse.json({ error: "TASK_ID_REQUIRED" }, { status: 400 });

  const updated = await prisma.task.updateMany({
    where: { id: taskId, assigneeId: ctx.userId, column: { board: { familyId } } },
    data: { assigneeSeenAt: new Date() },
  });
  if (updated.count === 0) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ success: true });
});
