import { NextRequest, NextResponse } from "next/server";
import { withMobileAuthParams } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export const GET = withMobileAuthParams<{ id: string }>(async (_req, { id }, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const note = await prisma.note.findFirst({
    where: { id, familyId },
    select: {
      id: true, title: true, content: true, emoji: true, color: true,
      pinned: true, authorId: true, tags: true, createdAt: true, updatedAt: true,
      author: { select: { id: true, name: true, emoji: true } },
      category: { select: { id: true, name: true, emoji: true } },
    },
  });
  if (!note) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() });
});

export const PATCH = withMobileAuthParams<{ id: string }>(async (req, { id }, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await prisma.note.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.content === "string") data.content = body.content;
  if (typeof body.emoji === "string") data.emoji = body.emoji;
  if (typeof body.color === "string") data.color = body.color;
  if (typeof body.pinned === "boolean") data.pinned = body.pinned;
  if (Array.isArray(body.tags)) data.tags = body.tags.map(String);

  const note = await prisma.note.update({
    where: { id },
    data,
    select: {
      id: true, title: true, content: true, emoji: true, color: true,
      pinned: true, authorId: true, tags: true, createdAt: true, updatedAt: true,
    },
  });
  return NextResponse.json({ ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() });
});

export const DELETE = withMobileAuthParams<{ id: string }>(async (_req, { id }, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await prisma.note.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
