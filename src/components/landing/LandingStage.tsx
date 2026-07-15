"use client";

import { LandingSceneAtmosphere } from "@/components/landing/LandingSceneAtmosphere";
import { LandingSceneBoard } from "@/components/landing/scenes/LandingSceneBoard";
import { LandingSceneChaos } from "@/components/landing/scenes/LandingSceneChaos";
import { LandingSceneHome } from "@/components/landing/scenes/LandingSceneHome";
import { LandingSceneKit } from "@/components/landing/scenes/LandingSceneKit";
import { LandingSceneMeet } from "@/components/landing/scenes/LandingSceneMeet";
import { LandingScenePlay } from "@/components/landing/scenes/LandingScenePlay";
import type { NibbyChatDrive } from "@/components/shared/NibbyAssistantStage";
import { LANDING_NIBBY_FAMILY_ID } from "@/lib/landing-nibby";
import { useLandingReducedMotion } from "@/lib/landing-motion";
import type { NibbyChargeStage } from "@/lib/nibby-charge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect } from "react";

const NibbyAssistantStage = dynamic(() => import("@/components/shared/NibbyAssistantStage"), {
  ssr: false,
  loading: () => <div className="h-full w-full" aria-hidden />,
});

const NIBBY_FRAME: Record<
  number,
  { x: string; y: string; scale: number; stage: NibbyChargeStage; viewDistance: number }
> = {
  0: { x: "0%", y: "0%", scale: 1, stage: 3, viewDistance: 1.4 },
  1: { x: "16%", y: "16%", scale: 0.92, stage: 1, viewDistance: 1.25 },
  2: { x: "20%", y: "0%", scale: 0.98, stage: 2, viewDistance: 1.2 },
  3: { x: "18%", y: "-2%", scale: 1.02, stage: 4, viewDistance: 1.15 },
  4: { x: "22%", y: "6%", scale: 0.95, stage: 3, viewDistance: 1.22 },
  5: { x: "18%", y: "0%", scale: 0.98, stage: 2, viewDistance: 1.2 },
};

function SceneLayer({
  active,
  reduced,
  children,
}: {
  active: boolean;
  reduced: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={cn("absolute inset-0", active ? "z-[3]" : "pointer-events-none z-[2]")}
      initial={false}
      animate={{
        opacity: active ? 1 : 0,
        y: active || reduced ? 0 : 14,
      }}
      transition={{ duration: reduced ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden={!active}
    >
      {children}
    </motion.div>
  );
}

function nibbyMotion(chapter: number, reduced: boolean) {
  if (reduced) return undefined;
  if (chapter === 0) return { y: [0, -7, 0], rotate: [0, 0, 0] };
  if (chapter === 1) return { y: [4, 10, 4], rotate: [-4, -7, -4] };
  if (chapter === 2) return { y: [0, -4, 0], rotate: [0, 1.5, 0] };
  if (chapter === 3) return { y: [0, -12, 0], rotate: [-2, 3, -2], scale: [1, 1.04, 1] };
  if (chapter === 4) return { y: [0, -5, 0], x: [0, 6, 0], rotate: [-2, 2, -2] };
  return { y: [0, -6, 0], rotate: [0, -2, 0] };
}

export function LandingStage({
  chapter,
  nibbyDriveRef,
}: {
  chapter: number;
  nibbyDriveRef: React.MutableRefObject<NibbyChatDrive>;
}) {
  const reduced = useLandingReducedMotion();
  const frame = NIBBY_FRAME[chapter] ?? NIBBY_FRAME[0];
  const atmosphere =
    chapter === 1 ? "storm" : chapter === 3 || chapter === 4 ? "play" : chapter === 5 ? "dusk" : "day";

  useEffect(() => {
    if (chapter !== 3) {
      nibbyDriveRef.current.speaking = false;
      nibbyDriveRef.current.lipPulse = 0;
      return;
    }
    nibbyDriveRef.current.speaking = true;
    nibbyDriveRef.current.lipPulse = 0.85;
    const id = window.setInterval(() => {
      nibbyDriveRef.current.lipPulse = 0.35 + Math.random() * 0.55;
    }, 140);
    const stop = window.setTimeout(() => {
      window.clearInterval(id);
      nibbyDriveRef.current.speaking = false;
      nibbyDriveRef.current.lipPulse = 0;
    }, 1600);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
      nibbyDriveRef.current.speaking = false;
      nibbyDriveRef.current.lipPulse = 0;
    };
  }, [chapter, nibbyDriveRef]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-mist-100 md:rounded-l-[2rem] md:shadow-[-24px_0_60px_-40px_rgba(26,29,35,0.25)]">
      <LandingSceneAtmosphere variant={atmosphere} />

      <motion.div
        className="absolute inset-0 z-[1] will-change-transform"
        initial={false}
        animate={{
          x: frame.x,
          y: frame.y,
          scale: frame.scale,
        }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 20 }}
      >
        <motion.div
          animate={nibbyMotion(chapter, reduced)}
          transition={{ duration: chapter === 3 ? 2.4 : 4.6, repeat: Infinity, ease: "easeInOut" }}
          className="h-full w-full"
        >
          <NibbyAssistantStage
            familyId={LANDING_NIBBY_FAMILY_ID}
            driveRef={nibbyDriveRef}
            chargeStage={frame.stage}
            reportBlobTaps={false}
            viewDistance={frame.viewDistance}
            transparentBg
            className="!rounded-none !border-0"
          />
        </motion.div>
      </motion.div>

      <SceneLayer active={chapter === 0} reduced={reduced}>
        <LandingSceneMeet />
      </SceneLayer>
      <SceneLayer active={chapter === 1} reduced={reduced}>
        <LandingSceneChaos active={chapter === 1} />
      </SceneLayer>
      <SceneLayer active={chapter === 2} reduced={reduced}>
        <LandingSceneHome active={chapter === 2} />
      </SceneLayer>
      <SceneLayer active={chapter === 3} reduced={reduced}>
        <LandingScenePlay active={chapter === 3} />
      </SceneLayer>
      <SceneLayer active={chapter === 4} reduced={reduced}>
        <LandingSceneBoard active={chapter === 4} />
      </SceneLayer>
      <SceneLayer active={chapter === 5} reduced={reduced}>
        <LandingSceneKit active={chapter === 5} />
      </SceneLayer>
    </div>
  );
}
