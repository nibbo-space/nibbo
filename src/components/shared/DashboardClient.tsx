"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { formatDate, formatTime, PRIORITY_CONFIG } from "@/lib/utils";
import { useCozyConfig } from "@/hooks/useCozyConfig";
import { createPortal } from "react-dom";
import {
  AlarmClock,
  CalendarDays,
  Check,
  ClipboardList,
  CreditCard,
  MoonStar,
  NotebookPen,
  Pill,
  ShoppingCart,
  Sparkles,
  SquareKanban,
  UtensilsCrossed,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { ACHIEVEMENT_UNLOCK_EVENT, type AchievementUnlockDetail } from "@/lib/achievement-unlock-events";
import { TASK_POINTS_AWARDED_EVENT } from "@/lib/task-points";
import { useUserPreferences } from "@/components/shared/UserPreferencesProvider";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { intlLocaleForUi, messageLocale, I18N } from "@/lib/i18n";
import { isModuleDisabled, pathnameToAppModule } from "@/lib/family-app-modules";
import type { DashboardReminderRow } from "@/lib/task-reminder-tick";

const TaskTamagotchi3D = dynamic(() => import("./TaskTamagotchi3D"), {
  ssr: false,
});

function hrefModuleEnabled(disabledAppModules: readonly string[], href: string): boolean {
  const m = pathnameToAppModule(href);
  if (!m) return true;
  return !isModuleDisabled(disabledAppModules, m);
}

interface DashboardClientProps {
  familyId: string;
  disabledAppModules?: string[];
  stats: { taskCount: number; eventCount: number; shoppingCount: number };
  personalTaskStats: { myOpen: number; doneToday: number; doneWeek: number; doneTotal: number };
  familyXp: number;
  unlockedAchievementIds: string[];
  upcomingEvents: any[];
  recentTasks: any[];
  reminderDeck: DashboardReminderRow[];
}

type DashboardTask = {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  assignee?: { name?: string | null; color?: string; emoji?: string | null } | null;
};

type PersonalTaskStats = {
  myOpen: number;
  doneToday: number;
  doneWeek: number;
  doneTotal: number;
};

type DashboardTaskStatsResponse = PersonalTaskStats & {
  familyXp: number;
  unlockedAchievementIds: string[];
};

export default function DashboardClient({
  familyId,
  disabledAppModules = [],
  stats,
  personalTaskStats,
  familyXp,
  unlockedAchievementIds,
  upcomingEvents,
  recentTasks,
  reminderDeck: initialReminderDeck,
}: DashboardClientProps) {
  const { language } = useAppLanguage();
  const { timeZone, assistantEnabled } = useUserPreferences();
  const dtOpts = { timeZone, locale: intlLocaleForUi(language) } as const;
  const t = I18N[messageLocale(language)].dashboard;
  const taskPriority = I18N[messageLocale(language)].task.priority;
  const [show3D, setShow3D] = useState(false);
  const [tasks, setTasks] = useState<DashboardTask[]>(recentTasks as DashboardTask[]);
  const [tamagotchiStats, setTamagotchiStats] = useState<PersonalTaskStats>(personalTaskStats);
  const [familyXpState, setFamilyXpState] = useState(familyXp);
  const [unlockedAchievementIdsState, setUnlockedAchievementIdsState] = useState(unlockedAchievementIds);
  const [confirmTask, setConfirmTask] = useState<DashboardTask | null>(null);
  const [busyComplete, setBusyComplete] = useState(false);
  const [reminderDeck, setReminderDeck] = useState<DashboardReminderRow[]>(initialReminderDeck);
  const modelRef = useRef<HTMLDivElement | null>(null);
  const { motion: cozyMotion } = useCozyConfig();

  useEffect(() => {
    let timeoutId = 0;
    let idleId = 0;
    const trigger = () => setShow3D(true);
    if (typeof window !== "undefined") {
      timeoutId = window.setTimeout(trigger, 1200);
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(trigger, { timeout: 1200 });
      }
    }
    const node = modelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShow3D(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timeoutId) window.clearTimeout(timeoutId);
      if (idleId && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  useEffect(() => {
    setFamilyXpState(familyXp);
    setUnlockedAchievementIdsState(unlockedAchievementIds);
  }, [familyXp, unlockedAchievementIds]);

  useEffect(() => {
    setReminderDeck(initialReminderDeck);
  }, [initialReminderDeck]);

  useEffect(() => {
    if (!hrefModuleEnabled(disabledAppModules, "/tasks")) return;
    const load = async () => {
      try {
        const res = await fetch("/api/reminders/deck");
        if (!res.ok) return;
        const data = (await res.json()) as { items?: DashboardReminderRow[] };
        if (Array.isArray(data.items)) setReminderDeck(data.items);
      } catch {}
    };
    void load();
    const id = window.setInterval(load, 5 * 60_000);
    return () => window.clearInterval(id);
  }, [disabledAppModules]);

  const refreshTamagotchiStats = async () => {
    try {
      const res = await fetch("/api/dashboard/task-stats");
      if (!res.ok) return;
      const data = (await res.json()) as DashboardTaskStatsResponse;
      setTamagotchiStats({
        myOpen: data.myOpen,
        doneToday: data.doneToday,
        doneWeek: data.doneWeek,
        doneTotal: data.doneTotal,
      });
      setFamilyXpState(data.familyXp);
      setUnlockedAchievementIdsState(data.unlockedAchievementIds);
    } catch {}
  };

  const completeTask = async () => {
    if (!confirmTask || busyComplete) return;
    setBusyComplete(true);
    try {
      const res = await fetch(`/api/tasks/${confirmTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error(t.completeTaskError);
      const data = (await res.json()) as { awardedPoints?: number; newAchievementIds?: string[] };
      if (data.awardedPoints && data.awardedPoints > 0) {
        window.dispatchEvent(
          new CustomEvent(TASK_POINTS_AWARDED_EVENT, { detail: { points: data.awardedPoints } })
        );
      }
      const newIds = data.newAchievementIds?.filter(Boolean) ?? [];
      if (newIds.length > 0) {
        window.dispatchEvent(
          new CustomEvent<AchievementUnlockDetail>(ACHIEVEMENT_UNLOCK_EVENT, { detail: { ids: newIds } })
        );
      }
      setTasks((prev) => prev.filter((task) => task.id !== confirmTask.id));
      await refreshTamagotchiStats();
      toast.success(t.completeTaskSuccess);
      setConfirmTask(null);
    } catch {
      toast.error(t.completeTaskFailToast);
    } finally {
      setBusyComplete(false);
    }
  };

  const statCards = useMemo(
    () =>
      [
        { label: t.stats.activeTasks, value: stats.taskCount, Icon: SquareKanban, color: "from-rose-400 to-rose-500", href: "/tasks" },
        { label: t.stats.upcomingEvents, value: stats.eventCount, Icon: CalendarDays, color: "from-lavender-400 to-lavender-500", href: "/calendar" },
        { label: t.stats.toBuy, value: stats.shoppingCount, Icon: ShoppingCart, color: "from-sage-400 to-sage-500", href: "/shopping" },
      ].filter((c) => hrefModuleEnabled(disabledAppModules, c.href)),
    [t.stats, stats, disabledAppModules]
  );

  const quickLinks = useMemo(
    () =>
      [
        { href: "/tasks", Icon: SquareKanban, label: t.quickLinks.newTask, color: "bg-rose-50 hover:bg-rose-100 border-rose-200" },
        { href: "/calendar", Icon: CalendarDays, label: t.quickLinks.newEvent, color: "bg-lavender-50 hover:bg-lavender-100 border-lavender-200" },
        { href: "/menu", Icon: UtensilsCrossed, label: t.quickLinks.planMenu, color: "bg-peach-50 hover:bg-peach-100 border-peach-200" },
        { href: "/notes", Icon: NotebookPen, label: t.quickLinks.note, color: "bg-cream-50 hover:bg-cream-100 border-cream-200" },
        { href: "/budget", Icon: CreditCard, label: t.quickLinks.expense, color: "bg-sage-50 hover:bg-sage-100 border-sage-200" },
        { href: "/shopping", Icon: ShoppingCart, label: t.quickLinks.addPurchase, color: "bg-sky-50 hover:bg-sky-100 border-sky-200" },
        { href: "/medications", Icon: Pill, label: t.quickLinks.medications, color: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200" },
      ].filter((c) => hrefModuleEnabled(disabledAppModules, c.href)),
    [t.quickLinks, disabledAppModules]
  );

  return (
    <div className="space-y-5 md:space-y-6 max-w-6xl mx-auto">
      <div data-tour="dashboard-home">
        <h2 className="text-xl md:text-2xl font-bold text-warm-800">
          {t.dayFocusTitle}
        </h2>
        <p className="text-warm-500 text-sm mt-1">{t.dayFocusSubtitle}</p>
      </div>

      <div ref={modelRef} data-tour="tamagotchi-3d" className="min-h-[360px]">
        {show3D ? (
          <TaskTamagotchi3D
            familyId={familyId}
            doneToday={tamagotchiStats.doneToday}
            doneWeek={tamagotchiStats.doneWeek}
            myOpen={tamagotchiStats.myOpen}
            doneTotal={tamagotchiStats.doneTotal}
            familyXp={familyXpState}
            unlockedAchievementIds={unlockedAchievementIdsState}
            assistantEnabled={assistantEnabled}
          />
        ) : (
          <div className="h-[360px] bg-white/75 rounded-3xl border border-warm-100 shadow-cozy animate-pulse" />
        )}
      </div>

      {hrefModuleEnabled(disabledAppModules, "/tasks") && (
        <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/95 via-white to-rose-50/40 p-4 md:p-5 shadow-cozy">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="font-semibold text-warm-900 flex items-center gap-2 text-sm md:text-base">
                <AlarmClock className="h-5 w-5 text-amber-600 shrink-0" />
                {t.remindersTitle}
              </h3>
              <p className="text-xs text-warm-600 mt-1 max-w-xl">{t.remindersSubtitle}</p>
            </div>
            <Link
              href="/tasks"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 whitespace-nowrap"
            >
              {t.remindersOpenTasks}
            </Link>
          </div>
          {reminderDeck.length === 0 ? (
            <p className="text-sm text-warm-500 py-2">{t.remindersEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {reminderDeck.map((r) => (
                <li key={r.id}>
                  <Link
                    href="/tasks"
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-warm-100 bg-white/80 px-3 py-2.5 transition-colors hover:border-rose-200 hover:bg-rose-50/40"
                  >
                    <span className="font-medium text-warm-800 text-sm flex-1 min-w-[8rem]">{r.title}</span>
                    <span className="text-xs text-warm-600">
                      {t.remindersEvery.replace("{n}", String(r.cadenceDays))} · {t.remindersWindow}{" "}
                      {r.windowLabel}
                    </span>
                    <span className="text-xs text-warm-500">
                      {t.remindersNext}:{" "}
                      {r.pingToday
                        ? t.remindersToday
                        : formatDate(`${r.nextPingYmd}T12:00:00.000Z`, dtOpts)}
                      {r.inWindowNow ? ` · ${t.remindersInWindow}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {statCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <motion.div
              whileHover={{ y: -2, scale: cozyMotion.hoverScale }}
              whileTap={{ scale: cozyMotion.tapScale }}
              transition={{ duration: cozyMotion.duration }}
              className={`bg-gradient-to-br ${card.color} rounded-3xl p-4 md:p-6 text-white shadow-cozy cursor-pointer`}
            >
              <card.Icon className="mb-2 md:mb-3 h-8 w-8 md:h-9 md:w-9" />
              <div className="text-2xl md:text-3xl font-bold">{card.value}</div>
              <div className="text-sm opacity-90 mt-1">{card.label}</div>
            </motion.div>
          </Link>
        ))}
      </div>

      <div>
        <h3 className="font-semibold text-warm-700 mb-3 text-sm">{t.quickAccess}</h3>
        <div data-tour="quick-actions" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} data-tour={link.href === "/menu" ? "recipes-action" : undefined}>
              <motion.div
                whileHover={{ y: -1, scale: cozyMotion.hoverScale }}
                whileTap={{ scale: cozyMotion.tapScale }}
                transition={{ duration: cozyMotion.duration }}
                className={`${link.color} border rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all`}
              >
                <link.Icon size={18} />
                <span className="text-sm font-medium text-warm-700">{link.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white/70 rounded-3xl p-4 md:p-5 shadow-cozy border border-warm-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-warm-800 flex items-center gap-2">
              <CalendarDays size={18} /> {t.upcomingEventsTitle}
            </h3>
            {hrefModuleEnabled(disabledAppModules, "/calendar") ? (
              <Link href="/calendar" className="text-xs text-rose-500 hover:text-rose-600 font-medium">
                {t.all}
              </Link>
            ) : (
              <span className="text-xs text-warm-300 font-medium">{t.all}</span>
            )}
          </div>
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-6 text-warm-400">
                <MoonStar className="mx-auto mb-2 h-7 w-7" />
                <p className="text-sm">{t.noEvents}</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <motion.div
                  key={event.id}
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-3 p-3 rounded-2xl hover:bg-warm-50 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-warm-800 text-sm truncate">{event.title}</p>
                    <p className="text-xs text-warm-400">
                      {formatDate(event.startDate, dtOpts)}{" "}
                      {!event.allDay && `• ${formatTime(event.startDate, dtOpts)}`}
                    </p>
                  </div>
                  {event.assignee && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                      style={{ backgroundColor: event.assignee.color || "#f43f5e" }}
                      title={event.assignee.name}
                    >
                      {event.assignee.name?.[0]}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white/70 rounded-3xl p-4 md:p-5 shadow-cozy border border-warm-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-warm-800 flex items-center gap-2">
              <ClipboardList size={18} /> {t.activeTasksTitle}
            </h3>
            {hrefModuleEnabled(disabledAppModules, "/tasks") ? (
              <Link href="/tasks" className="text-xs text-rose-500 hover:text-rose-600 font-medium">
                {t.all}
              </Link>
            ) : (
              <span className="text-xs text-warm-300 font-medium">{t.all}</span>
            )}
          </div>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-6 text-warm-400">
                <Sparkles className="mx-auto mb-2 h-7 w-7" />
                <p className="text-sm">{t.allTasksDone}</p>
              </div>
            ) : (
              tasks.map((task) => {
                const priority =
                  PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] ??
                  PRIORITY_CONFIG.MEDIUM;
                return (
                  <motion.div
                    key={task.id}
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-warm-50 transition-colors"
                  >
                    <span className="text-xs font-semibold text-warm-500">
                      {taskPriority[task.priority]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-warm-800 text-sm truncate">{task.title}</p>
                      {task.dueDate && (
                      <p className="text-xs text-warm-400">{formatDate(task.dueDate, dtOpts)}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmTask(task)}
                      className="w-7 h-7 rounded-full bg-sage-100 hover:bg-sage-200 text-sage-700 flex items-center justify-center transition-colors"
                      aria-label={t.markCompletedAria}
                    >
                      <Check size={14} />
                    </button>
                    {task.assignee && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0"
                        style={{ backgroundColor: task.assignee.color || "#f43f5e" }}
                        title={task.assignee.name ?? undefined}
                      >
                        {task.assignee.name?.[0]}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {confirmTask && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmTask(null)}
                  className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 14 }}
                  className="relative z-10 w-full max-w-md rounded-3xl bg-white shadow-cozy-lg border border-warm-100 p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-bold text-warm-800">{t.confirmTitle}</h3>
                      <p className="text-sm text-warm-500 mt-1">{t.confirmSubtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmTask(null)}
                      className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="rounded-2xl bg-warm-50 border border-warm-100 px-3 py-2.5 text-sm text-warm-700 mb-4">
                    {confirmTask.title}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmTask(null)}
                      className="flex-1 py-2.5 rounded-xl bg-white border border-warm-200 text-warm-700 text-sm font-medium"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      disabled={busyComplete}
                      onClick={completeTask}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sage-500 to-sage-400 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      {busyComplete ? "..." : t.done}
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
