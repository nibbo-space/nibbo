"use client";

import type { NibbyChatDrive } from "@/components/shared/NibbyAssistantStage";
import { LANDING_NIBBY_CHARGE_STAGE, LANDING_NIBBY_FAMILY_ID } from "@/lib/landing-nibby";
import { useHasMounted, useLandingReducedMotion } from "@/lib/landing-motion";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Gift, Star } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef } from "react";

const NibbyAssistantStage = dynamic(
  () => import("@/components/shared/NibbyAssistantStage"),
  {
    ssr: false,
    loading: () => (
      <div
        className="aspect-[5/6] w-full animate-pulse rounded-2xl bg-gradient-to-b from-cream-100 to-rose-50"
        aria-hidden
      />
    ),
  },
);

type FloatBadge = {
  label: string;
  icon: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  delay: number;
};

const FLOAT_BADGES: FloatBadge[] = [
  { label: "+10 XP", icon: "⚡", top: "10%", right: "-5%", delay: 0 },
  { label: "Task done!", icon: "✅", top: "42%", left: "-8%", delay: 0.35 },
  { label: "Level up!", icon: "🎉", bottom: "18%", right: "-4%", delay: 0.65 },
];

export function LandingNibbyIntroSlide() {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].landing;
  const mounted = useHasMounted();
  const reduced = useLandingReducedMotion();
  const nibbyDriveRef = useRef<NibbyChatDrive>({ speaking: false, lipPulse: 0 });

  return (
    <section id="landing-nibby-intro" className="scroll-mt-20">
      <div className="relative overflow-hidden rounded-2xl border-[3px] border-rose-200/75 bg-gradient-to-br from-lavender-50/90 via-white/90 to-rose-50/60 px-6 py-14 shadow-[0_10px_0_0_rgba(253,164,175,0.22),0_32px_64px_-24px_rgba(139,92,246,0.08)] sm:px-10 sm:py-20 md:rounded-[1.75rem] md:px-14 md:py-24">
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lavender-100/50 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-rose-100/40 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2 md:gap-16 lg:gap-20">
          {/* Text side */}
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-rose-500">
              ◇ {t.nibbySlideEyebrow} ◇
            </p>
            <h2 className="mt-3 font-display text-balance text-3xl font-extrabold leading-[1.08] tracking-tight text-warm-950 sm:text-4xl md:text-[2.65rem]">
              {t.nibbySlideTitle}
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-warm-700 sm:text-lg">
              {t.nibbySlideBody}
            </p>
            <p className="mt-4 rounded-xl border border-rose-100/90 bg-white/60 px-4 py-3 text-pretty text-sm font-medium leading-relaxed text-rose-800/95 sm:text-base">
              {t.nibbySlideUnique}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-200/90 bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-700 shadow-sm">
                <Gift className="h-4 w-4" strokeWidth={2.5} />
                {t.nibbyIntroBadgeFree}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-lavender-200/90 bg-lavender-50 px-4 py-2 text-sm font-extrabold text-lavender-700 shadow-sm">
                <Star className="h-4 w-4" strokeWidth={2.5} />
                {t.nibbyIntroBadgeAllFeatures}
              </span>
            </div>
          </div>

          {/* Nibby side */}
          <div className="relative mx-auto w-full max-w-[300px] md:mx-0 md:max-w-none">
            {/* Floating XP badges */}
            {mounted &&
              !reduced &&
              FLOAT_BADGES.map((b, i) => (
                <motion.div
                  key={i}
                  className="absolute z-20 flex items-center gap-1.5 rounded-full border-2 border-white bg-white/95 px-3 py-1.5 text-xs font-bold text-warm-800 shadow-lg"
                  style={{
                    top: b.top,
                    bottom: b.bottom,
                    left: b.left,
                    right: b.right,
                  }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: [0, -5, 0],
                  }}
                  transition={{
                    opacity: { delay: b.delay + 0.5, duration: 0.4 },
                    scale: { delay: b.delay + 0.5, duration: 0.4 },
                    y: { delay: b.delay + 0.5, duration: 2.8, repeat: Infinity, ease: "easeInOut" },
                  }}
                >
                  <span>{b.icon}</span>
                  <span>{b.label}</span>
                </motion.div>
              ))}

            {/* Nibby frame — same style as LandingGameStage */}
            <div className="relative overflow-hidden rounded-[1.75rem] border-[3px] border-rose-300/90 bg-gradient-to-b from-white via-cream-50/95 to-rose-50/85 p-2 shadow-[0_12px_0_0_rgba(190,24,93,0.12),0_28px_56px_-14px_rgba(244,63,94,0.22)] md:rounded-[2rem] md:p-3">
              <div className="pointer-events-none absolute inset-x-4 top-2 flex justify-between font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-rose-400/75">
                <span aria-hidden>◇</span>
                <span>{t.nibbyStageFrameTag}</span>
                <span aria-hidden>◇</span>
              </div>
              <div className="relative mt-6 aspect-[5/6] w-full overflow-hidden rounded-2xl border border-rose-100/80 bg-gradient-to-b from-rose-50/60 to-white/70">
                <div className="absolute inset-0 min-h-0">
                  <NibbyAssistantStage
                    familyId={LANDING_NIBBY_FAMILY_ID}
                    driveRef={nibbyDriveRef}
                    chargeStage={LANDING_NIBBY_CHARGE_STAGE}
                    reportBlobTaps={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
