import { endOfDay, startOfDay, startOfWeek, subDays } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const DEFAULT_APP_TIME_ZONE = "Europe/Kyiv";

export function kyivStartOfTodayUtc(now = new Date(), timeZone = DEFAULT_APP_TIME_ZONE): Date {
  const z = toZonedTime(now, timeZone);
  return fromZonedTime(startOfDay(z), timeZone);
}

export function kyivStartOfWeekUtc(now = new Date(), timeZone = DEFAULT_APP_TIME_ZONE): Date {
  const z = toZonedTime(now, timeZone);
  return fromZonedTime(startOfWeek(z, { weekStartsOn: 1 }), timeZone);
}

export function kyivCalendarYmd(now = new Date(), timeZone = DEFAULT_APP_TIME_ZONE): string {
  return formatInTimeZone(now, timeZone, "yyyy-MM-dd");
}

export function kyivInstantAsCalendarYmd(instant: Date, timeZone = DEFAULT_APP_TIME_ZONE): string {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
}

export function kyivRangeUtcFromCalendarYmd(
  startYmd: string,
  endYmd: string,
  timeZone = DEFAULT_APP_TIME_ZONE
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

export function kyivCalendarYmdMinusDays(
  endYmd: string,
  inclusiveSpan: number,
  timeZone = DEFAULT_APP_TIME_ZONE
): string {
  const { start } = kyivRangeUtcFromCalendarYmd(endYmd, endYmd, timeZone);
  return kyivInstantAsCalendarYmd(subDays(start, inclusiveSpan - 1), timeZone);
}

export function kyivShiftCalendarDays(ymd: string, deltaDays: number, timeZone = DEFAULT_APP_TIME_ZONE): string {
  const { start } = kyivRangeUtcFromCalendarYmd(ymd, ymd, timeZone);
  return kyivInstantAsCalendarYmd(subDays(start, deltaDays), timeZone);
}
