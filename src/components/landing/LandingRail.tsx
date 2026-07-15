"use client";

import { LandingLocaleSwitch } from "@/components/landing/LandingLocaleSwitch";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { LANDING_CHAPTERS } from "@/lib/landing-chapters";
import { useLandingReducedMotion } from "@/lib/landing-motion";
import { I18N, messageLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export function LandingRail({
  chapter,
  onSelectChapter,
}: {
  chapter: number;
  onSelectChapter: (index: number) => void;
}) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].landing;
  const reduced = useLandingReducedMotion();
  const labels = LANDING_CHAPTERS.map((c) => t[c.labelKey]);

  return (
    <aside className="relative z-20 flex h-full w-full flex-col justify-between px-6 py-6 md:px-8 md:py-8 lg:px-10">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/${language}`} className="flex items-center gap-2.5">
          <Image src="/favicon.svg" alt="" width={26} height={26} />
          <span className="text-sm font-bold text-ink-500">Nibbo</span>
        </Link>
        <LandingLocaleSwitch />
      </div>

      <div className="my-8 flex flex-1 flex-col justify-center md:my-0">
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-landing-display text-[clamp(3.5rem,8vw,5.5rem)] font-extrabold leading-[0.92] tracking-tight text-ink-900"
        >
          Nibbo
        </motion.p>
        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: reduced ? 0 : 0.08 }}
          className="mt-5 max-w-[16ch] text-balance font-landing-display text-xl font-semibold leading-snug text-ink-700 sm:text-2xl"
        >
          {t.heroTitle}
        </motion.h1>
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: reduced ? 0 : 0.14 }}
          className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-ink-500 sm:text-base"
        >
          {t.heroLead}
        </motion.p>

        <nav className="mt-8" aria-label={t.journeyProgressAria}>
          <ol className="flex flex-col gap-2.5">
            {labels.map((label, i) => {
              const active = chapter === i;
              const done = i < chapter;
              return (
                <li key={LANDING_CHAPTERS[i].id}>
                  <button
                    type="button"
                    onClick={() => onSelectChapter(i)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors",
                      active ? "text-ink-900" : "text-ink-400 hover:text-ink-700",
                    )}
                  >
                    <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                      <motion.span
                        layout
                        className={cn(
                          "rounded-full",
                          active ? "h-3 w-3 bg-coral-400" : done ? "h-2 w-2 bg-sage-400" : "h-2 w-2 bg-ink-200",
                        )}
                        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 28 }}
                      />
                      {i < labels.length - 1 && (
                        <span
                          className={cn(
                            "absolute left-1/2 top-3 h-5 w-px -translate-x-1/2",
                            done ? "bg-sage-300" : "bg-ink-100",
                          )}
                          aria-hidden
                        />
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-bold tracking-wide transition-transform",
                        active && "translate-x-0.5",
                      )}
                    >
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-ink-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-coral-400 to-sage-400"
              initial={false}
              animate={{ width: `${((chapter + 1) / LANDING_CHAPTERS.length) * 100}%` }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 22 }}
            />
          </div>
        </nav>
      </div>

      <div className="space-y-3">
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-coral-400 px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_-12px_rgba(232,61,80,0.65)] transition hover:bg-coral-500 active:scale-[0.98]"
        >
          <Image src="/favicon.svg" alt="" width={18} height={18} />
          {t.ctaSignIn}
        </Link>
        <p className="text-center text-[11px] font-semibold text-ink-400">{t.trustLine}</p>
      </div>
    </aside>
  );
}
