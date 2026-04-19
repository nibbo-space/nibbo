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
  const ids = body.orderedBoardIds as string[] | undefined;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "orderedBoardIds required" }, { status: 400 });
  }

  const boards = await prisma.taskBoard.findMany({
    where: {
      id: { in: ids },
      ...taskBoardVisibleWhere(familyId, userId),
    },
    select: { id: true },
  });
  if (boards.length !== ids.length) {
    return NextResponse.json({ error: "Invalid board set" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((boardId, index) =>
      prisma.taskBoard.update({
        where: { id: boardId },
        data: { order: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
