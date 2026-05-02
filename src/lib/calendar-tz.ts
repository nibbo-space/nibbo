import { endOfDay, startOfDay, startOfWeek, subDays } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const DEFAULT_TIME_ZONE = "Europe/Kyiv";

export function zonedStartOfTodayUtc(now = new Date(), timeZone = DEFAULT_TIME_ZONE): Date {
  const z = toZonedTime(now, timeZone);
  return fromZonedTime(startOfDay(z), timeZone);
}

export function zonedStartOfWeekUtc(now = new Date(), timeZone = DEFAULT_TIME_ZONE): Date {
  const z = toZonedTime(now, timeZone);
  return fromZonedTime(startOfWeek(z, { weekStartsOn: 1 }), timeZone);
}

export function formatYmdInTimeZone(instant: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
}

export function utcRangeFromCalendarYmd(
  startYmd: string,
  endYmd: string,
  timeZone = DEFAULT_TIME_ZONE
): { start: Date; end: Date } {
  const [ys, ms, ds] = startYmd.split("-").map((x) => parseInt(x, 10));
  const [ye, me, de] = endYmd.split("-").map((x) => parseInt(x, 10));
  const zs = new Date(ys, ms - 1, ds);
  const ze = new Date(ye, me - 1, de);
  return {
    start: fromZonedTime(startOfDay(zs), timeZone),
    end: fromZonedTime(endOfDay(ze), timeZone),
  };
}

export function calendarYmdMinusDays(
  endYmd: string,
  inclusiveSpan: number,
  timeZone = DEFAULT_TIME_ZONE
): string {
  const { start } = utcRangeFromCalendarYmd(endYmd, endYmd, timeZone);
  return formatYmdInTimeZone(subDays(start, inclusiveSpan - 1), timeZone);
}

export function shiftCalendarYmd(ymd: string, deltaDays: number, timeZone = DEFAULT_TIME_ZONE): string {
  const { start } = utcRangeFromCalendarYmd(ymd, ymd, timeZone);
  return formatYmdInTimeZone(subDays(start, deltaDays), timeZone);
}

export function shiftCalendarYm(ym: string, deltaMonths: number): string {
  const [y0, m0] = ym.split("-").map((x) => parseInt(x, 10));
  let y = y0;
  let m = m0 + deltaMonths;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function calendarMonthRangeUtcFromYm(ym: string, timeZone = DEFAULT_TIME_ZONE): { start: Date; end: Date } {
  const [y, m] = ym.split("-").map((x) => parseInt(x, 10));
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastD = new Date(y, m, 0).getDate();
  const last = `${y}-${String(m).padStart(2, "0")}-${String(lastD).padStart(2, "0")}`;
  return utcRangeFromCalendarYmd(first, last, timeZone);
}
