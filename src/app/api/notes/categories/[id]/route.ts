import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const existing = await prisma.noteCategory.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.parentId) {
    const parent = await prisma.noteCategory.findFirst({
      where: { id: body.parentId, familyId },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });
  }

  const category = await prisma.noteCategory.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name || "").trim() || "Категорія" }),
      ...(body.emoji !== undefined && { emoji: body.emoji || "category" }),
      ...(body.color !== undefined && { color: body.color || "#f5f3ff" }),
      ...(body.parentId !== undefined && { parentId: body.parentId || null }),
    },
  });
  return NextResponse.json(category);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const categories = await prisma.noteCategory.findMany({
    where: { familyId },
    select: { id: true, parentId: true },
  });
  const categoryIds = new Set(categories.map((c) => c.id));
  if (!categoryIds.has(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const childrenMap = new Map<string, string[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    if (!childrenMap.has(c.parentId)) childrenMap.set(c.parentId, []);
    childrenMap.get(c.parentId)!.push(c.id);
  }

  const stack = [id];
  const toDelete: string[] = [];
  while (stack.length) {
    const cur = stack.pop()!;
    toDelete.push(cur);
    const kids = childrenMap.get(cur) || [];
    for (const k of kids) stack.push(k);
  }

  await prisma.$transaction([
    prisma.note.updateMany({
      where: { familyId, categoryId: { in: toDelete } },
      data: { categoryId: null },
    }),
    prisma.noteCategory.deleteMany({ where: { familyId, id: { in: toDelete } } }),
  ]);

  return NextResponse.json({ success: true });
}
