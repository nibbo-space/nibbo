import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBudgetMonthHistoryDetail } from "@/lib/budget-month-history-detail";
import BudgetHistoryView from "@/components/budget/BudgetHistoryView";
import { DEFAULT_TIME_ZONE, shiftCalendarYm } from "@/lib/calendar-tz";
import { ensureUserFamily } from "@/lib/family";
import { getNbuExchangeRates, isSupportedCurrency, type SupportedCurrency } from "@/lib/exchange-rates";
import { prisma } from "@/lib/prisma";

export default async function BudgetHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return null;

  const calendarTz = session.user.timeZone || DEFAULT_TIME_ZONE;
  const displayCurrencyRaw = String(session.user.displayCurrency || "USD").toUpperCase();
  const displayCurrency: SupportedCurrency = isSupportedCurrency(displayCurrencyRaw) ? displayCurrencyRaw : "USD";

  const params = await searchParams;
  const now = new Date();
  const currentYm = formatInTimeZone(now, calendarTz, "yyyy-MM");
  const monthChoices = Array.from({ length: 13 }, (_, i) => shiftCalendarYm(currentYm, -i));
  const rawYm = typeof params.ym === "string" ? params.ym.trim() : "";
  const defaultYm = shiftCalendarYm(currentYm, -1);
  const selectedYm = monthChoices.includes(rawYm) ? rawYm : defaultYm;

  const [categories, detail, exchangeRates] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: { familyId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    getBudgetMonthHistoryDetail(familyId, calendarTz, selectedYm),
    getNbuExchangeRates(),
  ]);

  if (!detail) notFound();

  return (
    <BudgetHistoryView
      monthChoices={monthChoices}
      selectedYm={selectedYm}
      detail={detail}
      categories={categories}
      calendarTimeZone={calendarTz}
      displayCurrency={displayCurrency}
      exchangeRates={exchangeRates}
    />
  );
}
