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
  const existing = await prisma.note.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.categoryId) {
    const category = await prisma.noteCategory.findFirst({
      where: { id: body.categoryId, familyId },
      select: { id: true },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const note = await prisma.note.update({
    where: { id },
    data: {
      title: body.title,
      content: body.content,
      emoji: body.emoji,
      color: body.color,
      pinned: body.pinned,
      categoryId: body.categoryId === undefined ? undefined : body.categoryId || null,
      tags: body.tags,
    },
    include: {
      author: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      category: { select: { id: true, name: true, emoji: true, color: true, parentId: true } },
    },
  });

  return NextResponse.json(note);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.note.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
