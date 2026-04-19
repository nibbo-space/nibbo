"use client";

import { useAppLanguageContext } from "@/components/shared/AppLanguageProvider";

export function useAppLanguage() {
  return useAppLanguageContext();
}
