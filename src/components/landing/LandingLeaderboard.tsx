"use client";

import { useLandingReducedMotion } from "@/lib/landing-motion";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Trophy, Zap } from "lucide-react";

type FamilyEntry = { rank: number; name: string; emoji: string; xp: number; tasks: number; highlight?: boolean };

const FAMILIES: FamilyEntry[] = [
  { rank: 1, name: "The Mitchell Family",  emoji: "🦊", xp: 1850, tasks: 185, highlight: true },
  { rank: 2, name: "The Johnson Family",   emoji: "🐻", xp: 1240, tasks: 124 },
  { rank: 3, name: "The Rodriguez Family", emoji: "🦋", xp: 980,  tasks: 98  },
  { rank: 4, name: "The Kim Family",       emoji: "🌿", xp: 810,  tasks: 81  },
  { rank: 5, name: "The Thompson Family",  emoji: "⭐", xp: 670,  tasks: 67  },
];

const STATS = [
  { label: "Always free",       value: "∞"  },
  { label: "Modules included",  value: "6"  },
  { label: "Open beta",         value: "🚀" },
] as const;

const RANK_STYLE: Record<number, string> = {
  1: "bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-sm",
  2: "bg-gradient-to-br from-slate-300 to-slate-400 text-white",
  3: "bg-gradient-to-br from-amber-600 to-amber-700 text-white",
};

export function LandingLeaderboard() {
  const reduced = useLandingReducedMotion();

  return (
    <section id="landing-leaderboard" className="scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border-[3px] border-rose-200/75 bg-gradient-to-br from-white/95 via-cream-50/60 to-lavender-50/40 p-6 shadow-[0_10px_0_0_rgba(253,164,175,0.2),0_28px_48px_-20px_rgba(244,63,94,0.1)] sm:p-8 md:rounded-[1.75rem] md:p-10">
        <div className="mb-8 text-center md:text-left">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-rose-500">◇ Leaderboard ◇</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-warm-950 sm:text-3xl md:text-4xl">
            See how families play together
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-warm-600 md:mx-0 sm:text-base">
            Complete tasks, earn XP, climb the leaderboard. These are example families — yours could be here too.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:gap-8 lg:gap-12">
          {/* Leaderboard rows */}
          <div className="space-y-2.5">
            {FAMILIES.map((f, i) => (
              <motion.div
                key={f.rank}
                initial={false}
                transition={{ duration: 0.35, delay: reduced ? 0 : i * 0.06 }}
                whileHover={reduced ? {} : { x: 4, transition: { duration: 0.18 } }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors duration-200 sm:gap-4 sm:px-5 sm:py-3.5",
                  f.highlight
                    ? "border-rose-300/80 bg-gradient-to-r from-rose-50 via-white to-lavender-50/60 shadow-[0_4px_0_0_rgba(253,164,175,0.5)]"
                    : "border-warm-100/80 bg-white/80",
                )}
              >
                {/* Rank badge */}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold",
                    RANK_STYLE[f.rank] ?? "bg-warm-100 text-warm-500",
                  )}
                >
                  {f.rank === 1 ? <Trophy className="h-4 w-4" /> : f.rank}
                </div>

                <span className="shrink-0 text-2xl">{f.emoji}</span>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-display text-sm font-extrabold sm:text-base",
                      f.highlight ? "text-rose-700" : "text-warm-900",
                    )}
                  >
                    {f.name}
                  </p>
                  <p className="text-xs text-warm-500">{f.tasks} tasks done</p>
                </div>

                <div className="shrink-0 text-right">
                  <div
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-display text-sm font-extrabold",
                      f.highlight
                        ? "bg-rose-100 text-rose-700"
                        : "bg-warm-50 text-warm-600",
                    )}
                  >
                    <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {f.xp.toLocaleString("en-US")}
                  </div>
                  <p className="mt-0.5 text-[11px] text-warm-400">XP</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats sidebar */}
          <div className="flex flex-row gap-3 md:flex-col md:justify-center md:gap-3">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-rose-100/80 bg-gradient-to-b from-white to-rose-50/40 px-4 py-5 text-center shadow-sm md:min-w-[130px]"
              >
                <p className="font-display text-2xl font-extrabold text-warm-950 sm:text-3xl">
                  {s.value}
                </p>
                <p className="mt-1 text-[11px] font-medium leading-snug text-warm-500">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
