"use client";

import { LandingHudCorners } from "@/components/landing/LandingHudCorners";
import { LandingJourneyMiniMock } from "@/components/landing/LandingJourneyMiniMock";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useHasMounted, useLandingReducedMotion } from "@/lib/landing-motion";
import { messageLocale, I18N } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Home, LayoutGrid, MessageCircle, Sparkles } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

const STEP_ANCHORS = [
  "landing-journey-step-0",
  "landing-journey-step-1",
  "landing-journey-step-2",
  "landing-journey-step-3",
] as const;

const NODE_POINTS = [
  { x: 24, y: 30 },
  { x: 98, y: 118 },
  { x: 22, y: 198 },
  { x: 100, y: 278 },
] as const;

function buildCurvedPath(points: readonly { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const p0 = points[i - 1]!;
    const p1 = points[i]!;
    const mx = (p0.x + p1.x) / 2 + (i % 2 === 0 ? 10 : -10);
    const my = (p0.y + p1.y) / 2;
    d += ` Q ${mx} ${my} ${p1.x} ${p1.y}`;
  }
  return d;
}

export function LandingScrollJourney() {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].landing;
  const mounted = useHasMounted();
  const reduced = useLandingReducedMotion();
  const uid = useId().replace(/:/g, "");
  const gradId = `landing-path-grad-${uid}`;
  const glowId = `landing-glow-${uid}`;
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const stepRef0 = useRef(null);
  const stepRef1 = useRef(null);
  const stepRef2 = useRef(null);
  const stepRef3 = useRef(null);
  const v0 = useInView(stepRef0, { amount: 0.35, margin: "-10% 0px -10% 0px" });
  const v1 = useInView(stepRef1, { amount: 0.35, margin: "-10% 0px -10% 0px" });
  const v2 = useInView(stepRef2, { amount: 0.35, margin: "-10% 0px -10% 0px" });
  const v3 = useInView(stepRef3, { amount: 0.35, margin: "-10% 0px -10% 0px" });
  const [activeNode, setActiveNode] = useState(0);

  useEffect(() => {
    if (v3) setActiveNode(3);
    else if (v2) setActiveNode(2);
    else if (v1) setActiveNode(1);
    else if (v0) setActiveNode(0);
  }, [v0, v1, v2, v3]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.9", "end 0.2"],
  });
  const pathRaw = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const pathLength = useSpring(pathRaw, {
    stiffness: reduced ? 200 : 34,
    damping: reduced ? 60 : 24,
    mass: reduced ? 0.2 : 0.42,
  });

  const scrollToStep = useCallback((index: number) => {
    const id = STEP_ANCHORS[index];
    if (typeof document === "undefined") return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const stepRefs = [stepRef0, stepRef1, stepRef2, stepRef3];

  const steps = useMemo(
    () => [
      {
        tag: t.journeyStep1Tag,
        title: t.journeyStep1Title,
        body: t.journeyStep1Body,
        Icon: MessageCircle,
        mock: t.journeyMock0 as string,
      },
      {
        tag: t.journeyStep2Tag,
        title: t.journeyStep2Title,
        body: t.journeyStep2Body,
        Icon: LayoutGrid,
        mock: t.journeyMock1 as string,
      },
      {
        tag: t.journeyStep3Tag,
        title: t.journeyStep3Title,
        body: t.journeyStep3Body,
        Icon: Sparkles,
        mock: t.journeyMock2 as string,
      },
      {
        tag: t.journeyStep4Tag,
        title: t.journeyStep4Title,
        body: t.journeyStep4Body,
        Icon: Home,
        mock: t.journeyMock3 as string,
      },
    ],
    [t],
  );

  const pathD = useMemo(() => buildCurvedPath(NODE_POINTS), []);

  return (
    <section
      id="landing-journey"
      className="scroll-mt-20 relative isolate rounded-2xl border-[3px] border-rose-300/80 bg-gradient-to-b from-white/90 via-cream-50/50 to-rose-50/40 px-4 py-10 shadow-[0_10px_0_0_rgba(251,113,133,0.25),0_28px_56px_-20px_rgba(244,63,94,0.18)] backdrop-blur-md sm:px-8 sm:py-12 md:rounded-[1.75rem] md:py-14"
    >
      <LandingHudCorners size="sm" />
      <div className="relative z-[2] mx-auto max-w-5xl text-center md:text-left">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-rose-500">◇ {t.journeyEyebrow} ◇</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-warm-950 sm:text-3xl md:text-4xl">
          {t.journeyTitle}
        </h2>
      </div>

      <div
        ref={sectionRef}
        className="relative z-[2] mx-auto mt-8 grid max-w-6xl gap-8 md:grid-cols-12 md:gap-x-8 md:gap-y-5 lg:mt-10 lg:gap-x-10"
      >
        <div className="flex justify-center md:sticky md:top-24 md:z-[1] md:col-span-4 md:self-start md:justify-start">
          <div className="relative w-[min(100%,200px)] md:w-full md:max-w-[220px]">
            <svg
              viewBox="0 0 120 308"
              className="mx-auto h-[200px] w-full max-w-[200px] sm:h-[220px] md:h-[min(48vh,300px)] md:max-w-none"
              preserveAspectRatio="xMidYMid meet"
              aria-label={t.journeyMapAria}
            >
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fda4af" stopOpacity="0.5" />
                  <stop offset="45%" stopColor="#f43f5e" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.5" />
                </linearGradient>
                <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d={pathD}
                fill="none"
                stroke="#e7e5e4"
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none opacity-80"
              />
              <motion.path
                d={pathD}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={mounted ? { pathLength } : { pathLength: 1 }}
              />
              {NODE_POINTS.map((pt, i) => {
                const active = activeNode === i;
                return (
                  <g
                    key={i}
                    className="cursor-pointer outline-none"
                    onClick={() => scrollToStep(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        scrollToStep(i);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${steps[i].tag}: ${steps[i].title}`}
                  >
                    {mounted && active && !reduced && (
                      <motion.circle
                        cx={pt.x}
                        cy={pt.y}
                        r={22}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        initial={{ opacity: 0.45, scale: 0.85 }}
                        animate={{ opacity: 0, scale: 1.35 }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                    <motion.circle
                      cx={pt.x}
                      cy={pt.y}
                      r={active ? 15 : 11}
                      fill={active ? "#fff1f2" : "#ffffff"}
                      stroke={active ? "#f43f5e" : "#d6d3d1"}
                      strokeWidth={active ? 2.5 : 2}
                      filter={active ? `url(#${glowId})` : undefined}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    />
                    <text
                      x={pt.x}
                      y={pt.y + 4}
                      textAnchor="middle"
                      fill="#1c1917"
                      style={{ fontSize: 11, fontWeight: 700 }}
                    >
                      {i + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="space-y-5 md:col-span-8 md:space-y-5">
          {steps.map((step, i) => (
            <motion.article
              key={step.title}
              id={STEP_ANCHORS[i]}
              ref={stepRefs[i]}
              initial={false}
              transition={{ duration: 0.48, ease: [0.4, 0, 0.2, 1] }}
              whileHover={reduced ? {} : { y: -4, transition: { duration: 0.2 } }}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-[box-shadow,border-color] duration-300 sm:p-6",
                activeNode === i
                  ? "border-rose-300/70 bg-gradient-to-br from-white via-rose-50/50 to-lavender-50/35 shadow-[0_16px_40px_-16px_rgba(244,63,94,0.2)] ring-2 ring-rose-200/50"
                  : "border-warm-100/90 bg-white/85",
              )}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
                <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-inner sm:h-14 sm:w-14 sm:rounded-2xl",
                      activeNode === i
                        ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white"
                        : "bg-gradient-to-br from-cream-100 to-warm-100 text-warm-600",
                    )}
                  >
                    <step.Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 sm:text-[11px]">{step.tag}</span>
                    <h3 className="mt-0.5 font-display text-lg font-extrabold leading-snug text-warm-950 sm:text-xl">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-warm-600">{step.body}</p>
                  </div>
                </div>
                <div className="w-full shrink-0 lg:w-[168px]">
                  <LandingJourneyMiniMock variant={i as 0 | 1 | 2 | 3} caption={step.mock} />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
