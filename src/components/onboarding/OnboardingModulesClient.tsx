"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clapperboard,
  CreditCard,
  NotebookPen,
  Repeat2,
  ShoppingCart,
  SquareKanban,
  UtensilsCrossed,
  Pill,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { FAMILY_MODULE_CARD_ORDER, type AppModuleKey } from "@/lib/family-app-modules";

const MODULE_ICONS: Record<AppModuleKey, typeof SquareKanban> = {
  TASKS: SquareKanban,
  CALENDAR: CalendarDays,
  MENU: UtensilsCrossed,
  NOTES: NotebookPen,
  BUDGET: CreditCard,
  SUBSCRIPTIONS: Repeat2,
  SHOPPING: ShoppingCart,
  WATCH: Clapperboard,
  MEDICATIONS: Pill,
};

type Props = {
  initialDisabled: string[];
};

export default function OnboardingModulesClient({ initialDisabled }: Props) {
  const router = useRouter();
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].onboarding;
  const tFamily = I18N[messageLocale(language)].family;
  const [disabled, setDisabled] = useState<string[]>(initialDisabled);
  const [saving, setSaving] = useState(false);

  const toggle = (key: AppModuleKey) => {
    setDisabled((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return [...s];
    });
  };

  const onContinue = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/family/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "modules",
          disabledAppModules: disabled,
          completeModulesSetup: true,
        }),
      });
      if (!res.ok) throw new Error("fail");
      router.push("/onboarding/nibo");
      router.refresh();
    } catch {
      toast.error(t.toastModulesError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4 pb-10 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-rose-500">{t.modulesEyebrow}</p>
        <h1 className="mt-2 text-center text-2xl font-bold text-warm-800 sm:text-3xl">{t.modulesTitle}</h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-warm-500">{t.modulesSubtitle}</p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FAMILY_MODULE_CARD_ORDER.map(({ key, navKey }) => {
            const isOff = disabled.includes(key);
            const Icon = MODULE_ICONS[key];
            const label = I18N[messageLocale(language)].nav[navKey as keyof typeof I18N.uk.nav];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={`flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center transition-colors touch-manipulation ${
                  isOff
                    ? "border-warm-200 bg-warm-100/80 text-warm-500"
                    : "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white text-rose-700 shadow-sm hover:border-rose-300"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                    isOff ? "border-warm-200 bg-white text-warm-500" : "border-rose-200/70 bg-white text-rose-600"
                  }`}
                >
                  <Icon size={20} strokeWidth={2} aria-hidden />
                </span>
                <span className="text-xs font-semibold leading-tight text-warm-800">{label}</span>
                <span className="text-[11px] font-medium text-warm-500">{isOff ? tFamily.moduleOff : tFamily.moduleOn}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <motion.button
            type="button"
            disabled={saving}
            whileHover={{ scale: saving ? 1 : 1.02 }}
            whileTap={{ scale: saving ? 1 : 0.98 }}
            onClick={() => void onContinue()}
            className="rounded-2xl bg-gradient-to-r from-rose-500 to-peach-500 px-10 py-3.5 text-sm font-semibold text-white shadow-cozy transition disabled:opacity-60"
          >
            {saving ? t.saving : t.continue}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
