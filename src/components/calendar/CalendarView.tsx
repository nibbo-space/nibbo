"use client";

import { CSSProperties, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay, isToday,
  parseISO, addHours,
} from "date-fns";
import { uk, enUS } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, MoonStar, Plus, X } from "lucide-react";
import { useUserPreferences } from "@/components/shared/UserPreferencesProvider";
import { useFocusMode } from "@/components/shared/FocusModeProvider";
import { AUTO_BILLING_MARKER } from "@/lib/subscription-calendar";
import { cn, formatTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { intlLocaleForUi, messageLocale, I18N } from "@/lib/i18n";

interface User { id: string; name: string | null; image: string | null; color: string; emoji: string; }
interface Subscription { id: string; title: string; }
interface Event {
  id: string; title: string; description: string | null;
  emoji: string; color: string;
  startDate: string | Date; endDate: string | Date;
  allDay: boolean; location: string | null; assignee: User | null;
  weeklyRepeat: boolean; weeklyDay: number | null;
  subscription: Subscription | null;
}

const EVENT_COLORS = [
  "#f43f5e", "#fb923c", "#facc15", "#4ade80",
  "#38bdf8", "#818cf8", "#c084fc", "#f472b6",
];

function isSubscriptionBillingCalendarEvent(e: Event): boolean {
  if (e.description?.startsWith(AUTO_BILLING_MARKER)) return true;
  if (e.emoji === "subscription" && e.allDay) return true;
  return false;
}

const MONTH_COZY_BACKGROUNDS = [
  "url('/calendar/cozy-winter.svg')",
  "url('/calendar/cozy-winter.svg')",
  "url('/calendar/cozy-spring.svg')",
  "url('/calendar/cozy-spring.svg')",
  "url('/calendar/cozy-spring.svg')",
  "url('/calendar/cozy-summer.svg')",
  "url('/calendar/cozy-summer.svg')",
  "url('/calendar/cozy-summer.svg')",
  "url('/calendar/cozy-autumn.svg')",
  "url('/calendar/cozy-autumn.svg')",
  "url('/calendar/cozy-autumn.svg')",
  "url('/calendar/cozy-winter.svg')",
];

export default function CalendarView({ initialEvents, users, currentUserId, subscriptions }: {
  initialEvents: Event[];
  users: User[];
  currentUserId: string;
  subscriptions: Subscription[];
}) {
  const { language } = useAppLanguage();
  const { timeZone } = useUserPreferences();
  const dtOpts = { timeZone, locale: intlLocaleForUi(language) } as const;
  const t = I18N[messageLocale(language)].calendar;
  const ml = messageLocale(language);
  const dateLocale = ml === "uk" ? uk : enUS;
  const { enabled: focusEnabled, hydrated: focusHydrated } = useFocusMode();
  const focusCalendarSlim = focusHydrated && focusEnabled;
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const displayEvents = useMemo(() => {
    if (!focusCalendarSlim) return events;
    return events.filter((e) => !isSubscriptionBillingCalendarEvent(e));
  }, [events, focusCalendarSlim]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "", description: "", emoji: "event", color: "#8b5cf6",
    startDate: "", startTime: "10:00", endTime: "11:00",
    allDay: false, location: "", assigneeId: "",
    subscriptionId: "",
    weeklyRepeat: false, weeklyDay: 1,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getWeekday = (d: Date) => {
    const day = d.getDay();
    return day === 0 ? 7 : day;
  };
  const getMonthBackgroundStyle = (day: Date): CSSProperties => ({
    "--calendar-cozy-bg": MONTH_COZY_BACKGROUNDS[day.getMonth()],
  } as CSSProperties);

  const getEventsForDay = (day: Date) =>
    displayEvents.filter((e) => {
      const eventStart = new Date(e.startDate);
      if (e.weeklyRepeat && e.weeklyDay) {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const eventDayStart = new Date(eventStart);
        eventDayStart.setHours(0, 0, 0, 0);
        return dayStart >= eventDayStart && getWeekday(day) === e.weeklyDay;
      }
      return isSameDay(eventStart, day);
    });

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const monthDays = days.filter((day) => isSameMonth(day, currentMonth));

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startDate) return;

    const start = new Date(`${newEvent.startDate}T${newEvent.allDay ? "00:00" : newEvent.startTime}`);
    const end = new Date(`${newEvent.startDate}T${newEvent.allDay ? "23:59" : newEvent.endTime}`);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newEvent.title,
        description: newEvent.description,
        emoji: newEvent.emoji,
        color: newEvent.color,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        allDay: newEvent.allDay,
        location: newEvent.location,
        assigneeId: newEvent.assigneeId || undefined,
        subscriptionId: newEvent.subscriptionId || undefined,
        weeklyRepeat: newEvent.weeklyRepeat,
        weeklyDay: newEvent.weeklyRepeat ? newEvent.weeklyDay : null,
      }),
    });

    const event = await res.json();
    setEvents((prev) => [...prev, event]);
    setShowAddEvent(false);
    setNewEvent({ title: "", description: "", emoji: "event", color: "#8b5cf6", startDate: "", startTime: "10:00", endTime: "11:00", allDay: false, location: "", assigneeId: "", subscriptionId: "", weeklyRepeat: false, weeklyDay: 1 });
    toast.success(t.addEventToast);
  };

  const handleDeleteEvent = async (id: string) => {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.success(t.deleteEventToast);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 md:gap-6">
      <div className="flex-1 flex flex-col min-w-0 md:min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-9 h-9 rounded-xl bg-white shadow-cozy flex items-center justify-center text-warm-500 hover:text-warm-800 transition-colors"
            >
              <ChevronLeft size={18} />
            </motion.button>
            <h2 className="text-lg md:text-xl font-bold text-warm-800 capitalize text-center min-w-0 sm:min-w-48">
              {format(currentMonth, "LLLL yyyy", { locale: dateLocale })}
            </h2>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-9 h-9 rounded-xl bg-white shadow-cozy flex items-center justify-center text-warm-500 hover:text-warm-800 transition-colors"
            >
              <ChevronRight size={18} />
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setNewEvent((p) => ({ ...p, startDate: format(new Date(), "yyyy-MM-dd") })); setShowAddEvent(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-lavender-500 to-lavender-400 text-white rounded-2xl text-sm font-medium shadow-cozy w-full sm:w-auto"
          >
            <Plus size={16} /> {t.newEvent}
          </motion.button>
        </div>

        <div className="md:hidden space-y-2">
          {monthDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const todayDay = isToday(day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "w-full text-left rounded-2xl p-3 border transition-colors",
                  isSelected
                    ? "bg-lavender-50 border-lavender-300"
                    : "bg-white/70 border-warm-100"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className={cn("text-sm font-semibold", todayDay ? "text-rose-600" : "text-warm-800")}>
                    {format(day, "d MMMM, EEE", { locale: dateLocale })}
                  </p>
                  <span className="text-xs text-warm-500">{dayEvents.length} {t.eventsCount}</span>
                </div>
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-warm-400">{t.noEvents}</p>
                ) : (
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="text-xs text-warm-700 truncate">
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-xs text-warm-400">+{dayEvents.length - 2} {t.more}</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {selectedDay && (
          <div className="md:hidden mt-3 bg-white/80 rounded-3xl shadow-cozy border border-warm-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-warm-800">
                {format(selectedDay, "d MMMM", { locale: dateLocale })}
              </h3>
              <button
                onClick={() => { setNewEvent((p) => ({ ...p, startDate: format(selectedDay, "yyyy-MM-dd") })); setShowAddEvent(true); }}
                className="w-7 h-7 rounded-xl bg-lavender-100 hover:bg-lavender-200 text-lavender-600 flex items-center justify-center transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-warm-400">{t.nothingPlanned}</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-2xl border"
                    style={{ borderColor: event.color + "40", backgroundColor: event.color + "10" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-warm-800">{event.title}</p>
                        {!event.allDay && (
                          <p className="text-xs text-warm-500 mt-1">
                            {formatTime(event.startDate, dtOpts)} — {formatTime(event.endDate, dtOpts)}
                          </p>
                        )}
                        {!focusCalendarSlim && event.subscription && (
                          <p className="text-xs text-lavender-600 mt-1">{t.subscriptionLabel}: {event.subscription.title}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-warm-300 hover:text-rose-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="hidden md:flex flex-1 min-w-0 min-h-0">
          <div className="w-full h-full flex flex-col">
            <div className="grid grid-cols-7 mb-2">
              {t.weekdays.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-warm-500 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr gap-1 md:gap-1.5 flex-1 p-1 min-h-0">
              {days.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const todayDay = isToday(day);
                const inMonth = isSameMonth(day, currentMonth);

                return (
                  <motion.div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "calendar-cozy-card rounded-2xl p-2 cursor-pointer transition-all h-full min-h-[clamp(92px,11vh,150px)] border border-warm-100 bg-white/70",
                      !inMonth && "opacity-45",
                      isSelected && "bg-lavender-50 border-lavender-300 ring-2 ring-lavender-300",
                      todayDay && !isSelected && "bg-rose-50 border-rose-200 ring-1 ring-rose-200",
                      !isSelected && !todayDay && "calendar-cozy-card-hover hover:bg-warm-50 hover:border-warm-200"
                    )}
                    style={getMonthBackgroundStyle(day)}
                  >
                    <div className={cn(
                      "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                      todayDay ? "bg-rose-500 text-white" : "text-warm-600"
                    )}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((e) => (
                        <div
                          key={e.id}
                          className="text-xs px-1.5 py-0.5 rounded-md text-white truncate"
                          style={{ backgroundColor: e.color }}
                        >
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-warm-400 px-1">+{dayEvents.length - 2}</div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:flex w-full md:w-72 flex-col gap-4">
        {selectedDay ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/80 rounded-3xl shadow-cozy border border-warm-100 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-warm-800">
                {format(selectedDay, "d MMMM", { locale: dateLocale })}
              </h3>
              <button
                onClick={() => { setNewEvent((p) => ({ ...p, startDate: format(selectedDay, "yyyy-MM-dd") })); setShowAddEvent(true); }}
                className="w-7 h-7 rounded-xl bg-lavender-100 hover:bg-lavender-200 text-lavender-600 flex items-center justify-center transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-8 text-warm-400">
                <MoonStar className="mx-auto mb-2 h-7 w-7" />
                <p className="text-sm">{t.nothingPlanned}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-2xl border"
                    style={{ borderColor: event.color + "40", backgroundColor: event.color + "10" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-warm-800 text-sm">
                          {event.title}
                        </p>
                        {!event.allDay && (
                          <p className="text-xs text-warm-500 mt-1">
                            {formatTime(event.startDate, dtOpts)} — {formatTime(event.endDate, dtOpts)}
                          </p>
                        )}
                        {event.weeklyRepeat && event.weeklyDay && (
                          <p className="text-xs text-warm-500 mt-1">
                            {t.weeklyLabel}: {t.weekdays[event.weeklyDay - 1]}
                          </p>
                        )}
                        {event.location && (
                          <p className="text-xs text-warm-400 mt-1 flex items-center gap-1"><MapPin size={12} /> {event.location}</p>
                        )}
                        {!focusCalendarSlim && event.subscription && (
                          <p className="text-xs text-lavender-600 mt-1">{t.subscriptionLabel}: {event.subscription.title}</p>
                        )}
                        {event.assignee && (
                          <div className="flex items-center gap-1 mt-2">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                              style={{ backgroundColor: event.assignee.color }}
                            >
                              {event.assignee.emoji || event.assignee.name?.[0]}
                            </div>
                            <span className="text-xs text-warm-500">{event.assignee.name}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-warm-300 hover:text-rose-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="bg-white/60 rounded-3xl p-5 text-center text-warm-400 border border-warm-100">
            <div className="mb-2 flex justify-center"><CalendarDays className="h-7 w-7 text-warm-400" /></div>
            <p className="text-sm">{t.chooseDayHint}</p>
          </div>
        )}
      </div>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showAddEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddEvent(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative z-10 w-full max-w-md max-h-[min(92dvh,720px)] overflow-y-auto overscroll-contain"
            >
              <div className="bg-white rounded-3xl shadow-cozy-lg p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-warm-800">{t.modalTitle}</h2>
                  <button onClick={() => setShowAddEvent(false)} className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-warm-50 border border-warm-200 flex items-center justify-center">
                      <CalendarDays size={20} className="text-warm-600" />
                    </div>
                    <div className="flex gap-1 items-center flex-wrap">
                      {EVENT_COLORS.map((c) => (
                        <button key={c} onClick={() => setNewEvent((p) => ({ ...p, color: c }))}
                          className={`w-6 h-6 rounded-full transition-all ${newEvent.color === c ? "ring-2 ring-offset-1 ring-warm-400 scale-110" : "hover:scale-105"}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>

                  <input value={newEvent.title} onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
                    placeholder={t.eventTitlePlaceholder} className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400" />

                  <input value={newEvent.description} onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
                    placeholder={t.eventDescriptionPlaceholder} className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400" />

                  <input type="date" value={newEvent.startDate} onChange={(e) => setNewEvent((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400" />

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newEvent.weeklyRepeat}
                        onChange={(e) => setNewEvent((p) => ({ ...p, weeklyRepeat: e.target.checked }))}
                        className="rounded accent-lavender-500"
                      />
                      <span className="text-sm text-warm-600">{t.repeatWeekly}</span>
                    </label>
                    {newEvent.weeklyRepeat && (
                      <select
                        value={newEvent.weeklyDay}
                        onChange={(e) => setNewEvent((p) => ({ ...p, weeklyDay: Number(e.target.value) }))}
                        className="bg-warm-50 rounded-xl px-3 py-2 text-sm outline-none border border-warm-200 focus:border-lavender-400"
                      >
                        {t.weekdays.map((w, idx) => (
                          <option key={w} value={idx + 1}>{w}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {!newEvent.allDay && (
                    <div className="grid grid-cols-2 gap-3">
                      <input type="time" value={newEvent.startTime} onChange={(e) => setNewEvent((p) => ({ ...p, startTime: e.target.value }))}
                        className="bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400" />
                      <input type="time" value={newEvent.endTime} onChange={(e) => setNewEvent((p) => ({ ...p, endTime: e.target.value }))}
                        className="bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400" />
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newEvent.allDay} onChange={(e) => setNewEvent((p) => ({ ...p, allDay: e.target.checked }))}
                      className="rounded accent-lavender-500" />
                    <span className="text-sm text-warm-600">{t.allDay}</span>
                  </label>

                  <input value={newEvent.location} onChange={(e) => setNewEvent((p) => ({ ...p, location: e.target.value }))}
                    placeholder={t.locationPlaceholder} className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400" />

                  <select value={newEvent.assigneeId} onChange={(e) => setNewEvent((p) => ({ ...p, assigneeId: e.target.value }))}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400">
                    <option value="">{t.assigneeOptional}</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  {!focusCalendarSlim ? (
                    <select value={newEvent.subscriptionId} onChange={(e) => setNewEvent((p) => ({ ...p, subscriptionId: e.target.value }))}
                      className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-lavender-400">
                      <option value="">{t.subscriptionOptional}</option>
                      {subscriptions.map((subscription) => <option key={subscription.id} value={subscription.id}>{subscription.title}</option>)}
                    </select>
                  ) : null}

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleAddEvent}
                    className="w-full py-3 bg-gradient-to-r from-lavender-500 to-lavender-400 text-white rounded-2xl font-semibold hover:shadow-cozy transition-all">
                    {t.addEventCta}
                  </motion.button>
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
