import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const notes = await prisma.note.findMany({
    where: { familyId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      content: true,
      emoji: true,
      color: true,
      pinned: true,
      authorId: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true, emoji: true } },
      category: { select: { id: true, name: true, emoji: true } },
    },
  });

  return NextResponse.json({ items: notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() })) });
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

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "TITLE_REQUIRED" }, { status: 400 });

  const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : undefined;

  const note = await prisma.note.create({
    data: {
      title,
      content: String(body.content ?? ""),
      emoji: String(body.emoji ?? "📓"),
      color: String(body.color ?? "#faf3e0"),
      pinned: Boolean(body.pinned),
      authorId: ctx.userId,
      familyId,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      ...(categoryId ? { categoryId } : {}),
    },
    select: {
      id: true, title: true, content: true, emoji: true, color: true,
      pinned: true, authorId: true, tags: true, createdAt: true, updatedAt: true,
      author: { select: { id: true, name: true, emoji: true } },
      category: { select: { id: true, name: true, emoji: true } },
    },
  });

  return NextResponse.json({ ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() }, { status: 201 });
});
