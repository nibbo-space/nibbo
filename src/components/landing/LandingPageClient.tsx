"use client";

import { LandingCinematicShell } from "@/components/landing/LandingCinematicShell";
import type { NibbyChatDrive } from "@/components/shared/NibbyAssistantStage";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export function LandingPageClient({ className }: { className?: string }) {
  const nibbyDriveRef = useRef<NibbyChatDrive>({ speaking: false, lipPulse: 0 });

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div className={cn("relative h-dvh w-full max-w-none bg-mist-100 font-landing text-ink-900", className)}>
      <LandingCinematicShell nibbyDriveRef={nibbyDriveRef} />
    </div>
  );
}
