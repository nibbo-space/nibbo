"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LandingChrome({ variant = "cozy" }: { variant?: "cozy" | "hud" }) {
  const { language, setLanguage, locales } = useAppLanguage();
  const tRoot = I18N[messageLocale(language)];
  const hud = variant === "hud";

  return (
    <div
      className={cn(
        "fixed right-4 top-4 z-[100] flex items-center gap-0.5 px-1 py-1 md:right-6 md:top-6",
        hud
          ? "rounded-lg border-2 border-rose-300/70 bg-cream-50/95 font-mono shadow-[0_0_0_1px_rgba(253,164,175,0.35),0_10px_36px_-8px_rgba(244,63,94,0.18)] backdrop-blur-md"
          : "rounded-xl border border-warm-200/90 bg-white/95 shadow-lg backdrop-blur-md",
      )}
      aria-label={tRoot.languageLabel}
    >
      {locales.map((loc) => {
        const active = language.toLowerCase() === loc.code.toLowerCase();
        return (
          <button
            key={loc.code}
            type="button"
            title={loc.name}
            onClick={() => setLanguage(loc.code)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
              hud && "tracking-wide",
              active ? "bg-rose-100 text-rose-700" : "text-warm-600 hover:bg-rose-50/80",
            )}
          >
            {loc.code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
