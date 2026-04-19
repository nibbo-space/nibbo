"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { ACHIEVEMENT_UNLOCK_EVENT, type AchievementUnlockDetail } from "@/lib/achievement-unlock-events";
import { achievementById } from "@/lib/achievements/registry";
import { familyAchievementDescription, familyAchievementLabel } from "@/lib/family-achievement-label";
import { I18N } from "@/lib/i18n";
import { playAchievementUnlockSound } from "@/lib/achievement-unlock-sound";

const CONFETTI_COLORS = ["#fb7185", "#fbbf24", "#a78bfa", "#4ade80", "#38bdf8", "#f472b6"];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFromString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return mulberry32(h >>> 0);
}

type ConfettiPiece = {
  id: number;
  angle: number;
  dist: number;
  delay: number;
  rot: number;
  color: string;
  w: number;
  h: number;
  round: boolean;
};

function buildConfetti(seed: string, count: number): ConfettiPiece[] {
  const rnd = rngFromString(seed);
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i += 1) {
    pieces.push({
      id: i,
      angle: rnd() * Math.PI * 2,
      dist: 72 + rnd() * 140,
      delay: rnd() * 0.1,
      rot: rnd() * 540 - 270,
      color: CONFETTI_COLORS[Math.floor(rnd() * CONFETTI_COLORS.length)]!,
      w: 5 + rnd() * 7,
      h: 4 + rnd() * 8,
      round: rnd() > 0.65,
    });
  }
  return pieces;
}

const FLOAT_CHARS = ["✨", "🌟", "⭐", "💫", "🎊"];

function UnlockConfetti({ seed, reduced }: { seed: string; reduced: boolean }) {
  const pieces = useMemo(() => buildConfetti(seed, reduced ? 0 : 36), [seed, reduced]);
  if (pieces.length === 0) return null;
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[42%] z-[1] h-0 w-0 sm:top-[44%]"
      aria-hidden
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className={`absolute ${p.round ? "rounded-full" : "rounded-[1px]"}`}
          style={{
            width: p.w,
            height: p.h,
            marginLeft: -p.w / 2,
            marginTop: -p.h / 2,
            backgroundColor: p.color,
            boxShadow: "0 0 10px rgba(255,255,255,0.35)",
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.dist,
            y: Math.sin(p.angle) * p.dist * 0.35 + p.dist * 0.55,
            opacity: [1, 1, 0],
            rotate: p.rot,
            scale: [1.15, 0.5],
          }}
          transition={{
            duration: 1.05,
            delay: p.delay,
            ease: [0.12, 0.72, 0.22, 1],
          }}
        />
      ))}
    </div>
  );
}

export function AchievementUnlockProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const { language } = useAppLanguage();
  const t = I18N[language].achievements;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/achievements/state");
        if (!res.ok) return;
        const data = (await res.json()) as { newUnlockIds?: string[] };
        const ids = data.newUnlockIds?.filter(Boolean) ?? [];
        if (ids.length > 0 && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent<AchievementUnlockDetail>(ACHIEVEMENT_UNLOCK_EVENT, { detail: { ids } })
          );
        }
      } catch {}
    };
    void run();
  }, []);

  useEffect(() => {
    const onUnlock = (ev: Event) => {
      const ce = ev as CustomEvent<AchievementUnlockDetail>;
      const ids = ce.detail?.ids?.filter(Boolean) ?? [];
      if (ids.length > 0) setQueue((q) => [...q, ...ids]);
    };
    window.addEventListener(ACHIEVEMENT_UNLOCK_EVENT, onUnlock);
    return () => window.removeEventListener(ACHIEVEMENT_UNLOCK_EVENT, onUnlock);
  }, []);

  const current = queue[0];

  useEffect(() => {
    if (!current || reduceMotion === true) return;
    try {
      playAchievementUnlockSound();
    } catch {}
  }, [current, reduceMotion]);
  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);

  const def = current ? achievementById(current) : undefined;
  const title = def ? familyAchievementLabel(def.id, language) : "";
  const unlockDescription = def ? familyAchievementDescription(def.id, language) : "";
  const festive = reduceMotion !== true;

  const node =
    mounted && current && def && typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              role="dialog"
              aria-modal="true"
              aria-label={t.newUnlockTitle}
              className="fixed inset-0 z-[500] flex items-center justify-center overflow-hidden p-4 sm:p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-peach-100/95 via-cream-50/95 to-lavender-100/80"
                aria-hidden
              />
              <div className="pointer-events-none absolute inset-0 bg-warm-900/[0.08]" aria-hidden />
              {festive ? (
                <motion.div
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[min(140vw,720px)] w-[min(140vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                  style={{ background: "conic-gradient(from 0deg, #fb718555, #fbbf2444, #c4b5fd55, #fb718555)" }}
                  animate={{ rotate: [0, 360], scale: [1, 1.08, 1] }}
                  transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                  aria-hidden
                />
              ) : null}
              {festive ? (
                <motion.div
                  className="pointer-events-none absolute left-[12%] top-[22%] h-40 w-40 rounded-full bg-rose-300/35 blur-3xl"
                  animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.15, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden
                />
              ) : null}
              {festive ? (
                <motion.div
                  className="pointer-events-none absolute bottom-[18%] right-[10%] h-44 w-44 rounded-full bg-violet-400/30 blur-3xl"
                  animate={{ opacity: [0.3, 0.6, 0.3], scale: [1.05, 1, 1.05] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden
                />
              ) : null}

              <UnlockConfetti seed={current} reduced={!festive} />

              <div className="relative z-[2] w-full max-w-[min(22rem,calc(100vw-2rem))]">
                {festive ? (
                  <motion.div
                    className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-r from-rose-400/45 via-amber-300/35 to-lavender-400/45 blur-2xl"
                    animate={{ opacity: [0.55, 0.95, 0.55], scale: [0.96, 1.02, 0.96] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  />
                ) : null}

                <div className="relative">
                  {festive
                    ? FLOAT_CHARS.map((ch, i) => (
                        <motion.span
                          key={`${ch}-${i}`}
                          className="pointer-events-none absolute text-xl sm:text-2xl"
                          style={{
                            left: `${14 + i * 18}%`,
                            top: i % 2 === 0 ? "-8%" : "102%",
                          }}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{
                            opacity: [0.85, 1, 0.85],
                            y: [0, -10, 0],
                            rotate: [0, 12, -8, 0],
                            scale: [0.9, 1.15, 0.9],
                          }}
                          transition={{
                            duration: 2.4 + i * 0.15,
                            repeat: Infinity,
                            delay: i * 0.08,
                            ease: "easeInOut",
                          }}
                          aria-hidden
                        >
                          {ch}
                        </motion.span>
                      ))
                    : null}

                  <motion.div
                    initial={{ opacity: 0, y: 28, scale: 0.88 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: festive
                        ? { type: "spring", stiffness: 260, damping: 18, mass: 0.72 }
                        : { type: "spring", stiffness: 300, damping: 28 },
                    }}
                    exit={{ opacity: 0, y: 16, scale: 0.96, transition: { duration: 0.16 } }}
                    className="relative overflow-hidden rounded-3xl border-2 border-rose-200/80 bg-white/95 shadow-[0_8px_32px_-6px_rgba(251,113,133,0.35),0_20px_48px_-12px_rgba(167,139,250,0.25)] ring-2 ring-amber-200/50"
                  >
                    {festive ? (
                      <motion.div
                        className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-3xl"
                        initial={false}
                        aria-hidden
                      >
                        <motion.div
                          className="absolute -inset-y-8 w-[55%] skew-x-[-12deg] bg-gradient-to-r from-transparent via-white/75 to-transparent opacity-90"
                          initial={{ left: "-60%" }}
                          animate={{ left: "130%" }}
                          transition={{ duration: 0.85, delay: 0.28, ease: [0.4, 0, 0.2, 1] }}
                        />
                      </motion.div>
                    ) : null}

                    <div
                      className="pointer-events-none absolute left-1/2 top-4 h-2.5 w-[4.5rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-white via-amber-100 to-white shadow-md ring-1 ring-rose-200/70"
                      aria-hidden
                    />

                    <div className="relative z-10 px-6 pb-7 pt-10 text-center sm:px-8 sm:pb-8 sm:pt-11">
                      <motion.p
                        className="text-xs font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-amber-500 to-violet-600"
                        initial={{ opacity: 0, y: -6, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={festive ? { type: "spring", stiffness: 400, damping: 22 } : { duration: 0.2 }}
                      >
                        {t.newUnlockTitle}
                      </motion.p>
                      <div
                        className={`relative mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-2xl border-[3px] bg-gradient-to-b shadow-[0_10px_0_rgba(0,0,0,0.07),0_0_24px_rgba(251,113,133,0.25),inset_0_2px_0_rgba(255,255,255,0.65)] sm:h-32 sm:w-32 ${def.stickerBorderUnlocked} ${def.stickerBgUnlocked}`}
                      >
                        {festive ? (
                          <motion.span
                            className="pointer-events-none absolute inset-2 rounded-xl bg-gradient-to-t from-transparent to-white/25"
                            animate={{ opacity: [0.4, 0.85, 0.4] }}
                            transition={{ duration: 1.8, repeat: Infinity }}
                            aria-hidden
                          />
                        ) : null}
                        <motion.span
                          className="relative z-[1] text-5xl leading-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.12)] sm:text-6xl"
                          initial={{ scale: 0.2, opacity: 0, rotate: -18 }}
                          animate={
                            festive
                              ? {
                                  scale: [0.2, 1.18, 0.95, 1.05, 1],
                                  opacity: 1,
                                  rotate: [-18, 8, -5, 3, 0],
                                  transition: {
                                    delay: 0.06,
                                    duration: 0.65,
                                    times: [0, 0.45, 0.65, 0.82, 1],
                                    ease: [0.34, 1.56, 0.64, 1],
                                  },
                                }
                              : {
                                  scale: 1,
                                  opacity: 1,
                                  rotate: 0,
                                  transition: { delay: 0.05, type: "spring", stiffness: 260, damping: 16 },
                                }
                          }
                        >
                          {def.emoji}
                        </motion.span>
                      </div>
                      <motion.p
                        className="mt-6 bg-gradient-to-br from-warm-800 to-warm-700 bg-clip-text text-xl font-extrabold leading-snug text-transparent sm:text-2xl"
                        initial={{ opacity: 0, y: 12, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={
                          festive
                            ? { delay: 0.12, type: "spring", stiffness: 280, damping: 20 }
                            : { delay: 0.08, duration: 0.25 }
                        }
                      >
                        {title}
                      </motion.p>
                      {unlockDescription ? (
                        <motion.p
                          className="mt-3 max-w-[20rem] px-1 text-sm font-medium leading-relaxed text-warm-600 sm:max-w-none sm:text-base"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: festive ? 0.16 : 0.1, duration: 0.28 }}
                        >
                          {unlockDescription}
                        </motion.p>
                      ) : null}
                      <motion.div
                        className="mx-auto mt-4 h-1.5 w-28 rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-violet-400 shadow-[0_0_12px_rgba(251,113,133,0.45)]"
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ delay: festive ? 0.2 : 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: "center" }}
                        aria-hidden
                      />
                      <motion.button
                        type="button"
                        className="relative mt-8 w-full overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-rose-500 to-amber-500 py-3.5 text-base font-extrabold text-white shadow-[0_6px_0_rgb(190,24,93,0.45),0_12px_28px_rgba(251,113,133,0.4)] transition hover:brightness-110 active:translate-y-0.5 active:shadow-[0_3px_0_rgb(190,24,93,0.4)] sm:py-4"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: festive ? 0.22 : 0.14, type: "spring", stiffness: 260, damping: 22 }}
                        onClick={dismiss}
                      >
                        {festive ? (
                          <motion.span
                            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            initial={{ x: "-100%" }}
                            animate={{ x: "200%" }}
                            transition={{ duration: 1.2, delay: 0.5, repeat: Infinity, repeatDelay: 2.5 }}
                            aria-hidden
                          />
                        ) : null}
                        <span className="relative z-[1]">{t.unlockContinue}</span>
                      </motion.button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <>
      {children}
      {node}
    </>
  );
}
