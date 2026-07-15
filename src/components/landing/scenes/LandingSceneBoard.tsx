"use client";

import { LandingSceneCaption } from "@/components/landing/LandingSceneCaption";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useLandingReducedMotion } from "@/lib/landing-motion";
import { I18N, messageLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Home } from "lucide-react";

const ROWS = [
  { rank: 1, xp: 1850, level: 12, pct: 100, highlight: true },
  { rank: 2, xp: 1240, level: 9, pct: 67 },
  { rank: 3, xp: 980, level: 8, pct: 53 },
  { rank: 4, xp: 810, level: 7, pct: 44 },
  { rank: 5, xp: 670, level: 6, pct: 36 },
] as const;

function rankDotClass(rank: number): string {
  const colors = ["bg-rose-400", "bg-peach-400", "bg-lavender-400", "bg-sage-500", "bg-rose-500"];
  return colors[(Math.max(1, rank) - 1) % colors.length]!;
}

export function LandingSceneBoard({ active }: { active: boolean }) {
  const { language } = useAppLanguage();
  const ml = messageLocale(language);
  const t = I18N[ml].landing;
  const ach = I18N[ml].achievements;
  const reduced = useLandingReducedMotion();
  const names = t.leaderboardDemoNames;
  const leader = ROWS[0];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute bottom-[30%] left-3 top-4 z-10 flex w-[min(94%,380px)] flex-col gap-2.5 overflow-hidden md:bottom-[28%] md:left-6 md:top-6"
        initial={reduced ? false : { opacity: 0, x: -18 }}
        animate={active ? { opacity: 1, x: 0 } : { opacity: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="rounded-3xl border border-warm-100 bg-white/80 p-3.5 shadow-cozy backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">{ach.rankingTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-warm-500">{ach.rankingSubtitle}</p>
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={active ? { opacity: 1, y: 0 } : { opacity: 0 }}
          className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-lavender-50 p-3.5 shadow-cozy"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-200 via-peach-100 to-lavender-200 shadow-md ring-2 ring-white">
              <Home className="h-5 w-5 text-rose-600" />
              <span className="absolute -right-1 -top-1 text-sm" aria-hidden>
                👑
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold text-warm-800">{names[0]}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                  {ach.familyLevelBadge.replace("{level}", String(leader.level))}
                </span>
                <span className="rounded-full bg-warm-800 px-2 py-0.5 text-[10px] font-bold text-white">
                  {leader.pct}% · {leader.xp} XP
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden rounded-3xl border border-warm-100 bg-white/80 p-2.5 shadow-cozy backdrop-blur-md">
          {ROWS.slice(1).map((row, i) => (
            <motion.div
              key={row.rank}
              initial={reduced ? false : { opacity: 0, x: 10 }}
              animate={active ? { opacity: 1, x: 0 } : { opacity: 0 }}
              transition={{ delay: reduced ? 0 : 0.1 + i * 0.05 }}
              className="flex items-center gap-2.5 rounded-2xl border border-warm-100 bg-white/90 px-2.5 py-2"
            >
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", rankDotClass(row.rank))} />
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-100 text-warm-600 ring-1 ring-warm-100">
                <Home className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-warm-800">{names[i + 1]}</p>
                <p className="text-[10px] text-warm-500">
                  {ach.familyLevelBadge.replace("{level}", String(row.level))}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-extrabold text-warm-800">{row.xp}</p>
                <p className="text-[10px] text-warm-400">{t.leaderboardXpShort}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <LandingSceneCaption title={t.sceneBoardTitle} body={t.sceneBoardBody} />
    </div>
  );
}
