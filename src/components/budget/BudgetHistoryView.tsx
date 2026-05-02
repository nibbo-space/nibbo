"use client";

import { useCallback, useMemo } from "react";
import { enUS, ja as jaDf, uk as ukDf } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarRange, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ExchangeRates, SupportedCurrency } from "@/lib/exchange-rates";
import { uahToDisplayAmount } from "@/lib/exchange-rates";
import { utcRangeFromCalendarYmd } from "@/lib/calendar-tz";
import type { BudgetHistoryExpenseRow, BudgetMonthHistoryDetail } from "@/lib/budget-month-history-detail";
import { displayEmojiToken, formatCurrency, formatDate } from "@/lib/utils";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { intlLocaleForUi, messageLocale, I18N } from "@/lib/i18n";

interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  budget: number | null;
  sortOrder: number;
}

function cmpCategory(a: Category, b: Category) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

const CAT_FALLBACK = "💳";

export default function BudgetHistoryView({
  monthChoices,
  selectedYm,
  detail,
  categories,
  calendarTimeZone,
  displayCurrency,
  exchangeRates,
}: {
  monthChoices: string[];
  selectedYm: string;
  detail: BudgetMonthHistoryDetail;
  categories: Category[];
  calendarTimeZone: string;
  displayCurrency: SupportedCurrency;
  exchangeRates: ExchangeRates;
}) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].budget;
  const router = useRouter();
  const intlLoc = intlLocaleForUi(language);
  const dateFmtOpts = { timeZone: calendarTimeZone, locale: intlLoc } as const;
  const formatUah = useCallback(
    (uah: number) => {
      const v = uahToDisplayAmount(uah, displayCurrency, exchangeRates);
      return formatCurrency(v, displayCurrency, intlLoc);
    },
    [displayCurrency, exchangeRates, intlLoc]
  );

  const dateFnsMonthLocale = useMemo(() => {
    const m = messageLocale(language);
    return m === "uk" ? ukDf : m === "ja" ? jaDf : enUS;
  }, [language]);

  const formatMonthLabel = useCallback(
    (ym: string) => {
      const { start } = utcRangeFromCalendarYmd(`${ym}-15`, `${ym}-15`, calendarTimeZone);
      return formatInTimeZone(start, calendarTimeZone, "LLLL yyyy", { locale: dateFnsMonthLocale });
    },
    [calendarTimeZone, dateFnsMonthLocale]
  );

  const net = detail.incomeTotal - detail.expenseTotal;
  const sortedCategories = useMemo(() => [...categories].sort(cmpCategory), [categories]);
  const byCategory = useMemo(
    () =>
      sortedCategories.map((cat) => ({
        ...cat,
        spent: detail.categorySpent[cat.id] ?? 0,
      })),
    [sortedCategories, detail.categorySpent]
  );

  const expenseDayGroups = useMemo(() => {
    const map = new Map<string, BudgetHistoryExpenseRow[]>();
    for (const row of detail.expenses) {
      const key = formatInTimeZone(new Date(row.date), calendarTimeZone, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
    return keys.map((ymd) => {
      const items = map.get(ymd)!;
      const dayTotal = items.reduce((s, x) => s + x.amount, 0);
      return { ymd, items, dayTotal };
    });
  }, [calendarTimeZone, detail.expenses]);

  const onMonthChange = (ym: string) => {
    router.push(`/budget/history?ym=${encodeURIComponent(ym)}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-3 pb-10 pt-4 md:max-w-4xl md:px-4 md:pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/budget"
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700 w-fit"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {t.budgetHistoryBack}
        </Link>
        <div className="flex items-center gap-2 rounded-2xl border border-warm-200 bg-white/90 px-3 py-2 shadow-sm">
          <CalendarRange className="h-4 w-4 text-warm-500 shrink-0" aria-hidden />
          <label htmlFor="budget-history-month" className="sr-only">
            {t.budgetHistoryMonthLabel}
          </label>
          <select
            id="budget-history-month"
            value={selectedYm}
            onChange={(e) => onMonthChange(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-warm-800 outline-none capitalize"
          >
            {monthChoices.map((ym) => (
              <option key={ym} value={ym}>
                {formatMonthLabel(ym)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-warm-900 md:text-3xl">{t.budgetHistoryTitle}</h1>
        <p className="mt-2 max-w-2xl text-sm text-warm-500">{t.budgetHistoryIntro}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-warm-100 bg-white/90 p-4 shadow-cozy">
          <p className="text-xs font-medium text-warm-500">{t.monthExpenses}</p>
          <p className="mt-1 text-lg font-bold text-warm-900 tabular-nums">{formatUah(detail.expenseTotal)}</p>
        </div>
        <div className="rounded-2xl border border-warm-100 bg-white/90 p-4 shadow-cozy">
          <p className="text-xs font-medium text-warm-500">{t.transactions}</p>
          <p className="mt-1 text-lg font-bold text-warm-900 tabular-nums">{detail.expenseCount}</p>
        </div>
        <div className="rounded-2xl border border-warm-100 bg-white/90 p-4 shadow-cozy">
          <p className="text-xs font-medium text-warm-500">{t.pastMonthIncomeLabel}</p>
          <p className="mt-1 text-lg font-bold text-sky-800 tabular-nums">{formatUah(detail.incomeTotal)}</p>
        </div>
        <div className="rounded-2xl border border-warm-100 bg-white/90 p-4 shadow-cozy col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-warm-500">{t.pastMonthNetLabel}</p>
          <p
            className={`mt-1 text-lg font-bold tabular-nums ${net >= 0 ? "text-sky-700" : "text-rose-600"}`}
          >
            {formatUah(net)}
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-warm-100 bg-white/85 p-4 shadow-cozy md:p-6">
        <h2 className="text-lg font-bold text-warm-800">{t.budgetHistoryCategories}</h2>
        <div className="mt-4 space-y-4">
          {byCategory.map((cat) => {
            const pct = cat.budget ? Math.min((cat.spent / cat.budget) * 100, 100) : 0;
            const overBudget = cat.budget && cat.spent > cat.budget;
            return (
              <div key={cat.id} className="rounded-2xl border border-warm-100 bg-warm-50/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-xl">{displayEmojiToken(cat.emoji) || CAT_FALLBACK}</span>
                    <span className="truncate text-sm font-semibold text-warm-800">{cat.name}</span>
                  </div>
                  <p className="shrink-0 text-base font-bold text-warm-900 tabular-nums">{formatUah(cat.spent)}</p>
                </div>
                {cat.budget ? (
                  <>
                    <p className="mt-1 text-xs text-warm-400">
                      {t.outOf} {formatUah(cat.budget)}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-warm-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: overBudget ? "#f43f5e" : cat.color }}
                      />
                    </div>
                    {overBudget ? <p className="mt-1 text-xs text-rose-500">{t.overBudget}</p> : null}
                  </>
                ) : null}
              </div>
            );
          })}
          {detail.uncategorizedSpent > 0 ? (
            <div className="rounded-2xl border border-dashed border-warm-200 bg-white/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-warm-600">{t.budgetHistoryUncategorized}</span>
                <span className="text-base font-bold text-warm-900 tabular-nums">
                  {formatUah(detail.uncategorizedSpent)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-warm-100 bg-white/85 p-4 shadow-cozy md:p-6">
        <h2 className="text-lg font-bold text-warm-800">{t.budgetHistoryIncomes}</h2>
        {detail.incomes.length === 0 ? (
          <p className="mt-4 text-center text-sm text-warm-400">{t.emptyIncomes}</p>
        ) : (
          <ul className="mt-4 divide-y divide-warm-100 rounded-2xl border border-warm-100 overflow-hidden">
            {detail.incomes.map((income) => (
              <li key={income.id} className="flex items-center gap-3 bg-white/60 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100/80">
                  <Wallet className="h-5 w-5 text-sky-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-warm-800 text-sm">{income.title}</p>
                  <p className="text-xs text-warm-400">
                    {formatDate(income.date, dateFmtOpts)} · {income.user.name}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-sky-700 tabular-nums">+{formatUah(income.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-warm-100 bg-white/85 shadow-cozy overflow-hidden">
        <div className="border-b border-warm-100 bg-sage-50/80 px-4 py-3 md:px-6">
          <h2 className="font-bold text-warm-800">{t.budgetHistoryExpenseList}</h2>
        </div>
        {expenseDayGroups.length === 0 ? (
          <div className="py-12 text-center text-warm-400">
            <Wallet className="mx-auto mb-3 h-9 w-9 text-warm-300" />
            <p className="text-sm">{t.emptyExpenses}</p>
          </div>
        ) : (
          <div className="divide-y divide-warm-100">
            {expenseDayGroups.map((group) => (
              <div key={group.ymd}>
                <div className="flex items-center justify-between gap-2 border-b border-warm-100 bg-warm-50/80 px-4 py-2 md:px-6">
                  <p className="text-xs font-semibold text-warm-600">{formatDate(group.items[0]!.date, dateFmtOpts)}</p>
                  <p className="text-[11px] text-warm-500">
                    {t.expenseDayTotal.replace("{amount}", formatUah(group.dayTotal))}
                  </p>
                </div>
                <div className="divide-y divide-warm-50">
                  {group.items.map((expense) => (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 px-4 py-3 md:gap-4 md:px-6"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl leading-none"
                        style={{ backgroundColor: (expense.category?.color || "#e7e5e4") + "33" }}
                      >
                        {expense.category ? (
                          <span aria-hidden>{displayEmojiToken(expense.category.emoji) || CAT_FALLBACK}</span>
                        ) : (
                          <Wallet className="h-5 w-5 text-warm-500" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-warm-800 text-sm">{expense.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-warm-400">
                          {expense.category ? <span>{expense.category.name}</span> : null}
                          {expense.category ? <span className="text-warm-300">·</span> : null}
                          <span>{formatDate(expense.date, dateFmtOpts)}</span>
                          <span className="text-warm-300">·</span>
                          <span>{expense.user.name}</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-warm-900 tabular-nums">
                        {formatUah(expense.amount)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
