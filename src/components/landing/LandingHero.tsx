"use client";

import { LandingGameMenuNav } from "@/components/landing/LandingGameMenuNav";
import { LandingGameStage } from "@/components/landing/LandingGameStage";
import type { NibbyChatDrive } from "@/components/shared/NibbyAssistantStage";
import { useHasMounted, useLandingReducedMotion } from "@/lib/landing-motion";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

export function LandingHero({ nibbyDriveRef }: { nibbyDriveRef: React.MutableRefObject<NibbyChatDrive> }) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].landing;
  const mounted = useHasMounted();
  const reduced = useLandingReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  const [glow, setGlow] = useState({ x: 50, y: 42 });

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroLift = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -32]);
  const heroFade = useTransform(scrollYProgress, [0, 0.75, 1], [1, 1, reduced ? 1 : 0.45]);

  const onHeroPointer = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (reduced) return;
      const r = e.currentTarget.getBoundingClientRect();
      setGlow({
        x: ((e.clientX - r.left) / Math.max(r.width, 1)) * 100,
        y: ((e.clientY - r.top) / Math.max(r.height, 1)) * 100,
      });
    },
    [reduced],
  );

  return (
    <header
      ref={heroRef}
      onPointerMove={onHeroPointer}
      className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-cream-50 via-rose-50/40 to-lavender-50/25"
      style={
        reduced
          ? undefined
          : ({
              ["--landing-glow-x" as string]: `${glow.x}%`,
              ["--landing-glow-y" as string]: `${glow.y}%`,
            } as React.CSSProperties)
      }
    >
      {!reduced && (
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 90% 50% at var(--landing-glow-x,50%) var(--landing-glow-y,28%), rgba(251,207,232,0.42) 0%, transparent 50%), radial-gradient(ellipse 60% 45% at 15% 85%, rgba(221,214,254,0.35) 0%, transparent 48%)",
          }}
          aria-hidden
        />
      )}

      <LandingGameMenuNav />

      <motion.div
        style={mounted ? { y: heroLift, opacity: heroFade } : undefined}
        className="relative z-10 flex flex-1 flex-col gap-10 px-4 pb-10 pt-0 md:gap-14 md:px-6 md:pb-14 md:pt-2"
      >
        {/* Headline + CTA — clean, no perk cards */}
        <div className="relative z-20 mx-auto flex w-full max-w-4xl shrink-0 flex-col items-center text-center">
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="inline-flex items-center gap-2 rounded-full border-2 border-rose-200/90 bg-white/90 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-rose-600 shadow-sm"
          >
            🏠 {t.eyebrow}
          </motion.p>

          <motion.h1
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduced ? 0 : 0.05 }}
            className="font-display mt-6 text-balance text-[clamp(2.4rem,7vw,4.2rem)] font-extrabold leading-[1.04] tracking-tight text-warm-950"
          >
            {t.heroTitle}
          </motion.h1>

          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: reduced ? 0 : 0.1 }}
            className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-warm-600 sm:text-lg"
          >
            {t.heroLead}
          </motion.p>

          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: reduced ? 0 : 0.2 }}
            className="mt-10 flex w-full max-w-md flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-rose-500 bg-gradient-to-b from-rose-400 to-rose-600 px-8 py-4 font-display text-base font-extrabold text-white shadow-[0_6px_0_#be123c] transition-transform active:translate-y-1 active:shadow-none sm:w-auto"
            >
              <Image src="/favicon.svg" alt="" width={22} height={22} />
              {t.ctaSignIn}
            </Link>
            <a
              href="#landing-journey"
              className="inline-flex w-full items-center justify-center rounded-2xl border-[3px] border-warm-300/90 bg-cream-50/90 px-8 py-4 font-display text-base font-extrabold text-warm-800 shadow-[0_6px_0_0_rgba(120,113,108,0.25)] transition-transform active:translate-y-1 active:shadow-none sm:w-auto"
            >
              {t.ctaFeatures}
            </a>
          </motion.div>

          <motion.p
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: reduced ? 0 : 0.3 }}
            className="mt-4 text-xs font-semibold text-warm-400"
          >
            ✦ Free forever · No credit card · All features included
          </motion.p>
        </div>

        {/* Nibby stage */}
        <div className="relative left-1/2 z-10 mt-auto w-screen max-w-none shrink-0 -translate-x-1/2 pt-6 md:pt-10">
          <LandingGameStage nibbyDriveRef={nibbyDriveRef} />
        </div>
      </motion.div>
    </header>
  );
}
