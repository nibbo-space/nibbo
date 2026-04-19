import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "categories") {
    const categories = await prisma.expenseCategory.findMany({
      where: { familyId },
      include: { expenses: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(categories);
  }

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: {
        familyId,
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: {
        category: true,
        user: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.income.findMany({
      where: {
        familyId,
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: {
        user: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  return NextResponse.json({ expenses, incomes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.type === "category") {
    const agg = await prisma.expenseCategory.aggregate({
      where: { familyId },
      _max: { sortOrder: true },
    });
    const nextOrder = (agg._max.sortOrder ?? -1) + 1;
    const category = await prisma.expenseCategory.create({
      data: {
        name: body.name,
        emoji: body.emoji || "💳",
        color: body.color || "#4ade80",
        budget: body.budget,
        familyId,
        sortOrder: nextOrder,
      },
    });
    return NextResponse.json(category);
  }

  if (body.type === "income") {
    const income = await prisma.income.create({
      data: {
        title: body.title,
        amount: body.amount,
        date: body.date ? new Date(body.date) : new Date(),
        userId: session.user.id,
        familyId,
        note: body.note,
      },
      include: {
        user: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      },
    });
    return NextResponse.json(income);
  }

  if (body.categoryId) {
    const category = await prisma.expenseCategory.findFirst({
      where: { id: body.categoryId, familyId },
      select: { id: true },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const expense = await prisma.expense.create({
    data: {
      title: body.title,
      amount: body.amount,
      date: body.date ? new Date(body.date) : new Date(),
      categoryId: body.categoryId || undefined,
      userId: session.user.id,
      familyId,
      note: body.note,
    },
    include: {
      category: true,
      user: { select: { id: true, name: true, image: true, color: true, emoji: true } },
    },
  });

  return NextResponse.json(expense);
}
