import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { getPastMonthExpenseIncomeSummaries } from "@/lib/budget-past-month-summaries";
import { getNbuExchangeRates, isSupportedCurrency, type SupportedCurrency } from "@/lib/exchange-rates";
import { ensureUserFamily } from "@/lib/family";
import {
  calendarMonthRangeUtcFromYm,
  calendarYmdMinusDays,
  DEFAULT_TIME_ZONE,
  formatYmdInTimeZone,
  utcRangeFromCalendarYmd,
} from "@/lib/calendar-tz";
import { prisma } from "@/lib/prisma";
import { SubscriptionBillingCycle } from "@prisma/client";
import BudgetView from "@/components/budget/BudgetView";

export default async function BudgetPage() {
  const session = await auth();
  if (!session) return null;
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return null;

  const calendarTz = session.user.timeZone || DEFAULT_TIME_ZONE;
  const displayCurrencyRaw = String(session.user.displayCurrency || "USD").toUpperCase();
  const displayCurrency: SupportedCurrency = isSupportedCurrency(displayCurrencyRaw) ? displayCurrencyRaw : "USD";

  const now = new Date();
  const currentYm = formatInTimeZone(now, calendarTz, "yyyy-MM");
  const { start: monthStart, end: monthEnd } = calendarMonthRangeUtcFromYm(currentYm, calendarTz);
  const expenseWindowEndYmd = formatYmdInTimeZone(now, calendarTz);
  const expenseWindowStartYmd = calendarYmdMinusDays(expenseWindowEndYmd, 3, calendarTz);
  const { start: expenseListStart, end: expenseListEnd } = utcRangeFromCalendarYmd(
    expenseWindowStartYmd,
    expenseWindowEndYmd,
    calendarTz
  );

  const [
    categories,
    expenseMonthAgg,
    expenseCategoryGroup,
    expensesMonthCount,
    expenses,
    incomes,
    subscriptions,
    exchangeRates,
    credits,
    pastMonthSummaries,
  ] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: { familyId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.expense.aggregate({
      where: { familyId, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        familyId,
        date: { gte: monthStart, lte: monthEnd },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.expense.count({
      where: { familyId, date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.expense.findMany({
      where: { familyId, date: { gte: expenseListStart, lte: expenseListEnd } },
      include: {
        category: true,
        user: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.income.findMany({
      where: { familyId, date: { gte: monthStart, lte: monthEnd } },
      include: {
        user: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.familySubscription.findMany({
      where: {
        familyId,
        status: "ACTIVE",
      },
      select: {
        amount: true,
        currency: true,
        billingCycle: true,
      },
    }),
    getNbuExchangeRates(),
    prisma.credit.findMany({
      where: { familyId },
      orderBy: [{ status: "asc" }, { paymentDay: "asc" }, { createdAt: "desc" }],
    }),
    getPastMonthExpenseIncomeSummaries(familyId, calendarTz, 12),
  ]);

  const initialExpenses = expenses.map((e) => ({
    id: e.id,
    title: e.title,
    amount: e.amount,
    date: e.date.toISOString(),
    note: e.note,
    category: e.category,
    user: e.user,
  }));

  const initialIncomes = incomes.map((i) => ({
    id: i.id,
    title: i.title,
    amount: i.amount,
    date: i.date.toISOString(),
    note: i.note,
    user: i.user,
  }));

  const expensesMonthTotal = expenseMonthAgg._sum.amount ?? 0;
  const categorySpent: Record<string, number> = {};
  for (const row of expenseCategoryGroup) {
    if (row.categoryId) categorySpent[row.categoryId] = row._sum.amount ?? 0;
  }

  const initialCredits = credits.map((c) => ({
    id: c.id,
    title: c.title,
    bank: c.bank,
    bankOtherName: c.bankOtherName,
    monthlyAmount: c.monthlyAmount,
    paymentDay: c.paymentDay,
    lastPaidAt: c.lastPaidAt ? c.lastPaidAt.toISOString() : null,
    status: c.status,
    note: c.note,
  }));

  const monthlyCreditsTotal = credits
    .filter((c) => c.status === "ACTIVE")
    .reduce((sum, c) => sum + c.monthlyAmount, 0);
  const monthlySubscriptionsTotal = subscriptions.reduce((sum, item) => {
    const monthlyAmount =
      item.billingCycle === SubscriptionBillingCycle.YEARLY ? item.amount / 12 : item.amount;
    const rate = exchangeRates[item.currency as keyof typeof exchangeRates] ?? 1;
    return sum + monthlyAmount * rate;
  }, 0);

  return (
    <BudgetView
      initialCategories={categories}
      initialExpenses={initialExpenses}
      expensesMonthTotal={expensesMonthTotal}
      expensesMonthCount={expensesMonthCount}
      initialCategorySpent={categorySpent}
      initialExpenseWindowStartYmd={expenseWindowStartYmd}
      initialIncomes={initialIncomes}
      pastMonthSummaries={pastMonthSummaries}
      initialCredits={initialCredits}
      monthlySubscriptionsTotal={monthlySubscriptionsTotal}
      monthlySubscriptionsCount={subscriptions.length}
      monthlyCreditsTotal={monthlyCreditsTotal}
      monthlyCreditsCount={credits.filter((c) => c.status === "ACTIVE").length}
      currentUserId={session.user.id}
      calendarTimeZone={calendarTz}
      displayCurrency={displayCurrency}
      exchangeRates={exchangeRates}
    />
  );
}
