import { NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { taskBoardVisibleWhere } from "@/lib/family-private-scope";
import { prisma } from "@/lib/prisma";

export const GET = withMobileAuth(async (_req, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) {
    return NextResponse.json({ boards: [] });
  }

  const boards = await prisma.taskBoard.findMany({
    where: taskBoardVisibleWhere(familyId, ctx.userId),
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      emoji: true,
      color: true,
      columns: {
        orderBy: { order: "asc" },
        select: { id: true, name: true, emoji: true, color: true },
      },
    },
  });

  return NextResponse.json({ boards });
});
