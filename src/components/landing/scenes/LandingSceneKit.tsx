"use client";

import { LandingSceneCaption } from "@/components/landing/LandingSceneCaption";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useLandingReducedMotion } from "@/lib/landing-motion";
import { I18N, messageLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CreditCard,
  NotebookPen,
  ShoppingCart,
  SquareKanban,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function LandingSceneKit({ active }: { active: boolean }) {
  const { language } = useAppLanguage();
  const ml = messageLocale(language);
  const t = I18N[ml].landing;
  const features = I18N[ml].login.features;
  const dash = I18N[ml].dashboard;
  const priority = I18N[ml].task.priority;
  const reduced = useLandingReducedMotion();

  const modules = [
    {
      Icon: SquareKanban,
      label: features.tasks,
      accent: "from-rose-50 to-white border-rose-200/80",
      iconTone: "bg-rose-100 text-rose-600",
      preview: (
        <div className="mt-2 space-y-1">
          <div className="rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-warm-700 ring-1 ring-warm-100">
            {t.mockTaskDinner}
            <span className="ml-1 rounded-full bg-peach-100 px-1.5 py-0.5 text-[8px] font-bold text-peach-700">{priority.HIGH}</span>
          </div>
          <div className="rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-warm-700 ring-1 ring-warm-100">
            {t.mockTaskGroceries}
          </div>
        </div>
      ),
    },
    {
      Icon: CalendarDays,
      label: features.calendar,
      accent: "from-lavender-50 to-white border-lavender-200/80",
      iconTone: "bg-lavender-100 text-lavender-600",
      preview: (
        <div className="mt-2 grid grid-cols-4 gap-1">
          {["M", "T", "W", "T"].map((d, i) => (
            <div
              key={d + i}
              className={cn(
                "flex h-7 items-center justify-center rounded-md text-[9px] font-bold",
                i === 1 ? "border border-rose-200 bg-rose-50 text-rose-600" : "bg-white text-warm-400 ring-1 ring-warm-100",
              )}
            >
              {d}
            </div>
          ))}
        </div>
      ),
    },
    {
      Icon: UtensilsCrossed,
      label: features.menu,
      accent: "from-peach-50 to-white border-peach-200/80",
      iconTone: "bg-peach-100 text-peach-600",
      preview: (
        <div className="mt-2 space-y-1">
          <div className="rounded-lg bg-cream-100 px-2 py-1 text-[10px] font-semibold text-warm-700">{t.kitMenuPreview1}</div>
          <div className="rounded-lg bg-lavender-50 px-2 py-1 text-[10px] font-semibold text-lavender-800">{t.kitMenuPreview2}</div>
        </div>
      ),
    },
    {
      Icon: NotebookPen,
      label: features.notes,
      accent: "from-cream-50 to-white border-warm-200/80",
      iconTone: "bg-cream-100 text-warm-600",
      preview: (
        <div className="mt-2 overflow-hidden rounded-lg border border-warm-200/90 bg-white">
          <div className="h-1 bg-rose-300" />
          <div className="space-y-1 px-2 py-1.5">
            <div className="text-[10px] font-semibold text-warm-700">{t.kitNotePreview1}</div>
            <div className="text-[10px] text-warm-400">{t.kitNotePreview2}</div>
          </div>
        </div>
      ),
    },
    {
      Icon: CreditCard,
      label: features.budget,
      accent: "from-sage-50 to-white border-sage-200/80",
      iconTone: "bg-sage-100 text-sage-700",
      preview: (
        <div className="mt-2 rounded-lg bg-gradient-to-r from-sage-400 to-sage-500 px-2 py-2 text-white">
          <p className="text-[9px] font-semibold opacity-90">{t.kitBudgetPreview1}</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/30">
            <div className="h-full w-2/3 rounded-full bg-white" />
          </div>
        </div>
      ),
    },
    {
      Icon: ShoppingCart,
      label: features.shopping,
      accent: "from-rose-50 to-white border-rose-200/80",
      iconTone: "bg-rose-100 text-rose-600",
      preview: (
        <div className="mt-2 space-y-1">
          {[t.mockShopMilk, t.mockShopBread].map((item, i) => (
            <div key={item} className="flex items-center gap-1.5 text-[10px] font-semibold text-warm-700">
              <span
                className={cn(
                  "h-3 w-3 rounded-full border-2",
                  i === 0 ? "border-rose-400 bg-rose-400" : "border-warm-300",
                )}
              />
              <span className={i === 0 ? "text-warm-400 line-through" : ""}>{item}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute bottom-[30%] left-3 top-4 z-10 flex w-[min(96%,420px)] flex-col gap-2 overflow-hidden md:bottom-[28%] md:left-6 md:top-6"
        initial={reduced ? false : { opacity: 0, x: -16 }}
        animate={active ? { opacity: 1, x: 0 } : { opacity: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="rounded-3xl border border-warm-100 bg-white/80 px-3.5 py-3 shadow-cozy backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">{dash.quickAccess}</p>
          <p className="mt-0.5 text-sm font-bold text-warm-800">{t.kitShelfTitle}</p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pb-1">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.label}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={active ? { opacity: 1, y: 0 } : { opacity: 0 }}
              transition={{ delay: reduced ? 0 : i * 0.04 }}
              className={cn("rounded-2xl border bg-gradient-to-br p-2.5 shadow-cozy", mod.accent)}
            >
              <div className="flex items-center gap-2">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", mod.iconTone)}>
                  <mod.Icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <p className="truncate text-xs font-bold text-warm-800">{mod.label}</p>
              </div>
              {mod.preview}
            </motion.div>
          ))}
        </div>

        <div className="pointer-events-auto flex flex-col gap-1.5 md:hidden">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-400 to-rose-500 px-5 py-3 text-sm font-bold text-white shadow-cozy"
          >
            <Image src="/favicon.svg" alt="" width={16} height={16} />
            {t.ctaSignIn}
          </Link>
        </div>
      </motion.div>

      <LandingSceneCaption title={t.sceneKitTitle} body={t.sceneKitBody} />
    </div>
  );
}
