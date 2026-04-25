"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Plus, Trash2, UserRound, X } from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { DISPLAY_CURRENCY_CODES } from "@/lib/profile-regional";
import { uahToDisplayAmount, type ExchangeRates, type SupportedCurrency } from "@/lib/exchange-rates";
import { useUserPreferences } from "@/components/shared/UserPreferencesProvider";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { intlLocaleForUi, messageLocale, I18N } from "@/lib/i18n";
import { formatCurrency, normalizeProfileEmoji } from "@/lib/utils";

type FamilyRole = "OWNER" | "MEMBER";
type BillingCycle = "MONTHLY" | "YEARLY";
type SubscriptionStatus = "ACTIVE" | "PAUSED" | "CANCELLED";
type MemberRole = "USER" | "PAYER";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  color: string;
  emoji: string;
  familyRole?: FamilyRole;
};

type SubscriptionItem = {
  id: string;
  title: string;
  category: string | null;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  nextBillingDate: string;
  trialEndsAt: string | null;
  status: SubscriptionStatus;
  note: string | null;
  ownerUserId: string | null;
  ownerUser: User | null;
  members: Array<{ id: string; userId: string; role: MemberRole; user: User }>;
};

type FormState = {
  title: string;
  category: string;
  amount: string;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  trialEndsAt: string;
  status: SubscriptionStatus;
  note: string;
  ownerUserId: string;
  memberUserIds: string[];
  payerUserId: string;
};

const currencyOptions = [...DISPLAY_CURRENCY_CODES];

function toInputDate(date: string | Date | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthlyAmount(amount: number, billingCycle: BillingCycle) {
  return billingCycle === "YEARLY" ? amount / 12 : amount;
}

function toUah(amount: number, currency: string, exchangeRates: ExchangeRates) {
  const rate = exchangeRates[currency as keyof ExchangeRates] ?? 1;
  return amount * rate;
}

function formatAsViewerCurrency(
  amount: number,
  sourceCurrency: string,
  viewer: SupportedCurrency,
  rates: ExchangeRates,
  locale: string
) {
  const uah = toUah(amount, sourceCurrency, rates);
  const v = uahToDisplayAmount(uah, viewer, rates);
  return formatCurrency(v, viewer, locale);
}

function getCategoryEmoji(category: string | null) {
  if (!category) return "✨";
  const c = category.toLowerCase();
  if (c.includes("відео") || c.includes("video") || c.includes("stream")) return "🎬";
  if (c.includes("музик") || c.includes("music")) return "🎧";
  if (c.includes("ігр") || c.includes("game")) return "🎮";
  if (c.includes("освіт") || c.includes("education")) return "📚";
  if (c.includes("хмар") || c.includes("cloud") || c.includes("storage") || c.includes("зберіган")) return "☁️";
  if (c.includes("продуктив") || c.includes("productivity")) return "🗂️";
  if (c.includes("безпек") || c.includes("security")) return "🛡️";
  if (c.includes("здоров") || c.includes("health") || c.includes("sport") || c.includes("спорт")) return "💪";
  if (c.includes("транспорт") || c.includes("transport")) return "🚗";
  if (c.includes("інш") || c.includes("other")) return "💳";
  return "💳";
}

type DueInfoText = {
  today: string;
  inDays: string;
};

function getDueInfo(nextBillingDate: string, t: DueInfoText): { label: string; className: string } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextBillingDate);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return null;
  if (days === 0) return { label: t.today, className: "bg-amber-100 text-amber-700 border-amber-200" };
  if (days <= 3) return { label: t.inDays.replace("{days}", String(days)), className: "bg-peach-100 text-peach-700 border-peach-200" };
  return { label: t.inDays.replace("{days}", String(days)), className: "bg-sage-100 text-sage-700 border-sage-200" };
}

function toForm(item: SubscriptionItem): FormState {
  const memberUserIds = item.members.map((member) => member.userId);
  const payer = item.members.find((member) => member.role === "PAYER");
  return {
    title: item.title,
    category: item.category || "",
    amount: String(item.amount),
    currency: item.currency || "UAH",
    billingCycle: item.billingCycle,
    nextBillingDate: toInputDate(item.nextBillingDate),
    trialEndsAt: toInputDate(item.trialEndsAt),
    status: item.status,
    note: item.note || "",
    ownerUserId: item.ownerUserId || "",
    memberUserIds,
    payerUserId: payer?.userId || "",
  };
}

const emptyForm: FormState = {
  title: "",
  category: "",
  amount: "",
  currency: "UAH",
  billingCycle: "MONTHLY",
  nextBillingDate: toInputDate(new Date()),
  trialEndsAt: "",
  status: "ACTIVE",
  note: "",
  ownerUserId: "",
  memberUserIds: [],
  payerUserId: "",
};

export default function SubscriptionsView({
  initialItems,
  members,
  currentUserRole,
  exchangeRates,
}: {
  initialItems: SubscriptionItem[];
  members: User[];
  currentUserRole: FamilyRole;
  exchangeRates: ExchangeRates;
}) {
  const { language } = useAppLanguage();
  const { displayCurrency: viewerCurrency } = useUserPreferences();
  const t = I18N[messageLocale(language)].subscriptions;
  const localeCode = intlLocaleForUi(language);
  const statusConfig: Record<SubscriptionStatus, { label: string; className: string }> = {
    ACTIVE: { label: t.active, className: "bg-sage-100 text-sage-700" },
    PAUSED: { label: t.paused, className: "bg-amber-100 text-amber-700" },
    CANCELLED: { label: t.cancelled, className: "bg-warm-200 text-warm-700" },
  };
  const subscriptionCategories = t.categories;
  const owner = currentUserRole === "OWNER";
  const [items, setItems] = useState(initialItems);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "ALL">("ALL");
  const [memberFilter, setMemberFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (memberFilter !== "ALL" && !item.members.some((member) => member.userId === memberFilter)) return false;
      return true;
    });
  }, [items, memberFilter, statusFilter]);

  const summary = useMemo(() => {
    const monthlyTotal = items.reduce((sum, item) => {
      if (item.status !== "ACTIVE") return sum;
      return sum + toUah(toMonthlyAmount(item.amount, item.billingCycle), item.currency, exchangeRates);
    }, 0);
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingCount = items.filter((item) => {
      if (item.status !== "ACTIVE") return false;
      const nextBillingDate = new Date(item.nextBillingDate);
      return nextBillingDate >= now && nextBillingDate <= in7Days;
    }).length;
    return {
      monthlyTotal,
      activeCount: items.filter((item) => item.status === "ACTIVE").length,
      upcomingCount,
    };
  }, [exchangeRates, items]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: SubscriptionItem) => {
    setEditingId(item.id);
    setForm(toForm(item));
    setShowModal(true);
  };

  const closeModal = () => {
    if (busy) return;
    setShowModal(false);
    setEditingId(null);
  };

  const toggleMember = (userId: string) => {
    setForm((prev) => {
      const exists = prev.memberUserIds.includes(userId);
      const nextMemberUserIds = exists
        ? prev.memberUserIds.filter((id) => id !== userId)
        : [...prev.memberUserIds, userId];
      const payerUserId = nextMemberUserIds.includes(prev.payerUserId) ? prev.payerUserId : "";
      return { ...prev, memberUserIds: nextMemberUserIds, payerUserId };
    });
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error(t.serviceNameRequired);
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t.amountPositive);
      return;
    }
    if (!form.nextBillingDate) {
      toast.error(t.nextBillingRequired);
      return;
    }

    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim() || null,
        amount,
        currency: form.currency.trim().toUpperCase() || "UAH",
        billingCycle: form.billingCycle,
        nextBillingDate: new Date(form.nextBillingDate).toISOString(),
        trialEndsAt: form.trialEndsAt ? new Date(form.trialEndsAt).toISOString() : null,
        status: form.status,
        note: form.note.trim() || null,
        ownerUserId: form.ownerUserId || null,
        memberUserIds: form.memberUserIds,
        payerUserId: form.payerUserId || null,
      };

      const url = editingId ? `/api/subscriptions/${editingId}` : "/api/subscriptions";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(err.error || t.saveError);
      }

      const data = (await res.json()) as SubscriptionItem;
      const normalized = {
        ...data,
        nextBillingDate: new Date(data.nextBillingDate).toISOString(),
        trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt).toISOString() : null,
      };
      setItems((prev) =>
        editingId ? prev.map((item) => (item.id === editingId ? normalized : item)) : [normalized, ...prev]
      );
      setShowModal(false);
      setEditingId(null);
      toast.success(editingId ? t.updated : t.added);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.genericError);
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(err.error || t.deleteError);
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success(t.deleted);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-lavender-400 to-lavender-500 rounded-3xl p-5 text-white shadow-cozy">
        <p className="text-lavender-100 text-sm">{t.title}</p>
        <h2 className="text-3xl font-bold mt-1">
          {formatCurrency(
            uahToDisplayAmount(summary.monthlyTotal, viewerCurrency, exchangeRates),
            viewerCurrency,
            localeCode
          )}{" "}
          {t.perMonth}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          <div className="bg-white/20 rounded-2xl px-4 py-2">
            <p className="text-xs text-lavender-100">{t.activeCount}</p>
            <p className="font-bold">{summary.activeCount}</p>
          </div>
          <div className="bg-white/20 rounded-2xl px-4 py-2">
            <p className="text-xs text-lavender-100">{t.upcomingCharge}</p>
            <p className="font-bold">{summary.upcomingCount}</p>
          </div>
          <div className="bg-white/20 rounded-2xl px-4 py-2">
            <p className="text-xs text-lavender-100">{t.total}</p>
            <p className="font-bold">{items.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/80 rounded-3xl border border-warm-100 p-4 md:p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h3 className="font-semibold text-warm-800">{t.registryTitle}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | "ALL")}
              className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-700 outline-none"
            >
              <option value="ALL">{t.allStatuses}</option>
              <option value="ACTIVE">{t.onlyActive}</option>
              <option value="PAUSED">{t.onPause}</option>
              <option value="CANCELLED">{t.onlyCancelled}</option>
            </select>
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-700 outline-none"
            >
              <option value="ALL">{t.allMembers}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name || member.email || t.memberFallback}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={openCreate}
              disabled={!owner || busy}
              className="px-4 py-2 rounded-xl bg-lavender-500 hover:bg-lavender-600 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Plus size={15} />
              {t.add}
            </button>
          </div>
        </div>
        {!owner && <p className="text-xs text-warm-400">{t.ownerOnly}</p>}

        {filteredItems.length === 0 ? (
          <div className="rounded-2xl bg-warm-50 border border-warm-100 p-8 text-center text-warm-400">
            {t.notFound}
          </div>
        ) : (
          <div className="rounded-2xl bg-warm-100/50 p-3.5 md:p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
            {filteredItems.map((item) => {
              const payer = item.members.find((member) => member.role === "PAYER")?.user;
              const dueInfo = getDueInfo(item.nextBillingDate, t);
              const categoryEmoji = getCategoryEmoji(item.category);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  className="relative overflow-hidden rounded-3xl border border-warm-200 bg-gradient-to-br from-white from-40% via-white to-lavender-50/35 p-4 md:p-5 space-y-4 shadow-[0_2px_14px_rgba(28,25,23,0.07)] ring-1 ring-warm-900/[0.04] hover:shadow-[0_14px_36px_rgba(28,25,23,0.11)] hover:ring-warm-900/[0.07] transition-[box-shadow,ring]"
                >
                  <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-lavender-100/35 blur-2xl" />
                  <div className="absolute -bottom-10 -left-8 w-24 h-24 rounded-full bg-peach-100/30 blur-2xl" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/90 border border-warm-100 flex items-center justify-center text-lg leading-none shadow-sm">
                        {categoryEmoji}
                      </div>
                      <div>
                      <p className="text-[11px] uppercase tracking-wide text-warm-400 font-semibold">{item.category || t.noCategory}</p>
                      <h4 className="font-bold text-warm-800 text-lg leading-tight mt-0.5">{item.title}</h4>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm ${statusConfig[item.status].className}`}>
                        {statusConfig[item.status].label}
                      </span>
                      {dueInfo && (
                        <span className={`text-[11px] px-2 py-1 rounded-full border font-semibold ${dueInfo.className}`}>
                          {dueInfo.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-white border border-warm-100 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-warm-400 font-semibold">{t.amountLabel}</p>
                      <p className="text-base font-bold text-warm-800 mt-0.5">
                        {formatAsViewerCurrency(item.amount, item.currency, viewerCurrency, exchangeRates, localeCode)}
                      </p>
                      <p className="text-xs text-warm-400">{item.billingCycle === "MONTHLY" ? t.monthly : t.yearly}</p>
                    </div>
                    <div className="rounded-2xl bg-white border border-warm-100 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-warm-400 font-semibold">{t.nextBillingLabel}</p>
                      <p className="text-base font-bold text-warm-800 mt-0.5">{new Date(item.nextBillingDate).toLocaleDateString(localeCode)}</p>
                      {item.trialEndsAt && (
                        <p className="text-xs text-warm-400">{t.trialUntil} {new Date(item.trialEndsAt).toLocaleDateString(localeCode)}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-warm-400 font-semibold">{t.usersLabel}</p>
                    <div className="flex flex-wrap gap-1.5 min-h-7">
                      {item.members.length === 0 && <span className="text-xs text-warm-400">{t.nobodyAssigned}</span>}
                      {item.members.map((member) => (
                        <span key={member.id} className="text-xs px-2.5 py-1 rounded-full bg-warm-100 text-warm-700 border border-warm-200/70">
                          {normalizeProfileEmoji(member.user.emoji)}{" "}
                          {member.user.name || member.user.email || t.memberFallback}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-warm-600">
                      <span className="text-warm-500">{t.payerLabel}</span>{" "}
                      {payer
                        ? `${normalizeProfileEmoji(payer.emoji)} ${payer.name || payer.email || t.memberFallback}`
                        : t.notSpecified}
                    </p>
                  </div>

                  {item.note && <p className="text-sm text-warm-600 bg-white/80 border border-warm-100 rounded-xl px-3 py-2">{item.note}</p>}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!owner || busy}
                      onClick={() => openEdit(item)}
                      className="px-3.5 py-2 rounded-xl bg-white border border-warm-200 hover:bg-warm-50 text-warm-700 text-xs font-semibold disabled:opacity-60"
                    >
                      {t.edit}
                    </button>
                    <button
                      type="button"
                      disabled={!owner || busy}
                      onClick={() => removeItem(item.id)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-semibold disabled:opacity-60 flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      {t.delete}
                    </button>
                  </div>
                </motion.div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeModal}
                  className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 14 }}
                  className="relative z-10 w-full max-w-2xl max-h-[92vh] rounded-3xl bg-white shadow-cozy-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-warm-100 px-5 py-4">
                    <h3 className="font-bold text-warm-800">{editingId ? t.editTitle : t.newTitle}</h3>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        value={form.title}
                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder={t.serviceNamePlaceholder}
                        className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-800 outline-none"
                      />
                      <select
                        value={form.category}
                        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                        className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-800 outline-none"
                      >
                        <option value="">{t.noCategory}</option>
                        {subscriptionCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <input
                        value={form.amount}
                        onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t.amountPlaceholder}
                        className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-800 outline-none"
                      />
                      <select
                        value={form.currency}
                        onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                        className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-800 outline-none"
                      >
                        {currencyOptions.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                      <select
                        value={form.billingCycle}
                        onChange={(e) => setForm((prev) => ({ ...prev, billingCycle: e.target.value as BillingCycle }))}
                        className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-800 outline-none"
                      >
                        <option value="MONTHLY">{t.monthly}</option>
                        <option value="YEARLY">{t.yearly}</option>
                      </select>
                      <select
                        value={form.status}
                        onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as SubscriptionStatus }))}
                        className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-800 outline-none"
                      >
                        <option value="ACTIVE">{t.active}</option>
                        <option value="PAUSED">{t.paused}</option>
                        <option value="CANCELLED">{t.cancelled}</option>
                      </select>
                      <label className="text-xs text-warm-500 space-y-1">
                        <span className="flex items-center gap-1">
                          <CalendarClock size={13} />
                          {t.nextBillingInputLabel}
                        </span>
                        <input
                          type="date"
                          value={form.nextBillingDate}
                          onChange={(e) => setForm((prev) => ({ ...prev, nextBillingDate: e.target.value }))}
                          className="w-full bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-800 outline-none"
                        />
                      </label>
                      <label className="text-xs text-warm-500 space-y-1">
                        <span>{t.trialEndLabel}</span>
                        <input
                          type="date"
                          value={form.trialEndsAt}
                          onChange={(e) => setForm((prev) => ({ ...prev, trialEndsAt: e.target.value }))}
                          className="w-full bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-800 outline-none"
                        />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-warm-500 flex items-center gap-1">
                        <UserRound size={13} />
                        {t.ownerLabel}
                      </p>
                      <select
                        value={form.ownerUserId}
                        onChange={(e) => setForm((prev) => ({ ...prev, ownerUserId: e.target.value }))}
                        className="w-full bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-800 outline-none"
                      >
                        <option value="">{t.notSpecified}</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name || member.email || t.memberFallback}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-warm-500">{t.usageLabel}</p>
                      <div className="flex flex-wrap gap-2">
                        {members.map((member) => {
                          const selected = form.memberUserIds.includes(member.id);
                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => toggleMember(member.id)}
                              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                selected
                                  ? "bg-lavender-100 border-lavender-300 text-lavender-700"
                                  : "bg-white border-warm-200 text-warm-600 hover:bg-warm-50"
                              }`}
                            >
                              {member.name || member.email || t.memberFallback}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-warm-500">{t.payerInputLabel}</p>
                      <select
                        value={form.payerUserId}
                        onChange={(e) => setForm((prev) => ({ ...prev, payerUserId: e.target.value }))}
                        className="w-full bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-800 outline-none"
                      >
                        <option value="">{t.notSpecified}</option>
                        {members
                          .filter((member) => form.memberUserIds.includes(member.id))
                          .map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name || member.email || t.memberFallback}
                            </option>
                          ))}
                      </select>
                    </div>

                    <textarea
                      value={form.note}
                      onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                      rows={3}
                      placeholder={t.notePlaceholder}
                      className="w-full bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-800 outline-none resize-none"
                    />
                  </div>
                  <div className="border-t border-warm-100 p-4 flex gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl bg-white border border-warm-200 text-warm-700 text-sm font-medium"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={save}
                      className="flex-1 py-2.5 rounded-xl bg-lavender-500 hover:bg-lavender-600 text-white text-sm font-medium disabled:opacity-60"
                    >
                      {editingId ? t.save : t.create}
                    </button>
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
