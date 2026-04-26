"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Pencil, Pill, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { formatMinutesAsClock, isReminderPingDay } from "@/lib/task-reminder";
import { dispatchXpAndAchievementEvents } from "@/lib/xp-client-events";

type ScheduleMode = "DAILY_TIMES" | "INTERVAL_DAYS";

type MedRow = {
  id: string;
  name: string;
  notes: string | null;
  scheduleMode: ScheduleMode;
  dailySlotMinutes: number[];
  slotToleranceMin: number;
  intervalDays: number | null;
  intervalAnchorYmd: string | null;
  intervalWindowStartMin: number | null;
  intervalWindowEndMin: number | null;
  todayIntakes: { slotIndex: number; taken: boolean }[];
};

type ApiList = {
  todayYmd: string;
  timeZone: string;
  items: MedRow[];
};

type FormState = {
  name: string;
  notes: string;
  scheduleMode: ScheduleMode;
  dailyTimesText: string;
  slotToleranceMin: string;
  intervalDays: string;
  intervalAnchorYmd: string;
  intervalWindowStart: string;
  intervalWindowEnd: string;
};

function emptyForm(): FormState {
  return {
    name: "",
    notes: "",
    scheduleMode: "DAILY_TIMES",
    dailyTimesText: "09:00",
    slotToleranceMin: "45",
    intervalDays: "3",
    intervalAnchorYmd: new Date().toISOString().slice(0, 10),
    intervalWindowStart: "09:00",
    intervalWindowEnd: "12:00",
  };
}

function rowToForm(m: MedRow): FormState {
  const slots = [...m.dailySlotMinutes].sort((a, b) => a - b);
  const dailyTimesText = slots.map((x) => formatMinutesAsClock(x)).join(", ");
  const sm = m.intervalWindowStartMin ?? 9 * 60;
  const em = m.intervalWindowEndMin ?? 12 * 60;
  return {
    name: m.name,
    notes: m.notes ?? "",
    scheduleMode: m.scheduleMode,
    dailyTimesText: dailyTimesText || "09:00",
    slotToleranceMin: String(m.slotToleranceMin ?? 45),
    intervalDays: String(m.intervalDays ?? 3),
    intervalAnchorYmd: m.intervalAnchorYmd ?? new Date().toISOString().slice(0, 10),
    intervalWindowStart: formatMinutesAsClock(sm),
    intervalWindowEnd: formatMinutesAsClock(em),
  };
}

function parseDailyTimes(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export default function MedicationsPageClient() {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].medications;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<MedRow[]>([]);
  const [todayYmd, setTodayYmd] = useState("");
  const [timeZone, setTimeZone] = useState("Europe/Kyiv");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/medications");
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as ApiList;
      setItems(data.items);
      setTodayYmd(data.todayYmd);
      setTimeZone(data.timeZone || "Europe/Kyiv");
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (m: MedRow) => {
    setEditingId(m.id);
    setForm(rowToForm(m));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (busy) return;
    setModalOpen(false);
    setEditingId(null);
  };

  const buildPayload = (): Record<string, unknown> | null => {
    const name = form.name.trim();
    if (!name) {
      toast.error(t.nameRequired);
      return null;
    }
    const tol = Math.max(15, Math.min(180, Math.floor(Number.parseInt(form.slotToleranceMin, 10) || 45)));
    if (form.scheduleMode === "DAILY_TIMES") {
      const dailyTimes = parseDailyTimes(form.dailyTimesText);
      if (dailyTimes.length === 0) {
        toast.error(t.dailyTimesRequired);
        return null;
      }
      return {
        name,
        notes: form.notes.trim() || null,
        scheduleMode: "DAILY_TIMES",
        dailyTimes,
        slotToleranceMin: tol,
      };
    }
    const n = Math.floor(Number.parseInt(form.intervalDays, 10) || 0);
    if (n < 1) {
      toast.error(t.intervalInvalid);
      return null;
    }
    return {
      name,
      notes: form.notes.trim() || null,
      scheduleMode: "INTERVAL_DAYS",
      slotToleranceMin: tol,
      intervalDays: n,
      intervalAnchorYmd: form.intervalAnchorYmd.trim(),
      intervalWindowStart: form.intervalWindowStart.trim(),
      intervalWindowEnd: form.intervalWindowEnd.trim(),
    };
  };

  const save = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true);
    try {
      const url = editingId ? `/api/medications/${editingId}` : "/api/medications";
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
      await load();
      setModalOpen(false);
      setEditingId(null);
      toast.success(t.toastSaved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.saveError);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/medications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t.deleteError);
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success(t.toastDeleted);
    } catch {
      toast.error(t.deleteError);
    } finally {
      setBusy(false);
    }
  };

  const intakeTaken = useCallback(
    (m: MedRow, slotIndex: number) => m.todayIntakes.find((i) => i.slotIndex === slotIndex)?.taken ?? false,
    []
  );

  const setIntake = async (m: MedRow, slotIndex: number, taken: boolean) => {
    if (!todayYmd) return;
    const prev = items;
    setItems((list) =>
      list.map((row) => {
        if (row.id !== m.id) return row;
        const rest = row.todayIntakes.filter((i) => i.slotIndex !== slotIndex);
        return { ...row, todayIntakes: [...rest, { slotIndex, taken }] };
      })
    );
    try {
      const res = await fetch(`/api/medications/${m.id}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateYmd: todayYmd, slotIndex, taken }),
      });
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      dispatchXpAndAchievementEvents(data);
    } catch {
      setItems(prev);
      toast.error(t.saveError);
    }
  };

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name, language)), [items, language]);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl p-5 text-white shadow-cozy">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white/20 p-2 shrink-0">
            <Pill className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
            <p className="text-emerald-50 text-sm mt-1 max-w-xl">{t.subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-2.5 text-sm font-semibold text-teal-800 shadow-sm hover:bg-white transition-colors"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {t.addButton}
        </button>
      </div>

      <div className="bg-white/85 rounded-3xl border border-warm-100 p-4 md:p-5 shadow-cozy">
        <h2 className="font-semibold text-warm-800 mb-3">{t.registryTitle}</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-warm-500 py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : sortedItems.length === 0 ? (
          <p className="text-sm text-warm-500 py-6 text-center">{t.empty}</p>
        ) : (
          <ul className="space-y-3">
            {sortedItems.map((m) => {
              const intervalDue =
                m.scheduleMode === "INTERVAL_DAYS" &&
                isReminderPingDay(m.intervalAnchorYmd, todayYmd, m.intervalDays, timeZone);
              const w0 = m.intervalWindowStartMin ?? 9 * 60;
              const w1 = m.intervalWindowEndMin ?? 12 * 60;
              return (
                <li
                  key={m.id}
                  className="rounded-2xl border border-warm-100 bg-warm-50/40 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-warm-900">{m.name}</p>
                      {m.notes ? <p className="text-xs text-warm-600 mt-1 whitespace-pre-wrap">{m.notes}</p> : null}
                      <p className="text-xs text-warm-500 mt-2">
                        {m.scheduleMode === "DAILY_TIMES"
                          ? t.scheduleDaily
                          : `${t.intervalEvery.replace("{n}", String(m.intervalDays ?? ""))} · ${t.intervalWindow
                              .replace("{from}", formatMinutesAsClock(w0))
                              .replace("{to}", formatMinutesAsClock(w1))}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="rounded-xl p-2 text-warm-600 hover:bg-white border border-transparent hover:border-warm-200"
                        aria-label={t.editButton}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(m.id)}
                        disabled={busy}
                        className="rounded-xl p-2 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200"
                        aria-label={t.deleteButton}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {m.scheduleMode === "DAILY_TIMES" ? (
                    <div className="flex flex-col gap-2">
                      {m.dailySlotMinutes
                        .map((min, slotIndex) => ({ min, slotIndex }))
                        .sort((a, b) => a.min - b.min)
                        .map(({ min, slotIndex }) => (
                          <label
                            key={`${m.id}-${slotIndex}`}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 cursor-pointer transition-colors",
                              intakeTaken(m, slotIndex)
                                ? "border-emerald-200 bg-emerald-50/60"
                                : "border-warm-200 bg-white/80 hover:border-emerald-200"
                            )}
                          >
                            <span className="text-sm text-warm-800">
                              {t.doseAt.replace("{time}", formatMinutesAsClock(min))}
                            </span>
                            <input
                              type="checkbox"
                              checked={intakeTaken(m, slotIndex)}
                              onChange={(e) => void setIntake(m, slotIndex, e.target.checked)}
                              className="h-5 w-5 rounded border-warm-300 text-emerald-600 focus:ring-emerald-400"
                            />
                          </label>
                        ))}
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-warm-600 mb-2">{intervalDue ? t.intervalDueToday : t.intervalNotDue}</p>
                      <label
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 cursor-pointer transition-colors",
                          intakeTaken(m, 0)
                            ? "border-emerald-200 bg-emerald-50/60"
                            : "border-warm-200 bg-white/80 hover:border-emerald-200"
                        )}
                      >
                        <span className="text-sm text-warm-800">{t.taken}</span>
                        <input
                          type="checkbox"
                          checked={intakeTaken(m, 0)}
                          onChange={(e) => void setIntake(m, 0, e.target.checked)}
                          className="h-5 w-5 rounded border-warm-300 text-emerald-600 focus:ring-emerald-400"
                        />
                      </label>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {modalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 backdrop-blur-[1px] sm:items-center sm:p-6"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget && !busy) closeModal();
            }}
          >
            <div
              role="dialog"
              aria-modal
              aria-labelledby="med-modal-title"
              className="w-full max-w-lg max-h-[min(90dvh,720px)] overflow-y-auto overscroll-contain rounded-3xl border border-warm-100 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-3xl border-b border-warm-100 bg-white px-4 py-3">
                <h2 id="med-modal-title" className="font-semibold text-warm-900">
                  {editingId ? t.editTitle : t.createTitle}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={busy}
                  className="rounded-xl p-2 text-warm-500 hover:bg-warm-50"
                  aria-label={t.cancel}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <label className="text-xs font-medium text-warm-600">{t.formName}</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-warm-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-600">{t.formNotes}</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-xl border border-warm-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, scheduleMode: "DAILY_TIMES" }))}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                      form.scheduleMode === "DAILY_TIMES"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                        : "border-warm-200 bg-warm-50 text-warm-700"
                    )}
                  >
                    {t.scheduleDaily}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, scheduleMode: "INTERVAL_DAYS" }))}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                      form.scheduleMode === "INTERVAL_DAYS"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                        : "border-warm-200 bg-warm-50 text-warm-700"
                    )}
                  >
                    {t.scheduleInterval}
                  </button>
                </div>
                {form.scheduleMode === "DAILY_TIMES" ? (
                  <>
                    <div>
                      <label className="text-xs font-medium text-warm-600">{t.dailyTimesPlaceholder}</label>
                      <input
                        value={form.dailyTimesText}
                        onChange={(e) => setForm((f) => ({ ...f, dailyTimesText: e.target.value }))}
                        placeholder={t.dailyTimesPlaceholder}
                        className="mt-1 w-full rounded-xl border border-warm-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                      />
                      <p className="mt-1 text-xs text-warm-500">{t.dailyTimesHint}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-600">{t.toleranceLabel}</label>
                      <input
                        type="number"
                        min={15}
                        max={180}
                        value={form.slotToleranceMin}
                        onChange={(e) => setForm((f) => ({ ...f, slotToleranceMin: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-warm-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-medium text-warm-600">{t.intervalDaysLabel}</label>
                      <input
                        type="number"
                        min={1}
                        value={form.intervalDays}
                        onChange={(e) => setForm((f) => ({ ...f, intervalDays: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-warm-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-600">{t.anchorLabel}</label>
                      <input
                        type="date"
                        value={form.intervalAnchorYmd}
                        onChange={(e) => setForm((f) => ({ ...f, intervalAnchorYmd: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-warm-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-warm-600">{t.windowFrom}</label>
                        <input
                          value={form.intervalWindowStart}
                          onChange={(e) => setForm((f) => ({ ...f, intervalWindowStart: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-warm-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-warm-600">{t.windowTo}</label>
                        <input
                          value={form.intervalWindowEnd}
                          onChange={(e) => setForm((f) => ({ ...f, intervalWindowEnd: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-warm-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-600">{t.toleranceLabel}</label>
                      <input
                        type="number"
                        min={15}
                        max={180}
                        value={form.slotToleranceMin}
                        onChange={(e) => setForm((f) => ({ ...f, slotToleranceMin: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-warm-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={busy}
                    className="flex-1 rounded-2xl border border-warm-200 py-2.5 text-sm font-semibold text-warm-700 hover:bg-warm-50"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={busy}
                    className="flex-1 rounded-2xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {busy ? "…" : t.save}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
