"use client";

import { LandingFooterCta } from "@/components/landing/LandingFooterCta";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingLeaderboard } from "@/components/landing/LandingLeaderboard";
import { LandingModulesBento } from "@/components/landing/LandingModulesBento";
import { LandingNibbyIntroSlide } from "@/components/landing/LandingNibbyIntroSlide";
import { LandingParallaxBackdrop } from "@/components/landing/LandingParallaxBackdrop";
import { LandingParallaxSection } from "@/components/landing/LandingParallaxSection";
import { LandingScrollJourney } from "@/components/landing/LandingScrollJourney";
import { LandingSupportUkraineBanner } from "@/components/landing/LandingSupportUkraineBanner";
import type { NibbyChatDrive } from "@/components/shared/NibbyAssistantStage";
import { useRef } from "react";

export function LandingPageClient() {
  const nibbyDriveRef = useRef<NibbyChatDrive>({ speaking: false, lipPulse: 0 });

  return (
    <div className="relative min-h-dvh w-full max-w-none overflow-x-hidden bg-gradient-to-br from-cream-50 via-rose-50/45 to-lavender-50/35 text-warm-950">
      <LandingParallaxBackdrop />
      <div className="relative z-10 w-full min-w-0 max-w-none">
        <LandingHero nibbyDriveRef={nibbyDriveRef} />
      </div>
      <main className="relative z-10 mx-auto mt-12 flex min-w-0 max-w-6xl flex-col gap-14 px-4 pb-28 md:mt-16 md:gap-20 md:pb-32">
        <LandingParallaxSection depth={0.9}>
          <LandingNibbyIntroSlide />
        </LandingParallaxSection>
        <LandingParallaxSection depth={1}>
          <LandingScrollJourney />
        </LandingParallaxSection>
        <LandingParallaxSection depth={1.15}>
          <LandingModulesBento />
        </LandingParallaxSection>
        <LandingParallaxSection depth={0.95}>
          <LandingLeaderboard />
        </LandingParallaxSection>
        <LandingParallaxSection depth={0.7}>
          <LandingFooterCta />
        </LandingParallaxSection>
      </main>
      <LandingSupportUkraineBanner />
    </div>
  );
}
