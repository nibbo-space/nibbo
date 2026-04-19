import { auth } from "@/lib/auth";
import { taskBoardVisibleWhere } from "@/lib/family-private-scope";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { boardFullIncludeFor } from "@/lib/task-prisma-include";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const body = await req.json();
  const exists = await prisma.taskBoard.findFirst({
    where: { id, ...taskBoardVisibleWhere(familyId, userId) },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Parameters<typeof prisma.taskBoard.update>[0]["data"] = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.emoji !== undefined) data.emoji = body.emoji;
  if (body.color !== undefined) data.color = body.color;
  if (body.description !== undefined) data.description = body.description;
  if (typeof body.order === "number") data.order = body.order;
  if (body.isPrivate === true) {
    data.isPrivate = true;
    data.ownerUserId = userId;
  } else if (body.isPrivate === false) {
    data.isPrivate = false;
    data.ownerUserId = null;
  }

  const board = await prisma.taskBoard.update({
    where: { id },
    data,
    include: boardFullIncludeFor(userId),
  });

  return NextResponse.json(board);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const exists = await prisma.taskBoard.findFirst({
    where: { id, ...taskBoardVisibleWhere(familyId, userId) },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.taskBoard.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
