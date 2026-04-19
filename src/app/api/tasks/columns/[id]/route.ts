import { auth } from "@/lib/auth";
import { taskBoardVisibleWhere } from "@/lib/family-private-scope";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { columnWithTasksIncludeFor } from "@/lib/task-prisma-include";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const body = await req.json();
  const exists = await prisma.taskColumn.findFirst({
    where: { id, board: taskBoardVisibleWhere(familyId, userId) },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const column = await prisma.taskColumn.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.emoji !== undefined && { emoji: body.emoji }),
      ...(body.color !== undefined && { color: body.color }),
      ...(typeof body.order === "number" && { order: body.order }),
    },
    include: columnWithTasksIncludeFor(userId),
  });

  return NextResponse.json(column);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const exists = await prisma.taskColumn.findFirst({
    where: { id, board: taskBoardVisibleWhere(familyId, userId) },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.taskColumn.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
