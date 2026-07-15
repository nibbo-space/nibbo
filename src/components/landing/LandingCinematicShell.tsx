"use client";

import { LandingLocaleSwitch } from "@/components/landing/LandingLocaleSwitch";
import { LandingRail } from "@/components/landing/LandingRail";
import { LandingStage } from "@/components/landing/LandingStage";
import type { NibbyChatDrive } from "@/components/shared/NibbyAssistantStage";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { LANDING_CHAPTER_COUNT, LANDING_CHAPTERS } from "@/lib/landing-chapters";
import { I18N, messageLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const WHEEL_THRESHOLD = 36;
const SLIDE_COOLDOWN_MS = 620;

export function LandingCinematicShell({
  nibbyDriveRef,
}: {
  nibbyDriveRef: React.MutableRefObject<NibbyChatDrive>;
}) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].landing;
  const shellRef = useRef<HTMLElement | null>(null);
  const [chapter, setChapter] = useState(0);
  const chapterRef = useRef(0);
  const wheelAccRef = useRef(0);
  const lockedUntilRef = useRef(0);
  const touchYRef = useRef<number | null>(null);

  const goToChapter = useCallback((index: number) => {
    const i = Math.max(0, Math.min(LANDING_CHAPTER_COUNT - 1, index));
    if (i === chapterRef.current) return false;
    chapterRef.current = i;
    setChapter(i);
    lockedUntilRef.current = performance.now() + SLIDE_COOLDOWN_MS;
    wheelAccRef.current = 0;
    return true;
  }, []);

  const stepChapter = useCallback(
    (delta: number) => {
      if (performance.now() < lockedUntilRef.current) return false;
      return goToChapter(chapterRef.current + delta);
    },
    [goToChapter],
  );

  useEffect(() => {
    chapterRef.current = chapter;
  }, [chapter]);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (performance.now() < lockedUntilRef.current) return;

      wheelAccRef.current += e.deltaY;
      if (wheelAccRef.current >= WHEEL_THRESHOLD) {
        if (!stepChapter(1)) wheelAccRef.current = 0;
      } else if (wheelAccRef.current <= -WHEEL_THRESHOLD) {
        if (!stepChapter(-1)) wheelAccRef.current = 0;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchYRef.current = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchYRef.current == null) return;
      e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      const start = touchYRef.current;
      touchYRef.current = null;
      if (start == null) return;
      const end = e.changedTouches[0]?.clientY;
      if (end == null) return;
      const dy = start - end;
      if (Math.abs(dy) < 48) return;
      stepChapter(dy > 0 ? 1 : -1);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [stepChapter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        stepChapter(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        stepChapter(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goToChapter(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goToChapter(LANDING_CHAPTER_COUNT - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToChapter, stepChapter]);

  const labels = LANDING_CHAPTERS.map((c) => t[c.labelKey]);

  return (
    <section
      ref={shellRef}
      className="relative h-full w-full overflow-hidden bg-mist-100"
      aria-label={t.journeyProgressAria}
    >
      <div className="grid h-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[minmax(280px,28rem)_minmax(0,1fr)] md:grid-rows-1">
        <header className="relative z-30 flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.65rem)] md:hidden">
          <Link href={`/${language}`} className="flex items-center gap-2">
            <Image src="/favicon.svg" alt="" width={24} height={24} />
            <span className="font-landing-display text-lg font-bold text-ink-900">Nibbo</span>
          </Link>
          <div className="flex items-center gap-2">
            <LandingLocaleSwitch />
            <Link
              href="/login"
              className="rounded-full bg-coral-400 px-3.5 py-2 text-[11px] font-bold text-white"
            >
              {t.ctaSignIn}
            </Link>
          </div>
        </header>

        <div className="hidden min-h-0 md:block">
          <LandingRail chapter={chapter} onSelectChapter={goToChapter} />
        </div>

        <div className="relative flex min-h-0 flex-col px-3 pb-3 md:px-0 md:pb-0">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-1 md:hidden">
            <p className="truncate text-sm font-bold text-ink-700">{labels[chapter]}</p>
            <nav className="flex gap-1.5" aria-label={t.journeyProgressAria}>
              {LANDING_CHAPTERS.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => goToChapter(i)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === chapter ? "w-6 bg-coral-400" : "w-2 bg-ink-200",
                  )}
                  aria-label={labels[i]}
                />
              ))}
            </nav>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl md:rounded-none">
            <LandingStage chapter={chapter} nibbyDriveRef={nibbyDriveRef} />
          </div>
        </div>
      </div>
    </section>
  );
}
