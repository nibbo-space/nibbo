"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import TaskTamagotchi3D from "@/components/shared/TaskTamagotchi3D";
import type { NibbyChatDrive } from "@/components/shared/NibbyAssistantStage";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { unlockedFamilyAchievementIds } from "@/lib/family-achievements";
import { I18N } from "@/lib/i18n";
import {
  pushMascotSpeakDelta,
  startMascotSpeakAudio,
  stopMascotSpeakAudio,
} from "@/lib/mascot-speak-audio";

const LAB_DEFAULT_FAMILY_ID = "c9a63100-0000-4000-8000-000000000000";

const MOOD_PRESETS = [
  {
    key: "sleepy" as const,
    stats: { doneToday: 0, doneWeek: 0, myOpen: 9, doneTotal: 2 },
    familyXp: 20,
  },
  {
    key: "neutral" as const,
    stats: { doneToday: 1, doneWeek: 4, myOpen: 7, doneTotal: 11 },
    familyXp: 120,
  },
  {
    key: "smile" as const,
    stats: { doneToday: 2, doneWeek: 9, myOpen: 4, doneTotal: 23 },
    familyXp: 720,
  },
  {
    key: "happy" as const,
    stats: { doneToday: 5, doneWeek: 18, myOpen: 1, doneTotal: 44 },
    familyXp: 3200,
  },
];

const NibbyAssistantStage = dynamic(() => import("@/components/shared/NibbyAssistantStage"), {
  ssr: false,
  loading: () => (
    <div className="h-[min(52vh,320px)] min-h-[200px] w-full animate-pulse rounded-3xl bg-gradient-to-b from-sky-50 via-white to-cyan-50" />
  ),
});

export default function NibbyLabClient({ defaultSeed }: { defaultSeed: string }) {
  const { language } = useAppLanguage();
  const t = I18N[language].adminNibbyLab;
  const [seed, setSeed] = useState(defaultSeed);
  const driveRef = useRef<NibbyChatDrive>({ speaking: false, lipPulse: 0 });
  const pulseRef = useRef<number | null>(null);
  const demoEndRef = useRef<number | null>(null);

  const effectiveId = seed.trim() || LAB_DEFAULT_FAMILY_ID;

  const clearPulse = useCallback(() => {
    if (pulseRef.current !== null) {
      window.clearInterval(pulseRef.current);
      pulseRef.current = null;
    }
  }, []);

  const clearDemoEnd = useCallback(() => {
    if (demoEndRef.current !== null) {
      window.clearTimeout(demoEndRef.current);
      demoEndRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    clearDemoEnd();
    stopMascotSpeakAudio();
    clearPulse();
    driveRef.current.speaking = false;
    driveRef.current.lipPulse = 0;
  }, [clearDemoEnd, clearPulse]);

  useEffect(() => () => stopAll(), [stopAll]);

  const playSynthOnly = useCallback(() => {
    stopAll();
    const s = seed.trim() || "nibbo";
    void startMascotSpeakAudio(s).then(() => {
      pushMascotSpeakDelta(
        "Hello nibby welcome home the cozy kitchen smells like warm bread and berries today"
      );
    });
    demoEndRef.current = window.setTimeout(() => {
      demoEndRef.current = null;
      stopMascotSpeakAudio();
    }, 3200);
  }, [seed, stopAll]);

  const playFullDemo = useCallback(() => {
    stopAll();
    const s = seed.trim() || "nibbo";
    driveRef.current.speaking = true;
    driveRef.current.lipPulse = 0.48;
    pulseRef.current = window.setInterval(() => {
      driveRef.current.lipPulse = 0.32 + Math.random() * 0.58;
    }, 82);
    void startMascotSpeakAudio(s).then(() => {
      pushMascotSpeakDelta(
        "Hello nibby welcome home the cozy kitchen smells like warm bread and berries today"
      );
    });
    demoEndRef.current = window.setTimeout(() => {
      demoEndRef.current = null;
      stopMascotSpeakAudio();
      clearPulse();
      driveRef.current.speaking = false;
      driveRef.current.lipPulse = 0;
    }, 3600);
  }, [clearPulse, seed, stopAll]);

  const randomUuid = useCallback(() => {
    setSeed(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `seed-${Date.now()}`);
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sage-600">
            <FlaskConical className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">{t.badge}</span>
          </div>
          <h1 className="text-2xl font-bold text-warm-900 md:text-3xl">{t.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-warm-600">{t.subtitle}</p>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm font-medium text-warm-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50/80"
        >
          {t.backLink}
        </Link>
      </div>

      <div className="rounded-3xl border border-warm-200 bg-white/90 p-4 shadow-sm md:p-5">
        <label className="block text-[11px] font-medium text-warm-500">{t.seedLabel}</label>
        <div className="mt-1 flex flex-col gap-2 lg:flex-row lg:items-center lg:flex-wrap">
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-warm-200 bg-warm-50/80 px-3 py-2 font-mono text-sm text-warm-900 outline-none focus:border-rose-300 lg:min-w-[320px]"
            placeholder={t.seedPlaceholder}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => randomUuid()}
              className="rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm font-semibold text-warm-700 transition hover:border-sage-300 hover:bg-sage-50/80"
            >
              {t.randomUuid}
            </button>
            <button
              type="button"
              onClick={() => setSeed(LAB_DEFAULT_FAMILY_ID)}
              className="rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm font-semibold text-warm-700 transition hover:border-warm-300 hover:bg-warm-50"
            >
              {t.labDefault}
            </button>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-warm-800">{t.moodsTitle}</h2>
          <p className="mt-0.5 text-xs text-warm-500">{t.moodsHint}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {MOOD_PRESETS.map((preset) => {
            const copy = t.presets[preset.key];
            return (
              <div key={preset.key} className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <h3 className="text-sm font-semibold text-warm-700">{copy.title}</h3>
                  <span className="text-right text-xs text-warm-400">{copy.caption}</span>
                </div>
                <TaskTamagotchi3D
                  familyId={effectiveId}
                  doneToday={preset.stats.doneToday}
                  doneWeek={preset.stats.doneWeek}
                  myOpen={preset.stats.myOpen}
                  doneTotal={preset.stats.doneTotal}
                  familyXp={preset.familyXp}
                  unlockedAchievementIds={unlockedFamilyAchievementIds(preset.familyXp)}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 border-t border-warm-200 pt-8">
        <div>
          <h2 className="text-lg font-semibold text-warm-800">{t.assistantBlockTitle}</h2>
          <p className="mt-0.5 text-xs text-warm-500">{t.assistantBlockHint}</p>
        </div>
        <div className="rounded-3xl border border-warm-200 bg-white/90 p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => playSynthOnly()}
              className="rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              {t.synthOnly}
            </button>
            <button
              type="button"
              onClick={() => playFullDemo()}
              className="rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              {t.fullDemo}
            </button>
            <button
              type="button"
              onClick={() => stopAll()}
              className="rounded-xl border border-warm-300 bg-white px-4 py-2.5 text-sm font-semibold text-warm-800 transition hover:bg-warm-50"
            >
              {t.stop}
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-warm-200 bg-gradient-to-b from-white to-warm-50/50 p-3 shadow-sm md:p-4">
          <p className="mb-2 text-center text-[11px] font-medium text-warm-500">{t.previewLabel}</p>
          <div className="mx-auto aspect-[4/3] max-h-[min(52vh,380px)] w-full max-w-lg">
            <NibbyAssistantStage key={effectiveId} familyId={effectiveId} driveRef={driveRef} />
          </div>
        </div>
      </section>
    </div>
  );
}
