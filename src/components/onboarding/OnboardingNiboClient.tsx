"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { LANDING_NIBBY_CHARGE_STAGE } from "@/lib/landing-nibby";
import type { NibbyChatDrive } from "@/components/shared/NibbyAssistantStage";

const NibbyAssistantStage = dynamic(
  () => import("@/components/shared/NibbyAssistantStage"),
  {
    ssr: false,
    loading: () => (
      <div
        className="aspect-[5/6] w-full animate-pulse rounded-2xl bg-gradient-to-b from-cream-100 to-rose-50"
        aria-hidden
      />
    ),
  }
);

type Props = {
  familyId: string;
};

export default function OnboardingNiboClient({ familyId }: Props) {
  const router = useRouter();
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].onboarding;
  const [busy, setBusy] = useState(false);
  const nibbyDriveRef = useRef<NibbyChatDrive>({ speaking: false, lipPulse: 0 });

  const onContinue = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/users/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niboWelcome: true }),
      });
      if (!res.ok) throw new Error("fail");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error(t.saveError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4 pb-12 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="relative mx-auto mb-8 w-full max-w-[300px]">
          <div className="relative overflow-hidden rounded-[1.5rem] border-[3px] border-rose-300/90 bg-gradient-to-b from-white via-cream-50/95 to-rose-50/85 p-2 shadow-[0_12px_0_0_rgba(190,24,93,0.1),0_24px_48px_-12px_rgba(244,63,94,0.2)] sm:rounded-[1.75rem] sm:p-3">
            <div className="pointer-events-none absolute inset-x-3 top-2 z-10 flex justify-between font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-rose-400/80">
              <span aria-hidden>◇</span>
              <span>{t.niboStageTag}</span>
              <span aria-hidden>◇</span>
            </div>
            <div
              className="relative mt-7 aspect-[5/6] w-full overflow-hidden rounded-2xl border border-rose-100/80 bg-gradient-to-b from-rose-50/60 to-white/70"
              role="img"
              aria-label={t.niboStageAria}
            >
              <div className="absolute inset-0 min-h-0">
                <NibbyAssistantStage
                  familyId={familyId}
                  driveRef={nibbyDriveRef}
                  chargeStage={LANDING_NIBBY_CHARGE_STAGE}
                  reportBlobTaps={false}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-rose-500">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">{t.niboEyebrow}</span>
          </div>
          <h1 className="text-2xl font-bold text-warm-800 sm:text-3xl">{t.niboTitle}</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-warm-600">{t.niboBody}</p>
          <motion.button
            type="button"
            disabled={busy}
            whileHover={{ scale: busy ? 1 : 1.02 }}
            whileTap={{ scale: busy ? 1 : 0.98 }}
            onClick={() => void onContinue()}
            className="mt-10 w-full max-w-sm rounded-2xl bg-gradient-to-r from-rose-500 to-peach-500 px-8 py-3.5 text-sm font-semibold text-white shadow-cozy transition disabled:opacity-60 sm:w-auto"
          >
            {busy ? I18N[messageLocale(language)].onboarding.saving : t.niboCta}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
