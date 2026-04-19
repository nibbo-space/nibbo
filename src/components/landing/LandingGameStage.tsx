"use client";

import type { NibbyChatDrive } from "@/components/shared/NibbyAssistantStage";
import { LANDING_NIBBY_CHARGE_STAGE, LANDING_NIBBY_FAMILY_ID } from "@/lib/landing-nibby";
import { useHasMounted, useLandingReducedMotion } from "@/lib/landing-motion";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { I18N } from "@/lib/i18n";
import { motion, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import { useRef } from "react";

const NibbyAssistantStage = dynamic(
  () => import("@/components/shared/NibbyAssistantStage"),
  {
    ssr: false,
    loading: () => (
      <div
        className="aspect-[5/6] w-full max-w-[min(100%,400px)] animate-pulse rounded-2xl border-2 border-rose-200/80 bg-gradient-to-b from-cream-100 to-rose-50"
        aria-hidden
      />
    ),
  },
);

const FLOAT = [
  { left: "6%", top: "18%", size: 6, delay: 0 },
  { left: "14%", top: "42%", size: 5, delay: 0.4 },
  { left: "88%", top: "22%", size: 7, delay: 0.2 },
  { left: "92%", top: "48%", size: 4, delay: 0.6 },
  { left: "78%", top: "12%", size: 5, delay: 0.3 },
  { left: "22%", top: "58%", size: 4, delay: 0.5 },
] as const;

export function LandingGameStage({
  nibbyDriveRef,
}: {
  nibbyDriveRef: React.MutableRefObject<NibbyChatDrive>;
}) {
  const { language } = useAppLanguage();
  const t = I18N[language].landing;
  const mounted = useHasMounted();
  const reduced = useLandingReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start end", "end start"],
  });
  const skyY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -28]);
  const hillFarY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -40]);
  const hillNearY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -64]);
  const nibbyY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -18]);

  return (
    <div
      ref={wrapRef}
      className="relative isolate min-h-[min(52vh,600px)] w-full overflow-hidden bg-gradient-to-b from-transparent via-sage-50/20 to-rose-50/35 pb-10 pt-6 md:min-h-[min(50vh,640px)] md:pb-14 md:pt-8"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(251,113,133,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(251,113,133,0.07) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-[0.12]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent, transparent 3px, rgba(244,63,94,0.05) 3px, rgba(244,63,94,0.05) 4px)",
        }}
        aria-hidden
      />

      <motion.div
        style={mounted ? { y: skyY } : undefined}
        className="pointer-events-none absolute inset-x-0 top-[6%] z-0 h-[32%] opacity-90"
      >
        <div className="absolute left-[10%] top-0 h-20 w-36 rounded-full bg-lavender-100/85 blur-2xl max-md:h-14 max-md:w-28" />
        <div className="absolute right-[12%] top-[25%] h-16 w-44 rounded-full bg-white/90 blur-2xl max-md:h-12 max-md:w-32" />
        <div className="absolute left-1/2 top-[8%] h-14 w-32 -translate-x-1/2 rounded-full bg-rose-100/80 blur-2xl" />
      </motion.div>

      {mounted &&
        !reduced &&
        FLOAT.map((f, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute z-0 rounded-[2px] bg-white/50 shadow-sm ring-1 ring-rose-200/40"
            style={{ left: f.left, top: f.top, width: f.size, height: f.size }}
            animate={{ y: [0, -6, 0], opacity: [0.35, 0.65, 0.35] }}
            transition={{ duration: 3.2 + i * 0.2, repeat: Infinity, delay: f.delay, ease: "easeInOut" }}
            aria-hidden
          />
        ))}

      <span
        className="pointer-events-none absolute bottom-6 left-4 z-[5] hidden h-10 w-10 border-b-2 border-l-2 border-rose-400/45 md:block"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-6 right-4 z-[5] hidden h-10 w-10 border-b-2 border-r-2 border-rose-400/45 md:block"
        aria-hidden
      />

      <motion.div
        style={mounted ? { y: hillFarY } : undefined}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[min(32vh,300px)] w-full text-sage-200/65 md:h-[min(30vh,320px)]"
      >
        <svg className="block h-full w-full" viewBox="0 0 1440 280" preserveAspectRatio="none" aria-hidden>
          <path
            fill="currentColor"
            d="M0,210 C180,155 360,235 540,175 C720,118 900,205 1080,160 C1200,130 1320,185 1440,165 L1440,280 L0,280 Z"
          />
        </svg>
      </motion.div>

      <motion.div
        style={mounted ? { y: hillNearY } : undefined}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[min(26vh,240px)] w-full text-rose-200/85 md:h-[min(24vh,260px)]"
      >
        <svg className="block h-full w-full" viewBox="0 0 1440 260" preserveAspectRatio="none" aria-hidden>
          <path
            fill="currentColor"
            d="M0,225 C220,175 440,245 660,185 C820,135 980,215 1160,175 C1240,155 1340,200 1440,185 L1440,260 L0,260 Z"
          />
        </svg>
      </motion.div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2 w-full bg-gradient-to-r from-sage-200/50 via-rose-200/60 to-lavender-100/50" aria-hidden />

      <motion.div
        style={mounted ? { y: nibbyY } : undefined}
        className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center px-4 pb-2 pt-2 md:max-w-xl md:pt-4"
      >
        <h2 className="text-center font-display text-2xl font-extrabold tracking-tight text-warm-950 sm:text-3xl">
          {t.nibbyStageWelcome}
        </h2>
        <p className="mt-2 max-w-md text-pretty text-center text-sm leading-relaxed text-warm-600 sm:text-base">
          {t.nibbyStageSubtitle}
        </p>

        <div className="relative mt-8 w-full max-w-[400px]">
          <div
            className="pointer-events-none absolute -inset-1 rounded-[2rem] border-2 border-dashed border-rose-300/55 md:-inset-2 md:rounded-[2.25rem]"
            aria-hidden
          />
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
      </motion.div>
    </div>
  );
}
