import {
  ACHIEVEMENT_BADGES_EN,
  ACHIEVEMENT_BADGES_UK,
  ACHIEVEMENT_BADGE_DESCRIPTIONS_EN,
  ACHIEVEMENT_BADGE_DESCRIPTIONS_UK,
  ACHIEVEMENT_BADGE_HINTS_EN,
  ACHIEVEMENT_BADGE_HINTS_UK,
} from "@/lib/achievements/badge-i18n";
import enRaw from "@/lib/locales/en.json";
import ukRaw from "@/lib/locales/uk.json";

export type AppLanguage = string;

export const APP_LANGUAGE_KEY = "nibbo:language";
export const APP_LANGUAGE_COOKIE_KEY = "nibbo_language";

export type UiLocaleOption = { code: string; name: string };

const BUNDLED_MESSAGE_KEYS = new Set(["uk", "en"]);

export function messageLocale(code: string): "uk" | "en" {
  const c = code.trim().toLowerCase();
  if (BUNDLED_MESSAGE_KEYS.has(c)) return c as "uk" | "en";
  return "en";
}

export function intlLocaleForUi(code: string): string {
  const c = code.trim().toLowerCase();
  if (c === "uk") return "uk-UA";
  if (c === "en") return "en-US";
  try {
    return new Intl.Locale(c).maximize().toString();
  } catch {
    return "en-US";
  }
}

export type ResolveUiLanguageConfig = {
  allowedCodes: string[];
  defaultCode: string;
};

export function resolveAppLanguage(
  cookieValue: string | undefined,
  acceptLanguage: string | null | undefined,
  config?: ResolveUiLanguageConfig
): string {
  const allowedRaw = config?.allowedCodes?.length
    ? config.allowedCodes.map((x) => x.trim().toLowerCase()).filter(Boolean)
    : ["uk", "en"];
  const allowed = new Set(allowedRaw.length ? allowedRaw : ["en"]);
  let defaultCode = (config?.defaultCode ?? [...allowed][0] ?? "en").trim().toLowerCase();
  if (!allowed.has(defaultCode)) defaultCode = [...allowed][0] ?? "en";

  const c = cookieValue?.trim().toLowerCase();
  if (c && allowed.has(c)) return c;

  if (acceptLanguage) {
    const single = acceptLanguage.trim();
    if (!single.includes(",")) {
      const m = single.toLowerCase().match(/^([a-z]{2,10})(?:[-_]|$)/);
      const code = m?.[1];
      if (code && allowed.has(code)) return code;
    }
    for (const part of acceptLanguage.split(",")) {
      const raw = part.trim().split(";")[0]?.trim().toLowerCase() ?? "";
      const short = raw.slice(0, 2);
      if (short && allowed.has(short)) return short;
      const full = raw.replace(/_/g, "-").split("-")[0] ?? "";
      if (full.length >= 2 && allowed.has(full.slice(0, 2))) return full.slice(0, 2);
    }
  }

  return defaultCode;
}

type Messages = typeof ukRaw;

function mergeAchievements(
  base: Messages,
  badges: Record<string, string>,
  hints: Record<string, string>,
  descriptions: Record<string, string>
): Messages {
  const a = base.achievements;
  return {
    ...base,
    achievements: {
      ...a,
      badges: { ...a.badges, ...badges },
      badgeHints: { ...a.badgeHints, ...hints },
      badgeDescriptions: { ...a.badgeDescriptions, ...descriptions },
    },
  };
}

export const I18N = {
  uk: mergeAchievements(ukRaw, ACHIEVEMENT_BADGES_UK, ACHIEVEMENT_BADGE_HINTS_UK, ACHIEVEMENT_BADGE_DESCRIPTIONS_UK),
  en: mergeAchievements(enRaw as Messages, ACHIEVEMENT_BADGES_EN, ACHIEVEMENT_BADGE_HINTS_EN, ACHIEVEMENT_BADGE_DESCRIPTIONS_EN),
} as const;

export type AppMessages = (typeof I18N)["uk"];
