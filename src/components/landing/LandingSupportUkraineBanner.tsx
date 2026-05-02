"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";

export function LandingSupportUkraineBanner() {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].landing;

  return (
    <div className="relative z-10 w-full" role="note">
      <div className="bg-[#0057B7] px-4 py-3 text-center text-sm font-bold text-white sm:text-base">
        {t.supportUkraineTitle}
      </div>
      <div className="bg-[#FFD700] px-4 py-2.5 text-center text-sm font-semibold leading-snug text-[#1a1a1a] sm:text-[0.9375rem]">
        {t.supportUkraineSubtitle}
      </div>
    </div>
  );
}
