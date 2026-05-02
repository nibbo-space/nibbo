import { NextRequest, NextResponse } from "next/server";
import { withMobileAuthParams } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export const PATCH = withMobileAuthParams<{ id: string }>(async (req, { id }, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await prisma.expense.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (body.amount != null) {
    const amount = Number(body.amount);
    if (!isNaN(amount) && amount > 0) data.amount = amount;
  }
  if (typeof body.note === "string") data.note = body.note;
  if (body.date) data.date = new Date(String(body.date));
  if (body.categoryId !== undefined) data.categoryId = body.categoryId ? String(body.categoryId) : null;

  const expense = await prisma.expense.update({
    where: { id },
    data,
    select: {
      id: true, title: true, amount: true, date: true, note: true, userId: true,
      category: { select: { id: true, name: true, emoji: true, color: true } },
    },
  });

  return NextResponse.json({ ...expense, date: expense.date.toISOString() });
});

export const DELETE = withMobileAuthParams<{ id: string }>(async (_req, { id }, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await prisma.expense.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
