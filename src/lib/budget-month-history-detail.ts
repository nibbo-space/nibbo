import { calendarMonthRangeUtcFromYm } from "@/lib/calendar-tz";
import { prisma } from "@/lib/prisma";

const YM = /^\d{4}-\d{2}$/;

export type BudgetHistoryExpenseRow = {
  id: string;
  title: string;
  amount: number;
  date: string;
  note: string | null;
  category: {
    id: string;
    name: string;
    emoji: string;
    color: string;
    budget: number | null;
    sortOrder: number;
  } | null;
  user: { id: string; name: string | null; image: string | null; color: string; emoji: string };
};

export type BudgetHistoryIncomeRow = {
  id: string;
  title: string;
  amount: number;
  date: string;
  note: string | null;
  user: { id: string; name: string | null; image: string | null; color: string; emoji: string };
};

export type BudgetMonthHistoryDetail = {
  ym: string;
  expenseTotal: number;
  expenseCount: number;
  incomeTotal: number;
  categorySpent: Record<string, number>;
  uncategorizedSpent: number;
  expenses: BudgetHistoryExpenseRow[];
  incomes: BudgetHistoryIncomeRow[];
};

const userSelect = { id: true, name: true, image: true, color: true, emoji: true } as const;

export async function getBudgetMonthHistoryDetail(
  familyId: string,
  timeZone: string,
  ym: string
): Promise<BudgetMonthHistoryDetail | null> {
  if (!YM.test(ym)) return null;
  const { start, end } = calendarMonthRangeUtcFromYm(ym, timeZone);
  const [expenseAgg, expenseCount, incomeAgg, groupRows, expenseRows, incomeRows] = await Promise.all([
    prisma.expense.aggregate({
      where: { familyId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.expense.count({ where: { familyId, date: { gte: start, lte: end } } }),
    prisma.income.aggregate({
      where: { familyId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { familyId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: { familyId, date: { gte: start, lte: end } },
      include: {
        category: true,
        user: { select: userSelect },
      },
      orderBy: { date: "desc" },
    }),
    prisma.income.findMany({
      where: { familyId, date: { gte: start, lte: end } },
      include: { user: { select: userSelect } },
      orderBy: { date: "desc" },
    }),
  ]);

  const categorySpent: Record<string, number> = {};
  let uncategorizedSpent = 0;
  for (const row of groupRows) {
    const sum = row._sum.amount ?? 0;
    if (row.categoryId) categorySpent[row.categoryId] = sum;
    else uncategorizedSpent += sum;
  }

  const expenses: BudgetHistoryExpenseRow[] = expenseRows.map((e) => ({
    id: e.id,
    title: e.title,
    amount: e.amount,
    date: e.date.toISOString(),
    note: e.note,
    category: e.category,
    user: e.user,
  }));

  const incomes: BudgetHistoryIncomeRow[] = incomeRows.map((i) => ({
    id: i.id,
    title: i.title,
    amount: i.amount,
    date: i.date.toISOString(),
    note: i.note,
    user: i.user,
  }));

  return {
    ym,
    expenseTotal: expenseAgg._sum.amount ?? 0,
    expenseCount,
    incomeTotal: incomeAgg._sum.amount ?? 0,
    categorySpent,
    uncategorizedSpent,
    expenses,
    incomes,
  };
}
