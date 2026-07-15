"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { I18N, messageLocale } from "@/lib/i18n";
import { isPublicLocale } from "@/lib/public-locales";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";

export function LandingLocaleSwitch({ className }: { className?: string }) {
  const { language, setLanguage, locales } = useAppLanguage();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const tRoot = I18N[messageLocale(language)];

  const switchLocale = (code: string) => {
    setLanguage(code);
    if (!isPublicLocale(code)) return;
    const m = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
    const tail = m && isPublicLocale(m[1]) ? m[2] ?? "" : pathname === "/" ? "" : pathname;
    router.push(`/${code}${tail}`);
  };

  return (
    <div
      className={cn("flex rounded-full bg-white/80 p-0.5 ring-1 ring-ink-100 backdrop-blur-sm", className)}
      aria-label={tRoot.languageLabel}
    >
      {locales.map((loc) => {
        const active = language.toLowerCase() === loc.code.toLowerCase();
        return (
          <button
            key={loc.code}
            type="button"
            title={loc.name}
            onClick={() => switchLocale(loc.code)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide",
              active ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900",
            )}
          >
            {loc.code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
