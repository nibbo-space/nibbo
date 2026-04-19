"use client";

import { useHasMounted } from "@/lib/landing-motion";
import { motion } from "framer-motion";

const STATS = [
  { value: "Free", sub: "forever", emoji: "🎁" },
  { value: "1,200+", sub: "families onboard", emoji: "🏠" },
  { value: "48,000+", sub: "tasks completed", emoji: "✅" },
  { value: "6", sub: "modules included", emoji: "📦" },
] as const;

export function LandingStatBar() {
  const mounted = useHasMounted();

  return (
    <div className="relative w-full overflow-hidden">
      {/* Gradient fade from page into dark */}
      <div
        className="absolute inset-x-0 top-0 z-10 h-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(255,240,235,0.95) 0%, #0c0a09 100%)" }}
        aria-hidden
      />
      <div className="relative bg-warm-950 pt-4 pb-1">
        {/* Rose underglow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 80% at 50% 100%, rgba(244,63,94,0.12) 0%, transparent 65%)",
          }}
          aria-hidden
        />
        <div className="relative z-[1] mx-auto grid max-w-5xl grid-cols-2 md:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.sub}
              initial={mounted ? { opacity: 0, y: 8 } : false}
              animate={mounted ? { opacity: 1, y: 0 } : undefined}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="flex flex-col items-center gap-1.5 px-4 py-8 text-center"
            >
              <span className="text-2xl leading-none">{s.emoji}</span>
              <span className="mt-1 font-display text-3xl font-extrabold text-white sm:text-4xl">
                {s.value}
              </span>
              <span className="text-xs font-semibold tracking-wide text-warm-500">{s.sub}</span>
            </motion.div>
          ))}
        </div>
        {/* Bottom fade into page */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
          style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(253,246,235,0.6) 100%)" }}
          aria-hidden
        />
      </div>
    </div>
  );
}
