import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await prisma.note.findMany({
    where: { familyId },
    include: {
      author: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      category: { select: { id: true, name: true, emoji: true, color: true, parentId: true } },
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (body.categoryId) {
    const category = await prisma.noteCategory.findFirst({
      where: { id: body.categoryId, familyId },
      select: { id: true },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const note = await prisma.note.create({
    data: {
      title: body.title,
      content: body.content,
      emoji: body.emoji || "note",
      color: body.color || "#faf3e0",
      pinned: body.pinned || false,
      authorId: session.user.id,
      familyId,
      categoryId: body.categoryId || null,
      tags: body.tags || [],
    },
    include: {
      author: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      category: { select: { id: true, name: true, emoji: true, color: true, parentId: true } },
    },
  });

  return NextResponse.json(note);
}
