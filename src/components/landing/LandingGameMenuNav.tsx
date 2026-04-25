"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { isPublicLocale } from "@/lib/public-locales";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function LandingGameMenuNav() {
  const { language, setLanguage, locales } = useAppLanguage();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const t = I18N[messageLocale(language)].landing;
  const tRoot = I18N[messageLocale(language)];

  const switchLocale = (code: string) => {
    setLanguage(code);
    if (!isPublicLocale(code)) return;
    const m = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
    const tail = m && isPublicLocale(m[1]) ? m[2] ?? "" : pathname === "/" ? "" : pathname;
    router.push(`/${code}${tail}`);
  };

  return (
    <nav
      className="relative z-30 mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:px-5 md:pt-[calc(env(safe-area-inset-top,0px)+1rem)]"
      aria-label="Nibbo"
    >
      <Link
        href={`/${language}`}
        className="flex shrink-0 items-center gap-2 rounded-xl border-2 border-rose-200/70 bg-white/80 px-2.5 py-1.5 shadow-sm backdrop-blur-sm"
      >
        <Image src="/favicon.svg" alt="" width={26} height={26} className="shrink-0" />
        <span className="font-display text-base font-extrabold tracking-tight text-warm-900 sm:text-lg">Nibbo</span>
      </Link>
      <div className="flex shrink-0 items-center gap-1.5">
        <div
          className="flex rounded-lg border-2 border-rose-200/80 bg-white/90 p-0.5 shadow-sm"
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
                  "rounded-md px-2 py-1 font-mono text-[10px] font-bold sm:px-2.5 sm:text-[11px]",
                  active ? "bg-rose-100 text-rose-700" : "text-warm-600 hover:bg-rose-50/80",
                )}
              >
                {loc.code.toUpperCase()}
              </button>
            );
          })}
        </div>
        <Link
          href="/login"
          className="rounded-xl border-2 border-rose-400 bg-gradient-to-b from-rose-400 to-rose-600 px-3 py-2 font-display text-xs font-extrabold text-white shadow-[0_4px_0_#be123c] transition-transform active:translate-y-0.5 active:shadow-none sm:px-4 sm:text-sm"
        >
          {t.ctaSignIn}
        </Link>
      </div>
    </nav>
  );
}
