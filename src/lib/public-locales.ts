export const PUBLIC_LOCALES = ["en", "uk", "ja"] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];
export const DEFAULT_PUBLIC_LOCALE: PublicLocale = "en";

export function isPublicLocale(value: string | undefined | null): value is PublicLocale {
  return !!value && (PUBLIC_LOCALES as readonly string[]).includes(value);
}

export function normalizePublicLocale(value: string | undefined | null): PublicLocale {
  if (!value) return DEFAULT_PUBLIC_LOCALE;
  const v = value.trim().toLowerCase();
  return isPublicLocale(v) ? v : DEFAULT_PUBLIC_LOCALE;
}

export function htmlLangFor(locale: PublicLocale): string {
  if (locale === "uk") return "uk-UA";
  if (locale === "ja") return "ja-JP";
  return "en-US";
}

export function localeHref(locale: PublicLocale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean === "/") return `/${locale}`;
  return `/${locale}${clean}`;
}

export function buildLanguageAlternates(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of PUBLIC_LOCALES) {
    out[l] = localeHref(l, path);
  }
  out["x-default"] = localeHref(DEFAULT_PUBLIC_LOCALE, path);
  return out;
}
