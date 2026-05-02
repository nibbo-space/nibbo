import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { DEFAULT_TIME_ZONE } from "@/lib/calendar-tz";

export const DEFAULT_EVENT_TIME_ZONE = DEFAULT_TIME_ZONE;

function hasExplicitUtcOrOffset(s: string): boolean {
  const t = s.trim();
  if (/Z$/i.test(t)) return true;
  return /[+-]\d{2}:\d{2}$/.test(t) || /[+-]\d{4}$/.test(t);
}

export function parseEventInstantForUserTz(raw: unknown, timeZone: string): Date | null {
  if (raw === null || raw === undefined) return null;
  const s0 = String(raw).trim();
  if (!s0) return null;
  const tz = timeZone.trim() || DEFAULT_EVENT_TIME_ZONE;
  if (hasExplicitUtcOrOffset(s0)) {
    const d = new Date(s0);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = s0.includes("T") ? s0.replace(" ", "T") : `${s0}T00:00:00`;
  try {
    const d = fromZonedTime(s, tz);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function formatEventInstantForAssistant(d: Date, timeZone: string): string {
  const tz = timeZone.trim() || DEFAULT_EVENT_TIME_ZONE;
  return formatInTimeZone(d, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

export function formatEventDayForAssistant(d: Date, timeZone: string): string {
  const tz = timeZone.trim() || DEFAULT_EVENT_TIME_ZONE;
  return formatInTimeZone(d, tz, "yyyy-MM-dd");
}
