"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Pencil, Pill, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { intlLocaleForUi, messageLocale, I18N } from "@/lib/i18n";
import { formatMinutesAsClock, isReminderPingDay } from "@/lib/task-reminder";
import { DEFAULT_TIME_ZONE } from "@/lib/calendar-tz";
import { dispatchXpAndAchievementEvents } from "@/lib/xp-client-events";

type ScheduleMode = "DAILY_TIMES" | "INTERVAL_DAYS";

type MedRow = {
  id: string;
  name: string;
  startYmd: string;
  notes: string | null;
  scheduleMode: ScheduleMode;
  dailySlotMinutes: number[];
  slotToleranceMin: number;
  intervalDays: number | null;
  intervalAnchorYmd: string | null;
  intervalWindowStartMin: number | null;
  intervalWindowEndMin: number | null;
  intakes: { dateYmd: string; slotIndex: number; taken: boolean }[];
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

const MED_COLORWAYS = [
  {
    header: "from-sky-400 to-cyan-400",
    card: "border-sky-200 bg-sky-50/55",
    cap: "bg-sky-400",
    body: "bg-sky-100",
    chip: "border-sky-200 bg-white text-sky-700",
    accent: "bg-sky-500 text-white",
  },
  {
    header: "from-fuchsia-400 to-rose-400",
    card: "border-fuchsia-200 bg-fuchsia-50/55",
    cap: "bg-fuchsia-400",
    body: "bg-fuchsia-100",
    chip: "border-fuchsia-200 bg-white text-fuchsia-700",
    accent: "bg-fuchsia-500 text-white",
  },
  {
    header: "from-violet-400 to-indigo-400",
    card: "border-violet-200 bg-violet-50/55",
    cap: "bg-violet-400",
    body: "bg-violet-100",
    chip: "border-violet-200 bg-white text-violet-700",
    accent: "bg-violet-500 text-white",
  },
  {
    header: "from-amber-400 to-orange-400",
    card: "border-amber-200 bg-amber-50/60",
    cap: "bg-amber-400",
    body: "bg-amber-100",
    chip: "border-amber-200 bg-white text-amber-700",
    accent: "bg-amber-500 text-white",
  },
  {
    header: "from-emerald-400 to-teal-400",
    card: "border-emerald-200 bg-emerald-50/60",
    cap: "bg-emerald-400",
    body: "bg-emerald-100",
    chip: "border-emerald-200 bg-white text-emerald-700",
    accent: "bg-emerald-500 text-white",
  },
] as const;

function paletteForMedication(seed: string) {
  const n = [...seed].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return MED_COLORWAYS[n % MED_COLORWAYS.length];
}

function KawaiiBottle({ seed }: { seed: string }) {
  const palette = paletteForMedication(seed);
  return (
    <div className="shrink-0">
      <div className={cn("h-4 w-11 rounded-t-full border border-white/80", palette.cap)} />
      <div className={cn("w-11 rounded-b-2xl border border-white/80 px-1 py-1.5", palette.body)}>
        <div className="rounded-md bg-white/95 px-1 py-0.5 text-center text-[7px] font-semibold uppercase tracking-wide text-warm-500">
          refill
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-warm-700" />
          <span className="h-1.5 w-1.5 rounded-full bg-warm-700" />
        </div>
        <div className="mx-auto mt-1 h-1 w-2.5 rounded-b-full bg-rose-300" />
      </div>
    </div>
  );
}

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
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
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
      setTimeZone(data.timeZone || DEFAULT_TIME_ZONE);
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

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name, language)), [items, language]);
  const baseYmd = todayYmd || new Date().toISOString().slice(0, 10);
  const isMedicationDueOnDay = useCallback(
    (m: MedRow, ymd: string) => {
      if (ymd < m.startYmd) return false;
      if (m.scheduleMode === "DAILY_TIMES") return true;
      return isReminderPingDay(m.intervalAnchorYmd, ymd, m.intervalDays, timeZone);
    },
    [timeZone]
  );

  const intakeTaken = useCallback(
    (m: MedRow, slotIndex: number) => {
      if (!todayYmd) return false;
      return m.intakes.find((i) => i.dateYmd === todayYmd && i.slotIndex === slotIndex)?.taken ?? false;
    },
    [todayYmd]
  );

  const isMedicationFullyTakenOnYmd = useCallback(
    (m: MedRow, ymd: string) => {
      if (!isMedicationDueOnDay(m, ymd)) return false;
      if (m.scheduleMode === "DAILY_TIMES") {
        return m.dailySlotMinutes.every((_, idx2) =>
          m.intakes.some((i) => i.dateYmd === ymd && i.slotIndex === idx2 && i.taken)
        );
      }
      return m.intakes.some((i) => i.dateYmd === ymd && i.slotIndex === 0 && i.taken);
    },
    [isMedicationDueOnDay]
  );

  const setIntake = async (m: MedRow, slotIndex: number, taken: boolean) => {
    if (!todayYmd) return;
    const prev = items;
    const dateYmd = todayYmd;
    setItems((list) =>
      list.map((row) => {
        if (row.id !== m.id) return row;
        const rest = row.intakes.filter((i) => !(i.dateYmd === dateYmd && i.slotIndex === slotIndex));
        return { ...row, intakes: [...rest, { dateYmd, slotIndex, taken }] };
      })
    );
    try {
      const res = await fetch(`/api/medications/${m.id}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateYmd, slotIndex, taken }),
      });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as { dateYmd?: string; slotIndex?: number; taken?: boolean };
      const ry = data.dateYmd;
      const rsi = data.slotIndex;
      const rt = data.taken;
      if (typeof ry === "string" && typeof rsi === "number" && typeof rt === "boolean") {
        setItems((list) =>
          list.map((row) => {
            if (row.id !== m.id) return row;
            const rest = row.intakes.filter((i) => !(i.dateYmd === ry && i.slotIndex === rsi));
            return { ...row, intakes: [...rest, { dateYmd: ry, slotIndex: rsi, taken: rt }] };
          })
        );
      }
      dispatchXpAndAchievementEvents(data);
    } catch {
      setItems(prev);
      toast.error(t.saveError);
    }
  };

  const monthCalendar = useMemo(() => {
    const baseDate = new Date(`${baseYmd}T12:00:00`);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const monthStart = new Date(year, month, 1, 12, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 12, 0, 0);
    const daysInMonth = monthEnd.getDate();
    const leadingBlanks = (monthStart.getDay() + 6) % 7;
    const monthLabel = new Intl.DateTimeFormat(intlLocaleForUi(language), { month: "long", year: "numeric" }).format(monthStart);
    const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2026, 2, 2 + i, 12, 0, 0);
      return new Intl.DateTimeFormat(intlLocaleForUi(language), { weekday: "short" }).format(d);
    });
    const cells = Array.from({ length: leadingBlanks + daysInMonth }, (_, idx) => {
      if (idx < leadingBlanks) return null;
      const day = idx - leadingBlanks + 1;
      const ymd = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday = ymd === baseYmd;
      const dueMeds = sortedItems.filter((m) => isMedicationDueOnDay(m, ymd));
      const takenDueCount = dueMeds.filter((m) => isMedicationFullyTakenOnYmd(m, ymd)).length;
      return {
        ymd,
        day,
        isToday,
        dueMeds,
        takenDueCount,
      };
    });
    return { monthLabel, weekdayLabels, cells };
  }, [baseYmd, language, sortedItems, isMedicationDueOnDay, isMedicationFullyTakenOnYmd]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-3xl border border-fuchsia-200/70 bg-gradient-to-br from-sky-400 via-fuchsia-400 to-rose-400 p-5 text-white shadow-cozy">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-2xl bg-white/20 p-2">
            <Pill className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{t.title}</h1>
            <p className="mt-1 max-w-xl text-sm text-emerald-50">{t.subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-fuchsia-700 shadow-sm transition hover:scale-[1.01]"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {t.addButton}
        </button>
      </div>

      <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-white via-rose-50/30 to-sky-50/40 p-4 shadow-cozy md:p-5">
        <h2 className="mb-3 font-semibold text-warm-800">{t.registryTitle}</h2>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-warm-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-warm-200 bg-warm-50/50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-warm-500">{t.empty}</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {sortedItems.map((m) => {
              const intervalDue = m.scheduleMode === "INTERVAL_DAYS" && isMedicationDueOnDay(m, baseYmd);
              const w0 = m.intervalWindowStartMin ?? 9 * 60;
              const w1 = m.intervalWindowEndMin ?? 12 * 60;
              const palette = paletteForMedication(m.name);
              return (
                <li
                  key={m.id}
                  className={cn("flex h-full flex-col rounded-[30px] border p-5 shadow-sm", palette.card)}
                >
                  <div className="flex min-h-[96px] items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-4">
                      <KawaiiBottle seed={m.name} />
                      <div className="min-w-0">
                        <p className="truncate text-xl font-bold text-warm-900">{m.name}</p>
                        {m.notes ? <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-warm-600">{m.notes}</p> : null}
                        <p className={cn("mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium", palette.chip)}>
                          {m.scheduleMode === "DAILY_TIMES"
                            ? t.scheduleDaily
                            : `${t.intervalEvery.replace("{n}", String(m.intervalDays ?? ""))} · ${t.intervalWindow
                                .replace("{from}", formatMinutesAsClock(w0))
                                .replace("{to}", formatMinutesAsClock(w1))}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="rounded-full border border-white/70 bg-white/80 p-2 text-warm-600 transition hover:scale-105"
                        aria-label={t.editButton}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(m.id)}
                        disabled={busy}
                        className="rounded-full border border-white/70 bg-white/80 p-2 text-rose-600 transition hover:scale-105"
                        aria-label={t.deleteButton}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {m.scheduleMode === "DAILY_TIMES" ? (
                    <div className="mt-auto pt-3 grid grid-cols-1 gap-2.5">
                      {m.dailySlotMinutes
                        .map((min, slotIndex) => ({ min, slotIndex }))
                        .sort((a, b) => a.min - b.min)
                        .map(({ min, slotIndex }) => (
                          <div
                            key={`${m.id}-${slotIndex}`}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-full border px-4 py-3 transition",
                              intakeTaken(m, slotIndex)
                                ? "border-emerald-200 bg-emerald-50/80"
                                : "border-white/80 bg-white/95 hover:border-fuchsia-200"
                            )}
                          >
                            <span className="text-sm font-semibold text-warm-800">
                              {t.doseAt.replace("{time}", formatMinutesAsClock(min))}
                            </span>
                            <button
                              type="button"
                              aria-pressed={intakeTaken(m, slotIndex)}
                              onClick={() => void setIntake(m, slotIndex, !intakeTaken(m, slotIndex))}
                              className={cn(
                                "inline-flex min-h-[36px] min-w-[124px] items-center justify-center gap-1 rounded-full px-3.5 text-sm font-semibold transition",
                                intakeTaken(m, slotIndex)
                                  ? palette.accent
                                  : "border border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300"
                              )}
                            >
                              {intakeTaken(m, slotIndex) ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                              {intakeTaken(m, slotIndex) ? t.taken : t.notTaken}
                            </button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="mt-auto pt-3 space-y-2.5">
                      <div
                        className={cn(
                          "flex items-center justify-end gap-3 rounded-full border px-4 py-3 transition",
                          !intervalDue
                            ? "border-warm-200 bg-warm-100/80 opacity-75"
                            : intakeTaken(m, 0)
                            ? "border-emerald-200 bg-emerald-50/80"
                            : "border-white/80 bg-white/95 hover:border-fuchsia-200"
                        )}
                      >
                        <button
                          type="button"
                          aria-pressed={intakeTaken(m, 0)}
                          disabled={!intervalDue}
                          onClick={() => void setIntake(m, 0, !intakeTaken(m, 0))}
                          className={cn(
                            "inline-flex min-h-[36px] min-w-[124px] items-center justify-center gap-1 rounded-full px-3.5 text-sm font-semibold transition",
                            !intervalDue
                              ? "cursor-not-allowed border border-warm-300 bg-white text-warm-400"
                              : intakeTaken(m, 0)
                              ? palette.accent
                              : "border border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300"
                          )}
                        >
                          {!intervalDue ? <X className="h-3.5 w-3.5" /> : intakeTaken(m, 0) ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                          {!intervalDue ? t.notDueTodayShort : intakeTaken(m, 0) ? t.taken : t.notTaken}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && sortedItems.length > 0 && (
        <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-white via-sky-50/20 to-fuchsia-50/25 p-4 shadow-cozy md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-warm-800">{t.calendarTitle}</h3>
            <p className="text-xs font-semibold capitalize text-warm-600">{monthCalendar.monthLabel}</p>
          </div>
          <div className="pb-1">
            <div>
              <div className="mb-3 hidden grid-cols-7 gap-2.5 sm:grid">
                {monthCalendar.weekdayLabels.map((label) => (
                  <div key={label} className="text-center text-[11px] font-semibold uppercase text-warm-400">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 sm:gap-2.5">
                {monthCalendar.cells.map((cell, idx) => {
                  if (!cell) return <div key={`empty-${idx}`} className="hidden h-[110px] rounded-2xl bg-transparent sm:block" />;
                  const dueCount = cell.dueMeds.length;
                  const done = dueCount > 0 && cell.takenDueCount === dueCount;
                  return (
                    <div
                      key={cell.ymd}
                      className={cn(
                        "h-[96px] rounded-xl border p-2 sm:h-[124px] sm:rounded-2xl sm:p-2.5",
                        cell.isToday ? "border-warm-400 bg-white" : "border-rose-100 bg-white/80"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-warm-700">{cell.day}</p>
                        {dueCount > 0 ? (
                          <p
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                              done ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}
                          >
                            {dueCount}
                          </p>
                        ) : null}
                      </div>
                      <div className="mt-2">
                        {dueCount === 0 ? (
                          <div className="flex h-[44px] items-center justify-center rounded-lg border border-dashed border-warm-200 bg-warm-50/70 text-[10px] font-semibold text-warm-400 sm:h-[56px] sm:rounded-xl sm:text-[11px]">
                            {t.notDueTodayShort}
                          </div>
                        ) : (
                          <div className="flex h-[44px] items-center justify-center gap-1.5 rounded-lg border border-white/80 bg-white/90 sm:h-[56px] sm:gap-2 sm:rounded-xl">
                            {cell.dueMeds.slice(0, 2).map((med) => {
                              const p = paletteForMedication(med.name);
                              const scheduleText =
                                med.scheduleMode === "DAILY_TIMES"
                                  ? t.scheduleDaily
                                  : t.intervalEvery.replace("{n}", String(med.intervalDays ?? ""));
                              return (
                                <button
                                  key={`${cell.ymd}-${med.id}`}
                                  type="button"
                                  className="group relative"
                                  aria-label={med.name}
                                >
                                  <div className="pointer-events-none absolute -top-3 left-1/2 z-30 hidden w-60 -translate-x-1/2 -translate-y-full rounded-2xl border border-rose-200 bg-white p-3 text-left shadow-xl group-hover:block">
                                    <div className="flex items-start gap-2">
                                      <KawaiiBottle seed={med.name} />
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-warm-900">{med.name}</p>
                                        <p className={cn("mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold", p.chip)}>
                                          {scheduleText}
                                        </p>
                                        {med.notes ? <p className="mt-1 line-clamp-2 text-[11px] text-warm-600">{med.notes}</p> : null}
                                      </div>
                                    </div>
                                  </div>
                                  <div className={cn("h-3 w-7 rounded-t-full border border-white/80 sm:h-3.5 sm:w-9", p.cap)} />
                                  <div className={cn("w-7 rounded-b-md border border-white/80 px-0.5 pb-0.5 sm:w-9 sm:rounded-b-lg sm:px-1 sm:pb-1", p.body)}>
                                    <div className="mx-auto mt-1 flex items-center justify-center gap-0.5 sm:mt-1.5">
                                      <span className="h-1 w-1 rounded-full bg-warm-700" />
                                      <span className="h-1 w-1 rounded-full bg-warm-700" />
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                            {dueCount > 2 ? <span className="text-[10px] font-semibold text-warm-500">+{dueCount - 2}</span> : null}
                          </div>
                        )}
                      </div>
                      <p className={cn("mt-1 text-[10px] font-semibold", dueCount === 0 ? "text-warm-400" : done ? "text-emerald-600" : "text-rose-500")}>
                        {dueCount === 0 ? t.notDueTodayShort : done ? t.taken : t.notTaken}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

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
              className="max-h-[min(90dvh,720px)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-warm-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-3xl border-b border-rose-100 bg-gradient-to-r from-rose-50 to-sky-50 px-4 py-3">
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
                    className="mt-1 w-full rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-300 focus:ring-1 focus:ring-fuchsia-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-600">{t.formNotes}</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-300 focus:ring-1 focus:ring-fuchsia-200"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, scheduleMode: "DAILY_TIMES" }))}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                      form.scheduleMode === "DAILY_TIMES"
                        ? "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700"
                        : "border-rose-200 bg-rose-50 text-warm-700"
                    )}
                  >
                    {t.scheduleDaily}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, scheduleMode: "INTERVAL_DAYS" }))}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                      form.scheduleMode === "INTERVAL_DAYS"
                        ? "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700"
                        : "border-rose-200 bg-rose-50 text-warm-700"
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
                        className="mt-1 w-full rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-300 focus:ring-1 focus:ring-fuchsia-200"
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
                        className="mt-1 w-full rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-300 focus:ring-1 focus:ring-fuchsia-200"
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
                        className="mt-1 w-full rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-300 focus:ring-1 focus:ring-fuchsia-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-600">{t.anchorLabel}</label>
                      <input
                        type="date"
                        value={form.intervalAnchorYmd}
                        onChange={(e) => setForm((f) => ({ ...f, intervalAnchorYmd: e.target.value }))}
                        className="mt-1 w-full rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-300 focus:ring-1 focus:ring-fuchsia-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-warm-600">{t.windowFrom}</label>
                        <input
                          value={form.intervalWindowStart}
                          onChange={(e) => setForm((f) => ({ ...f, intervalWindowStart: e.target.value }))}
                            className="mt-1 w-full rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-300 focus:ring-1 focus:ring-fuchsia-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-warm-600">{t.windowTo}</label>
                        <input
                          value={form.intervalWindowEnd}
                          onChange={(e) => setForm((f) => ({ ...f, intervalWindowEnd: e.target.value }))}
                            className="mt-1 w-full rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-300 focus:ring-1 focus:ring-fuchsia-200"
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
                        className="mt-1 w-full rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-300 focus:ring-1 focus:ring-fuchsia-200"
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={busy}
                    className="flex-1 rounded-2xl border border-rose-200 py-2.5 text-sm font-semibold text-warm-700 hover:bg-rose-50"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={busy}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-500 py-2.5 text-sm font-semibold text-white hover:from-fuchsia-600 hover:to-rose-600 disabled:opacity-60"
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
