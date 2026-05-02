import { addDays, differenceInCalendarDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { utcRangeFromCalendarYmd } from "@/lib/calendar-tz";

export function minutesFromMidnightInTz(now: Date, timeZone: string): number {
  const h = Number.parseInt(formatInTimeZone(now, timeZone, "H"), 10);
  const m = Number.parseInt(formatInTimeZone(now, timeZone, "m"), 10);
  return h * 60 + m;
}

export function formatMinutesAsClock(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function calendarDaysSinceAnchor(anchorYmd: string, todayYmd: string, timeZone: string): number {
  const a = utcRangeFromCalendarYmd(anchorYmd, anchorYmd, timeZone).start;
  const b = utcRangeFromCalendarYmd(todayYmd, todayYmd, timeZone).start;
  return differenceInCalendarDays(b, a);
}

export function isReminderPingDay(
  anchorYmd: string | null | undefined,
  todayYmd: string,
  cadence: number | null | undefined,
  timeZone: string
): boolean {
  if (!anchorYmd || !cadence || cadence < 1) return false;
  const d = calendarDaysSinceAnchor(anchorYmd, todayYmd, timeZone);
  return d >= 0 && d % cadence === 0;
}

export function isInReminderWindow(
  now: Date,
  timeZone: string,
  startMin: number | null | undefined,
  endMin: number | null | undefined
): boolean {
  if (startMin == null || endMin == null) return false;
  if (startMin < 0 || endMin > 24 * 60 || startMin >= endMin) return false;
  const cur = minutesFromMidnightInTz(now, timeZone);
  return cur >= startMin && cur < endMin;
}

export function nextPingYmdFrom(
  anchorYmd: string,
  fromYmd: string,
  cadence: number,
  timeZone: string
): string {
  const d = calendarDaysSinceAnchor(anchorYmd, fromYmd, timeZone);
  if (d < 0) return anchorYmd;
  const mod = d % cadence;
  const add = mod === 0 ? 0 : cadence - mod;
  const base = utcRangeFromCalendarYmd(fromYmd, fromYmd, timeZone).start;
  const target = addDays(base, add);
  return formatInTimeZone(target, timeZone, "yyyy-MM-dd");
}

export function clampReminderCadence(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  const x = Math.floor(n);
  if (x < 1) return null;
  if (x > 365) return 365;
  return x;
}

export function clampWindowMinutes(n: number): number {
  if (!Number.isFinite(n)) return 9 * 60;
  const x = Math.floor(n);
  return Math.min(24 * 60 - 1, Math.max(0, x));
}
