"use client";

import { LandingSceneCaption } from "@/components/landing/LandingSceneCaption";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useLandingReducedMotion } from "@/lib/landing-motion";
import { I18N, messageLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Sparkles, Swords } from "lucide-react";

const STICKERS = [
  {
    emoji: "✨",
    key: "first-steps",
    unlocked: true,
    border: "border-rose-400",
    bg: "from-rose-100 via-orange-50 to-amber-50",
    tilt: "-rotate-[2.5deg]",
  },
  {
    emoji: "🏠",
    key: "warm-routine",
    unlocked: true,
    border: "border-amber-400",
    bg: "from-amber-100 via-yellow-50 to-lime-50",
    tilt: "rotate-[2deg]",
  },
  {
    emoji: "🐾",
    key: "nibby-blob-friend",
    unlocked: true,
    border: "border-sky-400",
    bg: "from-sky-100 via-cyan-50 to-teal-50",
    tilt: "-rotate-[1deg]",
  },
  {
    emoji: "⚔️",
    key: "secretFamilyBattleWins10",
    unlocked: false,
    border: "border-stone-300/80",
    bg: "from-stone-100 to-stone-200/90",
    tilt: "rotate-[1.5deg]",
  },
] as const;

export function LandingScenePlay({ active }: { active: boolean }) {
  const { language } = useAppLanguage();
  const ml = messageLocale(language);
  const t = I18N[ml].landing;
  const ach = I18N[ml].achievements;
  const fb = ach.familyBattle;
  const badges = ach.badges as Record<string, string>;
  const reduced = useLandingReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute bottom-[30%] left-3 top-4 z-10 flex w-[min(94%,400px)] flex-col gap-2.5 overflow-hidden md:bottom-[28%] md:left-6 md:top-6"
        initial={reduced ? false : { opacity: 0, x: -18 }}
        animate={active ? { opacity: 1, x: 0 } : { opacity: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="rounded-3xl border border-warm-100 bg-white/80 p-3.5 shadow-cozy backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">{ach.familyLevelEyebrow}</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-3xl font-bold text-warm-800">12</p>
              <p className="text-xs text-warm-500">{ach.familyTotalXpShort}: 1,850</p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-lavender-100 to-rose-100 px-2.5 py-1.5 text-xs font-bold text-warm-800 ring-1 ring-lavender-200">
              <Sparkles className="h-3.5 w-3.5 text-rose-500" />
              {ach.familyLevelBadge.replace("{level}", "12")}
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10px] font-semibold text-warm-500">
              <span>{ach.familyLevelXpToNext.replace("{current}", "150").replace("{need}", "200").replace("{next}", "13")}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-warm-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 via-peach-300 to-lavender-400"
                initial={false}
                animate={active ? { width: "75%" } : { width: "0%" }}
                transition={{ duration: reduced ? 0 : 1 }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-3xl border-2 border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-lavender-50 p-3 shadow-cozy">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-peach-400 text-white shadow-md ring-2 ring-white/80">
            <Swords className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500">{fb.eyebrow}</p>
            <p className="truncate text-sm font-bold text-warm-800">{fb.cardCtaTitle}</p>
            <p className="truncate text-[11px] text-warm-600">{fb.cardCtaSubtitle}</p>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 content-start overflow-hidden">
          {STICKERS.map((s, i) => (
            <motion.div
              key={s.key}
              initial={reduced ? false : { opacity: 0, scale: 0.92 }}
              animate={active ? { opacity: 1, scale: 1 } : { opacity: 0 }}
              transition={{ delay: reduced ? 0 : 0.08 + i * 0.05 }}
              className={cn(
                "rounded-3xl border-[3px] bg-gradient-to-br p-2.5 shadow-cozy",
                s.border,
                s.bg,
                s.tilt,
                !s.unlocked && "opacity-70",
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-[1.25rem] border-[3px] bg-white text-2xl",
                  s.border,
                )}
              >
                {s.emoji}
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] font-bold leading-tight text-warm-800">
                {badges[s.key] ?? s.key}
              </p>
              <span
                className={cn(
                  "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
                  s.unlocked ? "bg-sage-500 text-white" : "bg-warm-200 text-warm-600",
                )}
              >
                {s.unlocked ? ach.unlocked : ach.locked}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <LandingSceneCaption title={t.scenePlayTitle} body={t.scenePlayBody} />
    </div>
  );
}
