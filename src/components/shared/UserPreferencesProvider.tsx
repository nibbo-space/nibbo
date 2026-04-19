"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_APP_TIME_ZONE } from "@/lib/kyiv-range";
import type { SupportedCurrency } from "@/lib/exchange-rates";
import { isSupportedCurrency } from "@/lib/exchange-rates";

type UserPreferencesContextValue = {
  displayCurrency: SupportedCurrency;
  timeZone: string;
  assistantEnabled: boolean;
  assistantMascotSeed: string;
};

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({
  displayCurrency,
  timeZone,
  assistantEnabled,
  assistantMascotSeed,
  children,
}: {
  displayCurrency: string;
  timeZone: string;
  assistantEnabled: boolean;
  assistantMascotSeed: string;
  children: React.ReactNode;
}) {
  const value = useMemo((): UserPreferencesContextValue => {
    const dc = isSupportedCurrency(String(displayCurrency || "").toUpperCase())
      ? (String(displayCurrency).toUpperCase() as SupportedCurrency)
      : "USD";
    const tz = String(timeZone || "").trim() || DEFAULT_APP_TIME_ZONE;
    const seed = String(assistantMascotSeed || "").trim() || "solo";
    return {
      displayCurrency: dc,
      timeZone: tz,
      assistantEnabled: Boolean(assistantEnabled),
      assistantMascotSeed: seed,
    };
  }, [assistantEnabled, assistantMascotSeed, displayCurrency, timeZone]);

  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>;
}

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) {
    return {
      displayCurrency: "USD",
      timeZone: DEFAULT_APP_TIME_ZONE,
      assistantEnabled: false,
      assistantMascotSeed: "solo",
    };
  }
  return ctx;
}
