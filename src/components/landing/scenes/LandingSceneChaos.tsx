"use client";

import { LandingSceneCaption } from "@/components/landing/LandingSceneCaption";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useLandingReducedMotion } from "@/lib/landing-motion";
import { I18N, messageLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type ChaosNote = {
  text: string;
  x: string;
  y: string;
  rotate: number;
  delay: number;
  size: "sm" | "md" | "lg";
  depth: "back" | "mid" | "front";
  chat?: string;
};

export function LandingSceneChaos({ active }: { active: boolean }) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].landing;
  const reduced = useLandingReducedMotion();

  const notes: ChaosNote[] = [
    { text: t.chaosBubble1, x: "4%", y: "10%", rotate: -8, delay: 0, size: "lg", depth: "front", chat: t.chaosChatFamily },
    { text: t.chaosBubble2, x: "38%", y: "6%", rotate: 5, delay: 0.05, size: "md", depth: "front", chat: t.chaosChatSchool },
    { text: t.chaosBubble3, x: "8%", y: "28%", rotate: 3, delay: 0.1, size: "lg", depth: "front", chat: t.chaosChatShop },
    { text: t.chaosBubble4, x: "44%", y: "24%", rotate: -4, delay: 0.14, size: "md", depth: "mid", chat: t.chaosChatFamily },
    { text: t.chaosBubble5, x: "22%", y: "16%", rotate: -2, delay: 0.08, size: "sm", depth: "mid" },
    { text: t.chaosBubble6, x: "58%", y: "14%", rotate: 7, delay: 0.12, size: "sm", depth: "back" },
    { text: t.chaosBubble7, x: "2%", y: "46%", rotate: -6, delay: 0.16, size: "md", depth: "front", chat: t.chaosChatSchool },
    { text: t.chaosBubble8, x: "34%", y: "40%", rotate: 4, delay: 0.18, size: "sm", depth: "mid" },
    { text: t.chaosBubble9, x: "56%", y: "34%", rotate: -5, delay: 0.2, size: "md", depth: "mid", chat: t.chaosChatFamily },
    { text: t.chaosBubble10, x: "16%", y: "58%", rotate: 2, delay: 0.22, size: "sm", depth: "back" },
    { text: t.chaosBubble11, x: "48%", y: "52%", rotate: -3, delay: 0.24, size: "md", depth: "mid" },
    { text: t.chaosBubble12, x: "68%", y: "8%", rotate: 6, delay: 0.1, size: "sm", depth: "back" },
    { text: t.chaosBubble13, x: "70%", y: "28%", rotate: -7, delay: 0.15, size: "sm", depth: "back" },
    { text: t.chaosBubble14, x: "62%", y: "48%", rotate: 3, delay: 0.26, size: "sm", depth: "back" },
    { text: t.chaosBubble15, x: "28%", y: "48%", rotate: 10, delay: 0.12, size: "sm", depth: "front" },
    { text: t.chaosBubble16, x: "12%", y: "68%", rotate: -3, delay: 0.28, size: "sm", depth: "mid" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute left-4 top-4 z-20 flex flex-wrap gap-2 md:left-8 md:top-6"
        initial={reduced ? false : { opacity: 0, y: -8 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0 }}
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-bold text-coral-600 shadow-sm ring-1 ring-coral-200/80 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-coral-500" />
          </span>
          {t.chaosUnread}
        </span>
        {[t.chaosChatFamily, t.chaosChatSchool, t.chaosChatShop].map((chat) => (
          <span
            key={chat}
            className="inline-flex items-center rounded-full bg-ink-900/80 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur-sm"
          >
            {chat}
            <span className="ml-1.5 rounded-full bg-coral-400 px-1.5 py-px text-[9px] text-white">
              {chat === t.chaosChatFamily ? "12" : chat === t.chaosChatSchool ? "8" : "27"}
            </span>
          </span>
        ))}
      </motion.div>

      {notes.map((note, i) => (
        <motion.div
          key={`${note.text}-${i}`}
          className={cn(
            "absolute",
            note.depth === "back" && "z-[4]",
            note.depth === "mid" && "z-[6]",
            note.depth === "front" && "z-[8]",
            note.size === "sm" && "max-w-[150px] md:max-w-[170px]",
            note.size === "md" && "max-w-[200px] md:max-w-[230px]",
            note.size === "lg" && "max-w-[230px] md:max-w-[270px]",
          )}
          style={{ left: note.x, top: note.y }}
          initial={reduced ? false : { opacity: 0, y: 20, rotate: note.rotate - 8, scale: 0.96 }}
          animate={
            active
              ? reduced
                ? { opacity: note.depth === "back" ? 0.45 : 1, y: 0, rotate: note.rotate, scale: 1 }
                : {
                    opacity: note.depth === "back" ? [0.35, 0.5, 0.35] : note.depth === "mid" ? 0.85 : 1,
                    y: [0, note.depth === "front" ? -7 : -4, 0],
                    rotate: note.rotate,
                    scale: 1,
                  }
              : { opacity: 0, y: 16 }
          }
          transition={
            reduced
              ? { duration: 0 }
              : {
                  opacity: { duration: 0.35, delay: note.delay },
                  y: {
                    duration: 3.2 + (i % 5) * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: note.delay,
                  },
                  rotate: { duration: 0.4, delay: note.delay },
                  scale: { duration: 0.4, delay: note.delay },
                }
          }
        >
          <div
            className={cn(
              "rounded-2xl shadow-[0_12px_30px_-16px_rgba(26,29,35,0.35)] ring-1 backdrop-blur-sm",
              note.depth === "back"
                ? "bg-white/55 px-3 py-2 text-[11px] font-semibold text-ink-500 ring-ink-100/50"
                : note.depth === "mid"
                  ? "bg-white/75 px-3.5 py-2.5 text-xs font-semibold text-ink-600 ring-ink-100/70"
                  : "bg-white/92 px-4 py-3 text-sm font-semibold leading-snug text-ink-700 ring-ink-100/80",
            )}
          >
            {note.chat && (
              <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-coral-500/90">{note.chat}</p>
            )}
            {note.text}
          </div>
        </motion.div>
      ))}

      <LandingSceneCaption title={t.sceneChaosTitle} body={t.sceneChaosBody} />
    </div>
  );
}
