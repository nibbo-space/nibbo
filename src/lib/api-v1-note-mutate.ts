import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function handleV1NotePatch(
  familyId: string,
  noteId: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  const existing = await prisma.note.findFirst({ where: { id: noteId, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.categoryId) {
    const category = await prisma.noteCategory.findFirst({
      where: { id: body.categoryId, familyId },
      select: { id: true },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const note = await prisma.note.update({
    where: { id: noteId },
    data: {
      title: body.title as string | undefined,
      content: body.content as string | undefined,
      emoji: body.emoji as string | undefined,
      color: body.color as string | undefined,
      pinned: body.pinned as boolean | undefined,
      categoryId: body.categoryId === undefined ? undefined : (body.categoryId as string) || null,
      tags: body.tags as string[] | undefined,
    },
    include: {
      author: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      category: { select: { id: true, name: true, emoji: true, color: true, parentId: true } },
    },
  });

  return NextResponse.json(note);
}

export async function handleV1NoteDelete(familyId: string, noteId: string): Promise<NextResponse> {
  const existing = await prisma.note.findFirst({ where: { id: noteId, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.note.delete({ where: { id: noteId } });
  return NextResponse.json({ success: true });
}
