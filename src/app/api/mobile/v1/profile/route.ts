import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { prisma } from "@/lib/prisma";

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { id: true, name: true, email: true, image: true, color: true, emoji: true, familyId: true, onboardingCompletedAt: true },
  });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(user);
});

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const data: { name?: string; emoji?: string; color?: string } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length > 64) return NextResponse.json({ error: "NAME_TOO_LONG" }, { status: 400 });
    data.name = name || null as unknown as string;
  }
  if (typeof body.emoji === "string") {
    data.emoji = body.emoji.trim() || null as unknown as string;
  }
  if (typeof body.color === "string") {
    data.color = body.color.trim() || null as unknown as string;
  }

  const user = await prisma.user.update({
    where: { id: ctx.userId },
    data,
    select: { id: true, name: true, email: true, image: true, color: true, emoji: true, familyId: true, onboardingCompletedAt: true },
  });
  return NextResponse.json(user);
});
