"use client";

import { LandingSceneCaption } from "@/components/landing/LandingSceneCaption";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { I18N, messageLocale } from "@/lib/i18n";

export function LandingSceneMeet() {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].landing;

  return (
    <div className="absolute inset-0">
      <LandingSceneCaption title={t.sceneMeetTitle} body={t.sceneMeetBody} />
    </div>
  );
}
