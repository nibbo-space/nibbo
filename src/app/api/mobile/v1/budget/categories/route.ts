import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

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

  const maxOrder = await prisma.expenseCategory.aggregate({
    _max: { sortOrder: true },
    where: { familyId },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const category = await prisma.expenseCategory.create({
    data: {
      name,
      emoji: String(body.emoji ?? "💰"),
      color: String(body.color ?? "#4ade80"),
      familyId,
      sortOrder,
    },
    select: { id: true, name: true, emoji: true, color: true, budget: true },
  });

  return NextResponse.json(category, { status: 201 });
});
