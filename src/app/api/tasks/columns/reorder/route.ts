import { auth } from "@/lib/auth";
import { taskBoardVisibleWhere } from "@/lib/family-private-scope";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const boardId = body.boardId as string | undefined;
  const ids = body.orderedColumnIds as string[] | undefined;
  if (!boardId || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "boardId and orderedColumnIds required" }, { status: 400 });
  }

  const columns = await prisma.taskColumn.findMany({
    where: { boardId, board: taskBoardVisibleWhere(familyId, userId) },
    select: { id: true },
  });
  const allowed = new Set(columns.map((c) => c.id));
  if (!ids.every((i) => allowed.has(i)) || ids.length !== allowed.size) {
    return NextResponse.json({ error: "Invalid column set" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((columnId, index) =>
      prisma.taskColumn.update({
        where: { id: columnId },
        data: { order: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
