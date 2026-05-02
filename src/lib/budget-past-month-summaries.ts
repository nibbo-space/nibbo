import { formatInTimeZone } from "date-fns-tz";
import { calendarMonthRangeUtcFromYm, shiftCalendarYm } from "@/lib/calendar-tz";
import { prisma } from "@/lib/prisma";

export type PastMonthExpenseIncomeSummary = {
  ym: string;
  expenseTotal: number;
  expenseCount: number;
  incomeTotal: number;
};

export async function getPastMonthExpenseIncomeSummaries(
  familyId: string,
  timeZone: string,
  limit = 12
): Promise<PastMonthExpenseIncomeSummary[]> {
  const currentYm = formatInTimeZone(new Date(), timeZone, "yyyy-MM");
  const yms: string[] = [];
  for (let i = 1; i <= limit; i++) {
    yms.push(shiftCalendarYm(currentYm, -i));
  }
  const rows = await Promise.all(
    yms.map(async (ym) => {
      const { start, end } = calendarMonthRangeUtcFromYm(ym, timeZone);
      const where = { familyId, date: { gte: start, lte: end } };
      const [expAgg, expenseCount, incAgg] = await Promise.all([
        prisma.expense.aggregate({ where, _sum: { amount: true } }),
        prisma.expense.count({ where }),
        prisma.income.aggregate({ where, _sum: { amount: true } }),
      ]);
      return {
        ym,
        expenseTotal: expAgg._sum.amount ?? 0,
        expenseCount,
        incomeTotal: incAgg._sum.amount ?? 0,
      };
    })
  );
  return rows;
}
