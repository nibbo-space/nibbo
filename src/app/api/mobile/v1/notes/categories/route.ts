import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export const GET = withMobileAuth(async (_req, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ items: [] });

  const categories = await prisma.noteCategory.findMany({
    where: { familyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, emoji: true, color: true },
  });

  return NextResponse.json({ items: categories });
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

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });

  const category = await prisma.noteCategory.create({
    data: {
      name,
      emoji: String(body.emoji ?? "📂"),
      color: String(body.color ?? "#f5f3ff"),
      familyId,
    },
    select: { id: true, name: true, emoji: true, color: true },
  });

  return NextResponse.json(category, { status: 201 });
});
