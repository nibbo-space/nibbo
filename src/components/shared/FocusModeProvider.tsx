"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "nibbo:focus-mode";

type FocusModeContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  active: boolean;
  hydrated: boolean;
};

const FocusModeContext = createContext<FocusModeContextValue | null>(null);

export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    try {
      setEnabledState(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setEnabledState(false);
    }
    setHydrated(true);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    try {
      if (value) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const active = hydrated && enabled && narrow;

  const value = useMemo(
    (): FocusModeContextValue => ({
      enabled,
      setEnabled,
      active,
      hydrated,
    }),
    [enabled, setEnabled, active, hydrated]
  );

  return <FocusModeContext.Provider value={value}>{children}</FocusModeContext.Provider>;
}

export function useFocusMode(): FocusModeContextValue {
  const ctx = useContext(FocusModeContext);
  if (!ctx) {
    return {
      enabled: false,
      setEnabled: () => {},
      active: false,
      hydrated: true,
    };
  }
  return ctx;
}

export function useFocusModeActive(): boolean {
  return useFocusMode().active;
}
