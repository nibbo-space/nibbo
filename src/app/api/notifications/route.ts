import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const notificationWhere = (userId: string, familyId: string) => ({
  assigneeId: userId,
  assigneeSeenAt: null,
  creatorId: { not: userId },
  completed: false,
  column: { board: { familyId } },
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = notificationWhere(session.user.id, familyId);
  const [count, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: {
        creator: { select: { name: true, emoji: true } },
        column: {
          select: {
            name: true,
            board: { select: { id: true, name: true, emoji: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const items = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    boardId: t.column.board.id,
    boardName: t.column.board.name,
    boardEmoji: t.column.board.emoji,
    columnName: t.column.name,
    creatorName: t.creator.name,
    creatorEmoji: t.creator.emoji,
    updatedAt: t.updatedAt.toISOString(),
  }));

  return NextResponse.json({ items, count });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.markAll === true) {
    await prisma.task.updateMany({
      where: notificationWhere(session.user.id, familyId),
      data: { assigneeSeenAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  const taskId = typeof body.taskId === "string" ? body.taskId : null;
  if (!taskId) {
    return NextResponse.json({ error: "taskId or markAll required" }, { status: 400 });
  }

  const result = await prisma.task.updateMany({
    where: {
      id: taskId,
      assigneeId: session.user.id,
      column: { board: { familyId } },
    },
    data: { assigneeSeenAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
