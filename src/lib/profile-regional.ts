import { DEFAULT_APP_TIME_ZONE } from "@/lib/kyiv-range";

export const DISPLAY_CURRENCY_CODES = ["UAH", "USD", "EUR", "GBP", "JPY"] as const;

export type DisplayCurrencyCode = (typeof DISPLAY_CURRENCY_CODES)[number];

export const PROFILE_TIME_ZONES: readonly string[] = [
  "UTC",
  "Europe/Kyiv",
  "Europe/Warsaw",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Prague",
  "Europe/Vienna",
  "Europe/Athens",
  "Europe/Helsinki",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Europe/Istanbul",
  "Asia/Tbilisi",
  "Asia/Yerevan",
  "Asia/Baku",
  "Asia/Tashkent",
  "Asia/Almaty",
  "Asia/Dubai",
  "Asia/Jerusalem",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
];

export function normalizeProfileTimeZone(value: string | null | undefined): string {
  const v = String(value || "").trim();
  if (!v) return DEFAULT_APP_TIME_ZONE;
  if (PROFILE_TIME_ZONES.includes(v)) return v;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: v });
    return v;
  } catch {
    return DEFAULT_APP_TIME_ZONE;
  }
}
