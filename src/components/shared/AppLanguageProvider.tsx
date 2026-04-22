"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  APP_LANGUAGE_COOKIE_KEY,
  APP_LANGUAGE_KEY,
  resolveAppLanguage,
  type AppLanguage,
  type ResolveUiLanguageConfig,
  type UiLocaleOption,
} from "@/lib/i18n";

const LANGUAGE_EVENT = "nibbo:language-change";

function writeLanguageCookie(language: AppLanguage) {
  if (typeof document === "undefined") return;
  document.cookie = `${APP_LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=31536000; samesite=lax`;
}

type AppLanguageContextValue = {
  language: AppLanguage;
  setLanguage: (next: AppLanguage) => void;
  locales: UiLocaleOption[];
  resolveConfig: ResolveUiLanguageConfig;
};

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

export function AppLanguageProvider({
  initialLanguage,
  locales,
  defaultCode,
  children,
}: {
  initialLanguage: AppLanguage;
  locales: UiLocaleOption[];
  defaultCode: string;
  children: React.ReactNode;
}) {
  const resolveConfig = useMemo<ResolveUiLanguageConfig>(() => {
    const codes = locales.map((l) => l.code);
    const allowed = codes.length ? codes : ["en"];
    const def = allowed.includes(defaultCode) ? defaultCode : allowed[0] ?? "en";
    return { allowedCodes: allowed, defaultCode: def };
  }, [locales, defaultCode]);

  const normalizeLanguage = useCallback(
    (value: string | null | undefined): string => {
      const sys = typeof navigator !== "undefined" ? navigator.language : undefined;
      return resolveAppLanguage(value ?? undefined, sys, resolveConfig);
    },
    [resolveConfig]
  );

  const [language, setLanguageState] = useState<AppLanguage>(initialLanguage);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.lang = language;
    window.localStorage.setItem(APP_LANGUAGE_KEY, language);
    writeLanguageCookie(language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== APP_LANGUAGE_KEY) return;
      const next = normalizeLanguage(event.newValue);
      setLanguageState(next);
      document.documentElement.lang = next;
      writeLanguageCookie(next);
    };
    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<{ language?: AppLanguage }>).detail;
      const next = normalizeLanguage(detail?.language);
      setLanguageState(next);
      document.documentElement.lang = next;
      writeLanguageCookie(next);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(LANGUAGE_EVENT, onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LANGUAGE_EVENT, onCustom as EventListener);
    };
  }, [normalizeLanguage]);

  const setLanguage = useCallback(
    (next: AppLanguage) => {
      if (typeof window === "undefined") return;
      const allowed = new Set(resolveConfig.allowedCodes.map((c) => c.toLowerCase()));
      const key = next.trim().toLowerCase();
      if (!allowed.has(key)) return;
      setLanguageState(next);
      window.localStorage.setItem(APP_LANGUAGE_KEY, next);
      document.documentElement.lang = next;
      writeLanguageCookie(next);
      window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: { language: next } }));
    },
    [resolveConfig.allowedCodes]
  );

  const value = useMemo(
    () => ({ language, setLanguage, locales, resolveConfig }),
    [language, setLanguage, locales, resolveConfig]
  );

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function useAppLanguageContext() {
  const ctx = useContext(AppLanguageContext);
  if (!ctx) {
    return {
      language: "en" as AppLanguage,
      setLanguage: () => {},
      locales: [
        { code: "uk", name: "Ukrainian" },
        { code: "en", name: "English" },
      ],
      resolveConfig: { allowedCodes: ["uk", "en"], defaultCode: "en" },
    };
  }
  return ctx;
}
