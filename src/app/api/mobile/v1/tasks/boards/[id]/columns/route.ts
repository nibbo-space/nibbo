import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { taskBoardVisibleWhere } from "@/lib/family-private-scope";
import { prisma } from "@/lib/prisma";

export const POST = withMobileAuth(async (req: NextRequest, ctx, { params }) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const boardId = (await params).id as string;
  const board = await prisma.taskBoard.findFirst({
    where: { id: boardId, ...taskBoardVisibleWhere(familyId, ctx.userId) },
    select: { id: true },
  });
  if (!board) return NextResponse.json({ error: "BOARD_NOT_FOUND" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });

  const maxOrder = await prisma.taskColumn.aggregate({
    _max: { order: true },
    where: { boardId },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const column = await prisma.taskColumn.create({
    data: {
      name,
      emoji: String(body.emoji ?? "📋"),
      color: String(body.color ?? "#e7e5e4"),
      boardId,
      order,
    },
    select: { id: true, name: true, emoji: true, color: true },
  });

  return NextResponse.json(column, { status: 201 });
});
