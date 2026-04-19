"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyCozyConfigToDocument,
  COZY_STORAGE_KEY,
  cozyMotion,
  CozyConfig,
  normalizeCozyConfig,
} from "@/lib/cozy-config";

const readSavedCozyConfig = (): CozyConfig => {
  if (typeof window === "undefined") return normalizeCozyConfig(null);
  try {
    const raw = window.localStorage.getItem(COZY_STORAGE_KEY);
    if (!raw) return normalizeCozyConfig(null);
    return normalizeCozyConfig(JSON.parse(raw) as Partial<CozyConfig>);
  } catch {
    return normalizeCozyConfig(null);
  }
};

export function useCozyConfig() {
  const [config, setConfig] = useState<CozyConfig>(() => normalizeCozyConfig(null));

  useEffect(() => {
    setConfig(readSavedCozyConfig());
  }, []);

  useEffect(() => {
    applyCozyConfigToDocument(config);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COZY_STORAGE_KEY, JSON.stringify(config));
    }
  }, [config]);

  const motion = useMemo(() => cozyMotion(config), [config]);

  const updateConfig = (next: Partial<CozyConfig>) => {
    setConfig((prev) => normalizeCozyConfig({ ...prev, ...next }));
  };

  return { config, motion, updateConfig };
}
