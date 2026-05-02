import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { taskBoardVisibleWhere } from "@/lib/family-private-scope";
import { prisma } from "@/lib/prisma";

const BOARD_SELECT = {
  id: true,
  name: true,
  emoji: true,
  color: true,
  columns: {
    orderBy: { order: "asc" as const },
    select: { id: true, name: true, emoji: true, color: true },
  },
};

export const GET = withMobileAuth(async (_req, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ boards: [] });

  const boards = await prisma.taskBoard.findMany({
    where: taskBoardVisibleWhere(familyId, ctx.userId),
    orderBy: { order: "asc" },
    select: BOARD_SELECT,
  });

  return NextResponse.json({ boards });
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

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });

  const maxOrder = await prisma.taskBoard.aggregate({
    _max: { order: true },
    where: taskBoardVisibleWhere(familyId, ctx.userId),
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const board = await prisma.taskBoard.create({
    data: {
      name,
      emoji: String(body.emoji ?? "📋"),
      color: String(body.color ?? "#f43f5e"),
      order,
      familyId,
      isPrivate: false,
    },
    select: BOARD_SELECT,
  });

  return NextResponse.json(board, { status: 201 });
});
