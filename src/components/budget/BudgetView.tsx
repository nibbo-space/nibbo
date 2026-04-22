"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Landmark,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { DISPLAY_CURRENCY_CODES } from "@/lib/profile-regional";
import type { ExchangeRates, SupportedCurrency } from "@/lib/exchange-rates";
import { displayAmountToUah, uahToDisplayAmount } from "@/lib/exchange-rates";
import { kyivInstantAsCalendarYmd, kyivShiftCalendarDays } from "@/lib/kyiv-range";
import { displayEmojiToken, formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { intlLocaleForUi, messageLocale, I18N } from "@/lib/i18n";

interface User { id: string; name: string | null; image: string | null; color: string; emoji: string; }
interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  budget: number | null;
  sortOrder: number;
}
interface Expense { id: string; title: string; amount: number; date: string; note: string | null; category: Category | null; user: User; }
interface Income { id: string; title: string; amount: number; date: string; note: string | null; user: User; }
interface Credit {
  id: string;
  title: string;
  bank: "MONOBANK" | "PRIVATBANK" | "PUMB" | "OTHER";
  bankOtherName: string | null;
  monthlyAmount: number;
  paymentDay: number;
  lastPaidAt: string | null;
  status: "ACTIVE" | "CLOSED";
  note: string | null;
}

function cmpExpenseCategory(a: Category, b: Category) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

const CAT_EMOJIS = ["💳", "🛒", "🏠", "☕", "🎯", "🎁"];
const CAT_COLORS = ["#4ade80", "#38bdf8", "#fb923c", "#f43f5e", "#818cf8", "#c084fc", "#f472b6", "#facc15"];
export default function BudgetView({
  initialCategories,
  initialExpenses,
  expensesMonthTotal,
  expensesMonthCount,
  initialCategorySpent,
  initialExpenseWindowStartYmd,
  initialIncomes,
  initialCredits,
  monthlySubscriptionsTotal,
  monthlySubscriptionsCount,
  monthlyCreditsTotal,
  monthlyCreditsCount,
  currentUserId,
  calendarTimeZone,
  displayCurrency,
  exchangeRates,
}: {
  initialCategories: Category[];
  initialExpenses: Expense[];
  expensesMonthTotal: number;
  expensesMonthCount: number;
  initialCategorySpent: Record<string, number>;
  initialExpenseWindowStartYmd: string;
  initialIncomes: Income[];
  initialCredits: Credit[];
  monthlySubscriptionsTotal: number;
  monthlySubscriptionsCount: number;
  monthlyCreditsTotal: number;
  monthlyCreditsCount: number;
  currentUserId: string;
  calendarTimeZone: string;
  displayCurrency: SupportedCurrency;
  exchangeRates: ExchangeRates;
}) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].budget;
  const intlLoc = intlLocaleForUi(language);
  const dateFmtOpts = {
    timeZone: calendarTimeZone,
    locale: intlLoc,
  } as const;
  const formatUah = useCallback(
    (uah: number) => {
      const v = uahToDisplayAmount(uah, displayCurrency, exchangeRates);
      return formatCurrency(v, displayCurrency, intlLoc);
    },
    [displayCurrency, exchangeRates, intlLoc]
  );
  const [categories, setCategories] = useState(initialCategories);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [incomes, setIncomes] = useState(initialIncomes);
  const [monthExpenseTotal, setMonthExpenseTotal] = useState(expensesMonthTotal);
  const [monthExpenseTxCount, setMonthExpenseTxCount] = useState(expensesMonthCount);
  const [categorySpent, setCategorySpent] = useState<Record<string, number>>(initialCategorySpent);
  const [expenseOlderLoading, setExpenseOlderLoading] = useState(false);
  const [expenseHasMoreOlder, setExpenseHasMoreOlder] = useState(true);
  const [nextExpenseOlderUntilYmd, setNextExpenseOlderUntilYmd] = useState(() =>
    kyivShiftCalendarDays(initialExpenseWindowStartYmd, 1, calendarTimeZone)
  );
  const expenseOlderBusyRef = useRef(false);
  const expenseSentinelRef = useRef<HTMLDivElement | null>(null);
  const [credits, setCredits] = useState(initialCredits);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: "",
    amount: "",
    amountCurrency: displayCurrency,
    categoryId: "",
    note: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [newIncome, setNewIncome] = useState({
    title: "",
    amount: "",
    amountCurrency: displayCurrency,
    note: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [newCat, setNewCat] = useState({ name: "", emoji: CAT_EMOJIS[0]!, color: "#4ade80", budget: "" });
  const [plannedIncome, setPlannedIncome] = useState<number | null>(null);
  const [plannedIncomeInput, setPlannedIncomeInput] = useState("");
  const [newCredit, setNewCredit] = useState({
    title: "",
    bank: "MONOBANK" as Credit["bank"],
    bankOtherName: "",
    monthlyAmount: "",
    paymentDay: "10",
    lastPaidAt: "",
    status: "ACTIVE" as Credit["status"],
    note: "",
  });

  const monthKey = useMemo(
    () => formatInTimeZone(new Date(), calendarTimeZone, "yyyy-MM"),
    [calendarTimeZone]
  );

  const expenseDayGroups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const row of expenses) {
      const key = kyivInstantAsCalendarYmd(new Date(row.date), calendarTimeZone);
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
  }, [calendarTimeZone, expenses]);

  const sortedIncomes = useMemo(
    () => [...incomes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [incomes]
  );

  const totalIncome = useMemo(() => incomes.reduce((s, i) => s + i.amount, 0), [incomes]);
  const activeCredits = credits.filter((credit) => credit.status === "ACTIVE");
  const creditsAutoTotal = activeCredits.reduce((sum, credit) => sum + credit.monthlyAmount, 0);
  const totalSpent = monthExpenseTotal + monthlySubscriptionsTotal + creditsAutoTotal;
  const balance = totalIncome - totalSpent;
  const expectedBalance = (plannedIncome ?? 0) - totalSpent;
  const planDelta = plannedIncome !== null ? totalIncome - plannedIncome : null;
  const planStatus =
    plannedIncome === null
      ? { label: t.statusNoPlan, className: "bg-warm-100 text-warm-500" }
      : planDelta !== null && planDelta < 0
      ? { label: t.statusRisk, className: "bg-rose-100 text-rose-600" }
      : { label: t.statusOnTrack, className: "bg-sky-100 text-sky-700" };

  useEffect(() => {
    if (showAddExpense) {
      setNewExpense((p) => ({ ...p, amountCurrency: displayCurrency }));
    }
  }, [showAddExpense, displayCurrency]);

  useEffect(() => {
    if (showAddIncome) {
      setNewIncome((p) => ({ ...p, amountCurrency: displayCurrency }));
    }
  }, [showAddIncome, displayCurrency]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(`nibbo:budget:planIncome:${monthKey}`);
    if (!raw) return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      setPlannedIncome(parsed);
      setPlannedIncomeInput(String(parsed));
    }
  }, [monthKey]);

  const sortedCategories = useMemo(() => [...categories].sort(cmpExpenseCategory), [categories]);

  const byCategory = useMemo(
    () => sortedCategories.map((cat) => ({ ...cat, spent: categorySpent[cat.id] ?? 0 })),
    [sortedCategories, categorySpent]
  );
  const bankLabels: Record<Credit["bank"], string> = {
    MONOBANK: t.creditBankMonobank,
    PRIVATBANK: t.creditBankPrivatbank,
    PUMB: t.creditBankPumb,
    OTHER: t.creditBankOther,
  };

  const getCreditStatus = (credit: Credit) => {
    if (credit.status === "CLOSED") {
      return { label: t.creditStatusClosed, className: "bg-warm-100 text-warm-500" };
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonthPaid =
      credit.lastPaidAt &&
      new Date(credit.lastPaidAt).getFullYear() === now.getFullYear() &&
      new Date(credit.lastPaidAt).getMonth() === now.getMonth();
    if (currentMonthPaid) {
      return { label: t.creditStatusPaid, className: "bg-sky-100 text-sky-700" };
    }
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(credit.paymentDay, daysInMonth));
    const dayMs = 24 * 60 * 60 * 1000;
    const daysDiff = Math.round((dueDate.getTime() - today.getTime()) / dayMs);
    if (daysDiff < 0) {
      return { label: t.creditStatusOverdue, className: "bg-rose-100 text-rose-600" };
    }
    if (daysDiff <= 3) {
      return { label: t.creditStatusSoon, className: "bg-amber-100 text-amber-700" };
    }
    return { label: t.creditStatusActive, className: "bg-lavender-100 text-lavender-700" };
  };

  const handleAddExpense = async () => {
    if (!newExpense.title || !newExpense.amount) return;
    const parsed = parseFloat(newExpense.amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const amountUah = displayAmountToUah(parsed, newExpense.amountCurrency, exchangeRates);
    const res = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newExpense.title,
        amount: amountUah,
        categoryId: newExpense.categoryId || undefined,
        note: newExpense.note,
        date: new Date(newExpense.date).toISOString(),
      }),
    });
    const expense = await res.json();
    setExpenses((prev) => [expense, ...prev]);
    const expKey = formatInTimeZone(new Date(expense.date), calendarTimeZone, "yyyy-MM");
    const nowKey = formatInTimeZone(new Date(), calendarTimeZone, "yyyy-MM");
    if (expKey === nowKey) {
      setMonthExpenseTotal((x) => x + expense.amount);
      setMonthExpenseTxCount((c) => c + 1);
      const cid = expense.category?.id ?? newExpense.categoryId;
      if (cid) {
        setCategorySpent((prev) => ({ ...prev, [cid]: (prev[cid] ?? 0) + expense.amount }));
      }
    }
    setShowAddExpense(false);
    setNewExpense({
      title: "",
      amount: "",
      amountCurrency: displayCurrency,
      categoryId: "",
      note: "",
      date: new Date().toISOString().split("T")[0],
    });
    toast.success(t.toastExpenseAdded);
  };

  const handleDeleteExpense = async (id: string) => {
    const row = expenses.find((e) => e.id === id);
    await fetch(`/api/budget/${id}`, { method: "DELETE" });
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (row) {
      const ek = formatInTimeZone(new Date(row.date), calendarTimeZone, "yyyy-MM");
      const nk = formatInTimeZone(new Date(), calendarTimeZone, "yyyy-MM");
      if (ek === nk) {
        setMonthExpenseTotal((x) => x - row.amount);
        setMonthExpenseTxCount((c) => Math.max(0, c - 1));
        const cid = row.category?.id;
        if (cid) {
          setCategorySpent((prev) => ({ ...prev, [cid]: Math.max(0, (prev[cid] ?? 0) - row.amount) }));
        }
      }
    }
    toast.success(t.toastDeleted);
  };

  const handleAddIncome = async () => {
    if (!newIncome.title || !newIncome.amount) return;
    const parsed = parseFloat(newIncome.amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const amountUah = displayAmountToUah(parsed, newIncome.amountCurrency, exchangeRates);
    const res = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "income",
        title: newIncome.title,
        amount: amountUah,
        note: newIncome.note,
        date: new Date(newIncome.date).toISOString(),
      }),
    });
    const income = await res.json();
    setIncomes((prev) => [income, ...prev]);
    setShowAddIncome(false);
    setNewIncome({
      title: "",
      amount: "",
      amountCurrency: displayCurrency,
      note: "",
      date: new Date().toISOString().split("T")[0],
    });
    toast.success(t.toastIncomeAdded);
  };

  const handleDeleteIncome = async (id: string) => {
    await fetch(`/api/budget/${id}?type=income`, { method: "DELETE" });
    setIncomes((prev) => prev.filter((i) => i.id !== id));
    toast.success(t.toastDeleted);
  };

  const loadOlderExpenses = useCallback(async () => {
    if (expenseOlderBusyRef.current || !expenseHasMoreOlder) return;
    expenseOlderBusyRef.current = true;
    setExpenseOlderLoading(true);
    try {
      const res = await fetch(
        `/api/budget/expenses?until=${encodeURIComponent(nextExpenseOlderUntilYmd)}&days=7`
      );
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as {
        expenses: Expense[];
        range: { startYmd: string; until: string };
      };
      if (data.expenses.length === 0) {
        setExpenseHasMoreOlder(false);
        return;
      }
      setExpenses((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        const merged = [...prev];
        for (const ex of data.expenses) {
          if (!ids.has(ex.id)) merged.push(ex);
        }
        merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return merged;
      });
      setNextExpenseOlderUntilYmd(kyivShiftCalendarDays(data.range.startYmd, 1, calendarTimeZone));
    } catch {
      toast.error(t.expensesLoadError);
    } finally {
      expenseOlderBusyRef.current = false;
      setExpenseOlderLoading(false);
    }
  }, [calendarTimeZone, expenseHasMoreOlder, nextExpenseOlderUntilYmd, t.expensesLoadError]);

  useEffect(() => {
    const el = expenseSentinelRef.current;
    if (!el || !expenseHasMoreOlder) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadOlderExpenses();
      },
      { root: null, rootMargin: "160px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [expenseHasMoreOlder, loadOlderExpenses]);

  const handleSaveCredit = async () => {
    if (!newCredit.title || !newCredit.monthlyAmount || !newCredit.paymentDay) return;
    const payload = {
      title: newCredit.title,
      bank: newCredit.bank,
      bankOtherName: newCredit.bank === "OTHER" ? newCredit.bankOtherName : null,
      monthlyAmount: Number(newCredit.monthlyAmount),
      paymentDay: Number(newCredit.paymentDay),
      lastPaidAt: newCredit.lastPaidAt ? new Date(newCredit.lastPaidAt).toISOString() : null,
      status: newCredit.status,
      note: newCredit.note || null,
    };
    const res = await fetch(
      editingCreditId ? `/api/credits/${editingCreditId}` : "/api/credits",
      {
        method: editingCreditId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const credit = await res.json();
    if (editingCreditId) {
      setCredits((prev) => prev.map((item) => (item.id === credit.id ? credit : item)));
      toast.success(t.toastCreditUpdated);
    } else {
      setCredits((prev) => [credit, ...prev]);
      toast.success(t.toastCreditAdded);
    }
    setShowCreditModal(false);
    setEditingCreditId(null);
    setNewCredit({
      title: "",
      bank: "MONOBANK",
      bankOtherName: "",
      monthlyAmount: "",
      paymentDay: "10",
      lastPaidAt: "",
      status: "ACTIVE",
      note: "",
    });
  };

  const openAddCredit = () => {
    setEditingCreditId(null);
    setNewCredit({
      title: "",
      bank: "MONOBANK",
      bankOtherName: "",
      monthlyAmount: "",
      paymentDay: "10",
      lastPaidAt: "",
      status: "ACTIVE",
      note: "",
    });
    setShowCreditModal(true);
  };

  const openEditCredit = (credit: Credit) => {
    setEditingCreditId(credit.id);
    setNewCredit({
      title: credit.title,
      bank: credit.bank,
      bankOtherName: credit.bankOtherName || "",
      monthlyAmount: String(credit.monthlyAmount),
      paymentDay: String(credit.paymentDay),
      lastPaidAt: credit.lastPaidAt ? credit.lastPaidAt.slice(0, 10) : "",
      status: credit.status,
      note: credit.note || "",
    });
    setShowCreditModal(true);
  };

  const handleDeleteCredit = async () => {
    if (!editingCreditId) return;
    if (!confirm(t.deleteCreditConfirm)) return;
    await fetch(`/api/credits/${editingCreditId}`, { method: "DELETE" });
    setCredits((prev) => prev.filter((item) => item.id !== editingCreditId));
    setShowCreditModal(false);
    setEditingCreditId(null);
    toast.success(t.toastDeleted);
  };

  const markCreditPaidToday = async (creditId: string) => {
    const res = await fetch(`/api/credits/${creditId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastPaidAt: new Date().toISOString() }),
    });
    const updated = await res.json();
    setCredits((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    toast.success(t.toastCreditMarkedPaid);
  };

  const handleSavePlan = () => {
    const parsed = Number(plannedIncomeInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setPlannedIncome(parsed);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`nibbo:budget:planIncome:${monthKey}`, String(parsed));
    }
    setShowPlanModal(false);
  };

  const handleClearPlan = () => {
    setPlannedIncome(null);
    setPlannedIncomeInput("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`nibbo:budget:planIncome:${monthKey}`);
    }
  };

  const handleAddCategory = async () => {
    if (!newCat.name) return;
    const payload = {
      name: newCat.name,
      emoji: newCat.emoji,
      color: newCat.color,
      budget: newCat.budget ? parseFloat(newCat.budget) : null,
    };
    if (editingCategoryId) {
      const res = await fetch(`/api/budget/${editingCategoryId}?type=category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const cat = await res.json();
      setCategories((prev) => prev.map((item) => (item.id === cat.id ? cat : item)));
      toast.success(t.toastCategoryUpdated);
    } else {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", ...payload }),
      });
      const cat = await res.json();
      setCategories((prev) => [...prev, cat]);
      toast.success(t.toastCategoryAdded);
    }
    setShowAddCategory(false);
    setEditingCategoryId(null);
    setNewCat({ name: "", emoji: CAT_EMOJIS[0]!, color: "#4ade80", budget: "" });
  };

  const openAddCategory = () => {
    setEditingCategoryId(null);
    setNewCat({ name: "", emoji: CAT_EMOJIS[0]!, color: "#4ade80", budget: "" });
    setShowAddCategory(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setNewCat({
      name: category.name,
      emoji: displayEmojiToken(category.emoji) || CAT_EMOJIS[0]!,
      color: category.color,
      budget: category.budget != null ? String(category.budget) : "",
    });
    setShowAddCategory(true);
  };

  const handleDeleteCategory = async () => {
    if (!editingCategoryId) return;
    if (!confirm(t.deleteCategoryConfirm)) return;
    await fetch(`/api/budget/${editingCategoryId}?type=category`, { method: "DELETE" });
    setCategories((prev) => prev.filter((item) => item.id !== editingCategoryId));
    setShowAddCategory(false);
    setEditingCategoryId(null);
    setNewCat({ name: "", emoji: CAT_EMOJIS[0]!, color: "#4ade80", budget: "" });
    toast.success(t.toastDeleted);
  };

  const handleReorderCategory = async (categoryId: string, delta: number) => {
    const sorted = [...categories].sort(cmpExpenseCategory);
    const idx = sorted.findIndex((c) => c.id === categoryId);
    const j = idx + delta;
    if (idx < 0 || j < 0 || j >= sorted.length) return;
    const swapped = [...sorted];
    const a = swapped[idx]!;
    const b = swapped[j]!;
    swapped[idx] = b;
    swapped[j] = a;
    const reordered = swapped.map((c, i) => ({ ...c, sortOrder: i }));
    const orderedIds = reordered.map((c) => c.id);
    const before = categories.map((c) => ({ ...c }));
    setCategories(reordered);
    try {
      const res = await fetch("/api/budget/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setCategories(before);
      toast.error(t.toastCategoryReorderError);
    }
  };

  return (
    <div className="w-full space-y-5 md:space-y-6 xl:space-y-0 xl:grid xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] xl:gap-6 2xl:gap-8">
      <div className="space-y-5 md:space-y-6 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-7rem)] xl:min-h-0 xl:overflow-y-auto xl:overscroll-y-contain xl:pr-1 xl:[scrollbar-gutter:stable] self-start">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-sage-400 to-sage-500 rounded-3xl p-4 md:p-6 text-white shadow-cozy">
          <p className="text-sage-100 text-sm mb-1">{t.spentThisMonth}</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{formatUah(totalSpent)}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
            <div className="bg-white/20 rounded-2xl px-4 py-2">
              <p className="text-xs text-sage-100">{t.transactions}</p>
              <p className="font-bold">{monthExpenseTxCount}</p>
            </div>
            <div className="bg-white/20 rounded-2xl px-4 py-2">
              <p className="text-xs text-sage-100">{t.incomeThisMonth}</p>
              <p className="font-bold">{formatUah(totalIncome)}</p>
            </div>
            <div className="bg-white/20 rounded-2xl px-4 py-2">
              <p className="text-xs text-sage-100">{t.categoriesCount}</p>
              <p className="font-bold">{categories.length}</p>
            </div>
          </div>
          <div className="mt-3 bg-white/15 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2">
            <p className="text-xs text-sage-100">
              {t.subscriptionsThisMonth} · {monthlySubscriptionsCount}
            </p>
            <p className="text-sm font-semibold text-white">
              {formatUah(monthlySubscriptionsTotal)} <span className="text-sage-100 text-xs">({t.autoCalculated})</span>
            </p>
          </div>
          <div className="mt-2 bg-white/15 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2">
            <p className="text-xs text-sage-100">
              {t.creditsThisMonth} · {activeCredits.length || monthlyCreditsCount}
            </p>
            <p className="text-sm font-semibold text-white">
              {formatUah(creditsAutoTotal || monthlyCreditsTotal)}{" "}
              <span className="text-sage-100 text-xs">({t.autoCalculated})</span>
            </p>
          </div>
          <div className="mt-3 bg-white/20 rounded-2xl px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-sage-100">{t.balanceThisMonth}</p>
            <p className="font-bold flex items-center gap-1">
              {balance >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {formatUah(balance)}
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 rounded-3xl p-4 md:p-5 shadow-cozy border border-warm-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-warm-800">{t.planningTitle}</h3>
              <p className="text-xs text-warm-500 mt-1">{t.planningHint}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${planStatus.className}`}>
                {planStatus.label}
              </span>
              <button
                onClick={() => setShowPlanModal(true)}
                className="text-xs text-sky-600 hover:text-sky-700 font-medium"
              >
                {plannedIncome === null ? t.setPlan : t.editPlan}
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <p className="text-warm-500">{t.plannedIncome}</p>
              <p className="font-semibold text-warm-800">
                {plannedIncome === null ? t.noPlan : formatUah(plannedIncome)}
              </p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <p className="text-warm-500">{t.expectedBalance}</p>
              <p className={`font-semibold ${expectedBalance >= 0 ? "text-sky-700" : "text-rose-600"}`}>
                {plannedIncome === null ? "—" : formatUah(expectedBalance)}
              </p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <p className="text-warm-500">{t.actualBalance}</p>
              <p className={`font-semibold ${balance >= 0 ? "text-sky-700" : "text-rose-600"}`}>
                {formatUah(balance)}
              </p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <p className="text-warm-500">{t.deltaFromPlan}</p>
              <p className={`font-semibold ${planDelta === null ? "text-warm-400" : planDelta >= 0 ? "text-sky-700" : "text-rose-600"}`}>
                {planDelta === null ? "—" : formatUah(planDelta)}
              </p>
            </div>
          </div>
          {plannedIncome !== null && (
            <button onClick={handleClearPlan} className="mt-3 text-xs text-warm-400 hover:text-rose-500 font-medium">
              {t.clearPlan}
            </button>
          )}
        </motion.div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-warm-800">{t.categoriesTitle}</h3>
            <button onClick={openAddCategory} className="text-xs text-sage-600 hover:text-sage-700 font-medium flex items-center gap-1">
              <Plus size={14} /> {t.category}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3">
            {byCategory.map((cat, catIndex) => {
              const pct = cat.budget ? Math.min((cat.spent / cat.budget) * 100, 100) : 0;
              const overBudget = cat.budget && cat.spent > cat.budget;
              const lastIdx = byCategory.length - 1;
              return (
                <motion.div key={cat.id} whileHover={{ y: -2 }}
                  className="bg-white/80 rounded-2xl p-4 shadow-cozy border border-warm-100">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">{displayEmojiToken(cat.emoji) || CAT_EMOJIS[0]}</span>
                    <span className="text-xs font-semibold text-warm-700 truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center shrink-0 gap-0.5">
                      <button
                        type="button"
                        aria-label={t.categoryMoveUp}
                        disabled={catIndex === 0}
                        onClick={() => void handleReorderCategory(cat.id, -1)}
                        className="p-1 rounded-lg text-warm-300 hover:text-sky-600 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={t.categoryMoveDown}
                        disabled={catIndex === lastIdx}
                        onClick={() => void handleReorderCategory(cat.id, 1)}
                        className="p-1 rounded-lg text-warm-300 hover:text-sky-600 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditCategory(cat)}
                        className="p-1 rounded-lg text-warm-300 hover:text-sky-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-warm-800">{formatUah(cat.spent)}</p>
                  {cat.budget && (
                    <>
                      <p className="text-xs text-warm-400 mb-2">{t.outOf} {formatUah(cat.budget)}</p>
                      <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: overBudget ? "#f43f5e" : cat.color }} />
                      </div>
                      {overBudget && <p className="text-xs text-rose-500 mt-1">{t.overBudget}</p>}
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h3 className="font-bold text-warm-800">{t.monthTransactions}</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={openAddCredit}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-lavender-500 to-indigo-400 text-white rounded-2xl text-sm font-medium shadow-cozy w-full sm:w-auto">
              <Plus size={14} /> {t.addCredit}
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddIncome(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-400 text-white rounded-2xl text-sm font-medium shadow-cozy w-full sm:w-auto">
              <Plus size={14} /> {t.addIncome}
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddExpense(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-sage-500 to-sage-400 text-white rounded-2xl text-sm font-medium shadow-cozy w-full sm:w-auto">
              <Plus size={14} /> {t.addExpense}
            </motion.button>
          </div>
        </div>

        <div className="bg-white/70 rounded-3xl shadow-cozy border border-warm-100 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-warm-100 bg-lavender-50/70">
            <h4 className="font-semibold text-warm-800">{t.creditsTitle}</h4>
          </div>
          {credits.length === 0 ? (
            <div className="text-center py-10 text-warm-400">
              <div className="mb-3 flex justify-center"><Landmark className="h-9 w-9 text-warm-400" /></div>
              <p>{t.emptyCredits}</p>
            </div>
          ) : (
            <div className="divide-y divide-warm-50">
              {credits.map((credit) => {
                const statusBadge = getCreditStatus(credit);
                return (
                  <motion.div
                    key={credit.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-3 md:px-5 py-3 hover:bg-lavender-50/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-warm-800 text-sm truncate">{credit.title}</p>
                        <p className="text-xs text-warm-500 mt-0.5">
                          {credit.bank === "OTHER" ? credit.bankOtherName || bankLabels.OTHER : bankLabels[credit.bank]}
                        </p>
                        <p className="text-xs text-warm-400 mt-0.5">
                          {t.paymentDay} {credit.paymentDay}
                          {credit.lastPaidAt ? ` • ${t.lastPayment}: ${formatDate(credit.lastPaidAt, dateFmtOpts)}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-warm-800">{formatUah(credit.monthlyAmount)}</p>
                        <span className={`inline-block mt-1 text-[11px] px-2 py-1 rounded-full font-semibold ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      {credit.status === "ACTIVE" && (
                        <button
                          onClick={() => markCreditPaidToday(credit.id)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50 flex items-center gap-1"
                        >
                          <Check size={12} />
                          {t.markPaidToday}
                        </button>
                      )}
                      <button
                        onClick={() => openEditCredit(credit)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-warm-200 text-warm-600 hover:bg-warm-50 flex items-center gap-1"
                      >
                        <Pencil size={12} />
                        {t.editCredit}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white/70 rounded-3xl shadow-cozy border border-warm-100 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-warm-100 bg-sky-50/70">
            <h4 className="font-semibold text-warm-800">{t.monthIncomes}</h4>
            <p className="text-[11px] text-warm-500 mt-1">{t.incomeMonthHint}</p>
          </div>
          {sortedIncomes.length === 0 ? (
            <div className="text-center py-10 text-warm-400">
              <div className="mb-3 flex justify-center"><Wallet className="h-9 w-9 text-warm-400" /></div>
              <p>{t.emptyIncomes}</p>
            </div>
          ) : (
            <div className="divide-y divide-warm-50">
              {sortedIncomes.map((income) => (
                <motion.div
                  key={income.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 md:gap-4 px-3 md:px-5 py-3 hover:bg-sky-50/30 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-sky-100/80 shrink-0">
                    <Wallet size={18} className="text-sky-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-warm-800 text-sm">{income.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-warm-400">{formatDate(income.date, dateFmtOpts)}</span>
                      <span className="text-xs text-warm-300">•</span>
                      <span className="text-xs text-warm-400">{income.user.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-sm md:text-base text-sky-700">
                      +{formatUah(income.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteIncome(income.id)}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-warm-300 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/70 rounded-3xl shadow-cozy border border-warm-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-warm-100 bg-sage-50/70">
            <h4 className="font-semibold text-warm-800">{t.monthExpenses}</h4>
            <p className="text-[11px] text-warm-500 mt-1">{t.expenseListSubtitle}</p>
          </div>
          {expenseDayGroups.length === 0 ? (
            <div className="text-center py-12 text-warm-400">
              <div className="mb-3 flex justify-center"><Wallet className="h-9 w-9 text-warm-400" /></div>
              <p>{t.emptyExpenses}</p>
            </div>
          ) : (
            <div className="divide-y divide-warm-100">
              {expenseDayGroups.map((group) => (
                <div key={group.ymd}>
                  <div className="px-3 md:px-5 py-2 bg-warm-50/80 border-b border-warm-100 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-warm-600">{formatDate(group.items[0].date, dateFmtOpts)}</p>
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
                        className="flex items-center gap-3 md:gap-4 px-3 md:px-5 py-3 hover:bg-warm-50/50 transition-colors group"
                      >
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl leading-none"
                          style={{ backgroundColor: (expense.category?.color || "#e7e5e4") + "20" }}
                        >
                          {expense.category ? (
                            <span aria-hidden>{displayEmojiToken(expense.category.emoji) || CAT_EMOJIS[0]}</span>
                          ) : (
                            <Wallet className="h-5 w-5 text-warm-500" aria-hidden />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-warm-800 text-sm">{expense.title}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {expense.category && (
                              <span className="text-xs text-warm-400">{expense.category.name}</span>
                            )}
                            <span className="text-xs text-warm-300">•</span>
                            <span className="text-xs text-warm-400">{formatDate(expense.date, dateFmtOpts)}</span>
                            <span className="text-xs text-warm-400">• {expense.user.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm md:text-base text-warm-800">
                            {formatUah(expense.amount)}
                          </span>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-warm-300 hover:text-rose-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {expenseHasMoreOlder && <div ref={expenseSentinelRef} className="h-2 w-full" aria-hidden />}
          {expenseOlderLoading && (
            <p className="text-center text-xs text-warm-500 py-3 border-t border-warm-50">{t.expensesLoadingOlder}</p>
          )}
          {!expenseHasMoreOlder && expenses.length > 0 && (
            <p className="text-center text-xs text-warm-400 py-3 border-t border-warm-50">{t.expensesEndOfHistory}</p>
          )}
        </div>
        {monthlySubscriptionsCount > 0 && (
          <p className="text-xs text-warm-400 mt-2 px-1">
            + {formatUah(monthlySubscriptionsTotal)} {t.subscriptionsThisMonth} ({t.autoCalculated})
          </p>
        )}
        {activeCredits.length > 0 && (
          <p className="text-xs text-warm-400 mt-1 px-1">
            + {formatUah(creditsAutoTotal)} {t.creditsThisMonth} ({t.autoCalculated})
          </p>
        )}
      </div>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showCreditModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowCreditModal(false);
                  setEditingCreditId(null);
                }}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                className="relative z-10 w-full max-w-md"
              >
                <div className="bg-white rounded-3xl shadow-cozy-lg p-4 md:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-warm-800">
                      {editingCreditId ? t.editCreditTitle : t.newCreditTitle}
                    </h2>
                    <button
                      onClick={() => {
                        setShowCreditModal(false);
                        setEditingCreditId(null);
                      }}
                      className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <input
                      value={newCredit.title}
                      onChange={(e) => setNewCredit((p) => ({ ...p, title: e.target.value }))}
                      placeholder={t.creditTitlePlaceholder}
                      className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400"
                    />
                    <select
                      value={newCredit.bank}
                      onChange={(e) => setNewCredit((p) => ({ ...p, bank: e.target.value as Credit["bank"] }))}
                      className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400"
                    >
                      <option value="MONOBANK">{bankLabels.MONOBANK}</option>
                      <option value="PRIVATBANK">{bankLabels.PRIVATBANK}</option>
                      <option value="PUMB">{bankLabels.PUMB}</option>
                      <option value="OTHER">{bankLabels.OTHER}</option>
                    </select>
                    {newCredit.bank === "OTHER" && (
                      <input
                        value={newCredit.bankOtherName}
                        onChange={(e) => setNewCredit((p) => ({ ...p, bankOtherName: e.target.value }))}
                        placeholder={t.creditBankOtherName}
                        className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400"
                      />
                    )}
                    <input
                      type="number"
                      value={newCredit.monthlyAmount}
                      onChange={(e) => setNewCredit((p) => ({ ...p, monthlyAmount: e.target.value }))}
                      placeholder={t.creditMonthlyAmount}
                      className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400"
                    />
                    <div>
                      <p className="text-xs font-medium text-warm-600 mb-1.5">{t.creditPaymentDayLabel}</p>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={newCredit.paymentDay}
                        onChange={(e) => setNewCredit((p) => ({ ...p, paymentDay: e.target.value }))}
                        placeholder={t.creditPaymentDayPlaceholder}
                        className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400"
                      />
                      <p className="text-xs text-warm-400 mt-1.5">{t.creditPaymentDayHint}</p>
                    </div>
                    <input
                      type="date"
                      value={newCredit.lastPaidAt}
                      onChange={(e) => setNewCredit((p) => ({ ...p, lastPaidAt: e.target.value }))}
                      className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400"
                    />
                    <select
                      value={newCredit.status}
                      onChange={(e) => setNewCredit((p) => ({ ...p, status: e.target.value as Credit["status"] }))}
                      className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400"
                    >
                      <option value="ACTIVE">{t.creditStatusActive}</option>
                      <option value="CLOSED">{t.creditStatusClosed}</option>
                    </select>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSaveCredit}
                      className="w-full py-3 bg-gradient-to-r from-lavender-500 to-indigo-400 text-white rounded-2xl font-semibold"
                    >
                      {t.save}
                    </motion.button>
                    {editingCreditId && (
                      <button
                        onClick={handleDeleteCredit}
                        className="w-full py-2.5 text-sm font-medium rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        {t.deleteCredit}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          {showPlanModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPlanModal(false)}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                className="relative z-10 w-full max-w-md"
              >
                <div className="bg-white rounded-3xl shadow-cozy-lg p-4 md:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-warm-800">{t.planModalTitle}</h2>
                    <button onClick={() => setShowPlanModal(false)} className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center"><X size={16} /></button>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="number"
                      value={plannedIncomeInput}
                      onChange={(e) => setPlannedIncomeInput(e.target.value)}
                      placeholder={t.amountPlaceholder}
                      className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-sky-400"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSavePlan}
                      className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-400 text-white rounded-2xl font-semibold"
                    >
                      {t.save}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          {showAddIncome && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddIncome(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative z-10 w-full max-w-md">
              <div className="bg-white rounded-3xl shadow-cozy-lg p-4 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-warm-800">{t.newIncomeTitle}</h2>
                  <button onClick={() => setShowAddIncome(false)} className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center"><X size={16} /></button>
                </div>
                <div className="space-y-4">
                  <input value={newIncome.title} onChange={(e) => setNewIncome((p) => ({ ...p, title: e.target.value }))}
                    placeholder={t.incomeTitlePlaceholder} className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-sky-400" />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <input
                      type="number"
                      min="0"
                      step={newIncome.amountCurrency === "JPY" ? "1" : "0.01"}
                      value={newIncome.amount}
                      onChange={(e) => setNewIncome((p) => ({ ...p, amount: e.target.value }))}
                      placeholder={t.amountInInputCurrency.replace("{currency}", newIncome.amountCurrency)}
                      className="min-w-0 flex-1 bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-sky-400"
                    />
                    <select
                      value={newIncome.amountCurrency}
                      onChange={(e) =>
                        setNewIncome((p) => ({
                          ...p,
                          amountCurrency: e.target.value as SupportedCurrency,
                        }))
                      }
                      className="w-full shrink-0 rounded-xl border border-warm-200 bg-warm-50 px-3 py-3 text-sm font-semibold text-warm-800 outline-none focus:border-sky-400 sm:w-28"
                      aria-label={t.inputCurrencyLabel}
                    >
                      {DISPLAY_CURRENCY_CODES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input type="date" value={newIncome.date} onChange={(e) => setNewIncome((p) => ({ ...p, date: e.target.value }))}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-sky-400" />
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleAddIncome}
                    className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-400 text-white rounded-2xl font-semibold">
                    {t.save}
                  </motion.button>
                </div>
              </div>
            </motion.div>
            </div>
          )}
          {showAddExpense && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddExpense(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative z-10 w-full max-w-md">
              <div className="bg-white rounded-3xl shadow-cozy-lg p-4 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-warm-800">{t.newExpenseTitle}</h2>
                  <button onClick={() => setShowAddExpense(false)} className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center"><X size={16} /></button>
                </div>
                <div className="space-y-4">
                  <input value={newExpense.title} onChange={(e) => setNewExpense((p) => ({ ...p, title: e.target.value }))}
                    placeholder={t.expenseTitlePlaceholder} className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-sage-400" />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <input
                      type="number"
                      min="0"
                      step={newExpense.amountCurrency === "JPY" ? "1" : "0.01"}
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))}
                      placeholder={t.amountInInputCurrency.replace("{currency}", newExpense.amountCurrency)}
                      className="min-w-0 flex-1 bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-sage-400"
                    />
                    <select
                      value={newExpense.amountCurrency}
                      onChange={(e) =>
                        setNewExpense((p) => ({
                          ...p,
                          amountCurrency: e.target.value as SupportedCurrency,
                        }))
                      }
                      className="w-full shrink-0 rounded-xl border border-warm-200 bg-warm-50 px-3 py-3 text-sm font-semibold text-warm-800 outline-none focus:border-sage-400 sm:w-28"
                      aria-label={t.inputCurrencyLabel}
                    >
                      {DISPLAY_CURRENCY_CODES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <select value={newExpense.categoryId} onChange={(e) => setNewExpense((p) => ({ ...p, categoryId: e.target.value }))}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-sage-400">
                    <option value="">{t.optionalCategory}</option>
                    {sortedCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {displayEmojiToken(c.emoji) || CAT_EMOJIS[0]} {c.name}
                      </option>
                    ))}
                  </select>
                  <input type="date" value={newExpense.date} onChange={(e) => setNewExpense((p) => ({ ...p, date: e.target.value }))}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-sage-400" />
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleAddExpense}
                    className="w-full py-3 bg-gradient-to-r from-sage-500 to-sage-400 text-white rounded-2xl font-semibold">
                    {t.save}
                  </motion.button>
                </div>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showAddCategory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddCategory(false);
                setEditingCategoryId(null);
              }} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative z-10 w-full max-w-sm">
              <div className="bg-white rounded-3xl shadow-cozy-lg p-4 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-warm-800">{editingCategoryId ? t.editCategoryTitle : t.newCategoryTitle}</h2>
                  <button onClick={() => {
                    setShowAddCategory(false);
                    setEditingCategoryId(null);
                  }} className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center"><X size={16} /></button>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-1 flex-wrap">
                    {CAT_EMOJIS.map((e) => (
                      <button key={e} onClick={() => setNewCat((p) => ({ ...p, emoji: e }))}
                        className={`text-xl w-9 h-9 rounded-xl flex items-center justify-center transition-all ${newCat.emoji === e ? "bg-sage-100 ring-2 ring-sage-400" : "hover:bg-warm-50"}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {CAT_COLORS.map((c) => (
                      <button key={c} onClick={() => setNewCat((p) => ({ ...p, color: c }))}
                        className={`w-7 h-7 rounded-full transition-all ${newCat.color === c ? "ring-2 ring-offset-1 ring-warm-400 scale-110" : "hover:scale-105"}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <input value={newCat.name} onChange={(e) => setNewCat((p) => ({ ...p, name: e.target.value }))}
                    placeholder={t.categoryNamePlaceholder} className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-sage-400" />
                  <input type="number" value={newCat.budget} onChange={(e) => setNewCat((p) => ({ ...p, budget: e.target.value }))}
                    placeholder={t.monthlyBudgetPlaceholder} className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-sage-400" />
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAddCategory}
                    className="w-full py-3 bg-gradient-to-r from-sage-500 to-sage-400 text-white rounded-2xl font-semibold">
                    {editingCategoryId ? t.save : t.create}
                  </motion.button>
                  {editingCategoryId && (
                    <button
                      onClick={handleDeleteCategory}
                      className="w-full py-2.5 text-sm font-medium rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                    >
                      {t.deleteCategory}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
