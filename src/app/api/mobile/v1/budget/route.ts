import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  const dateFilter = fromParam || toParam ? {
    date: {
      ...(fromParam ? { gte: new Date(fromParam) } : {}),
      ...(toParam ? { lte: new Date(toParam) } : {}),
    },
  } : {};

  const [expenses, categories] = await Promise.all([
    prisma.expense.findMany({
      where: { familyId, ...dateFilter },
      orderBy: { date: "desc" },
      take: 100,
      select: {
        id: true, title: true, amount: true, date: true, note: true, userId: true,
        category: { select: { id: true, name: true, emoji: true, color: true } },
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.expenseCategory.findMany({
      where: { familyId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, emoji: true, color: true, budget: true },
    }),
  ]);

  return NextResponse.json({
    expenses: expenses.map((e) => ({ ...e, date: e.date.toISOString() })),
    categories,
  });
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

  const amount = Number(body.amount);
  if (isNaN(amount) || amount <= 0) return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 });

  const expense = await prisma.expense.create({
    data: {
      title,
      amount,
      date: body.date ? new Date(String(body.date)) : new Date(),
      note: body.note ? String(body.note) : null,
      categoryId: body.categoryId ? String(body.categoryId) : null,
      userId: ctx.userId,
      familyId,
    },
    select: {
      id: true, title: true, amount: true, date: true, note: true, userId: true,
      category: { select: { id: true, name: true, emoji: true, color: true } },
    },
  });

  return NextResponse.json({ ...expense, date: expense.date.toISOString() }, { status: 201 });
});
