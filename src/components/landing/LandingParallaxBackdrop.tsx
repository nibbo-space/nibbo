"use client";

import { useHasMounted, useLandingReducedMotion } from "@/lib/landing-motion";
import { motion, useScroll, useTransform } from "framer-motion";

export function LandingParallaxBackdrop() {
  const mounted = useHasMounted();
  const reduced = useLandingReducedMotion();
  const { scrollY } = useScroll();
  const yDeep = useTransform(scrollY, [0, 4200], [0, reduced ? 0 : -120]);
  const yMid = useTransform(scrollY, [0, 4200], [0, reduced ? 0 : -260]);
  const yNear = useTransform(scrollY, [0, 4200], [0, reduced ? 0 : -400]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 min-h-dvh overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_85%_at_50%_-8%,#fdfaf5_0%,rgba(255,241,242,0.92)_30%,rgba(250,245,255,0.78)_56%,rgba(240,253,244,0.38)_80%,rgba(255,251,235,0.94)_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(251,113,133,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(251,113,133,0.07) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
        }}
      />
      <motion.div style={mounted ? { y: yDeep } : undefined} className="absolute inset-0">
        <div className="absolute -left-[20%] top-[5%] h-[min(88vw,680px)] w-[min(88vw,680px)] rounded-full bg-rose-200/45 blur-[100px] max-md:blur-[72px]" />
        <div className="absolute -right-[14%] top-[22%] h-[min(72vw,560px)] w-[min(72vw,560px)] rounded-full bg-lavender-100/55 blur-[90px] max-md:blur-[64px]" />
      </motion.div>
      <motion.div style={mounted ? { y: yMid } : undefined} className="absolute inset-0">
        <div className="absolute left-[12%] bottom-[8%] h-[min(58vw,480px)] w-[min(58vw,480px)] rounded-full bg-lavender-200/40 blur-[88px] max-md:blur-[56px]" />
      </motion.div>
      <motion.div style={mounted ? { y: yNear } : undefined} className="absolute inset-0">
        <div className="absolute left-1/2 top-[48%] h-[min(95vw,620px)] w-[min(95vw,620px)] -translate-x-1/2 rounded-full bg-rose-100/35 blur-[110px] max-md:blur-[76px]" />
      </motion.div>
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent, transparent 3px, rgba(251,113,133,0.06) 3px, rgba(251,113,133,0.06) 4px)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-cream-50/90 via-cream-50/40 to-transparent" />
    </div>
  );
}
