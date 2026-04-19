"use client";

import { Palette } from "lucide-react";
import { CozySeasonMode } from "@/lib/cozy-config";
import { useCozyConfig } from "@/hooks/useCozyConfig";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { I18N } from "@/lib/i18n";

export default function CozyThemeToggle() {
  const { config, updateConfig } = useCozyConfig();
  const { language } = useAppLanguage();
  const t = I18N[language].cozyTheme;

  return (
    <div className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-xl border border-warm-200 bg-white/75 backdrop-blur-sm">
      <Palette size={14} className="text-warm-500" />
      <select
        value={config.seasonMode}
        onChange={(e) => updateConfig({ seasonMode: e.target.value as CozySeasonMode })}
        className="bg-transparent text-xs text-warm-700 font-medium outline-none cursor-pointer"
        aria-label={t.ariaLabel}
      >
        <option value="auto">Auto</option>
        <option value="spring">{t.spring}</option>
        <option value="summer">{t.summer}</option>
        <option value="autumn">{t.autumn}</option>
        <option value="winter">{t.winter}</option>
      </select>
      <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-warm-100 text-warm-500 uppercase">{config.mascot}</span>
    </div>
  );
}
