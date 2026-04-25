"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FlaskConical,
  Medal,
  Languages,
  Newspaper,
  Store,
  ChevronRight,
} from "lucide-react";
import { messageLocale, I18N, type AppMessages } from "@/lib/i18n";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { cn } from "@/lib/utils";

type ModuleKey = keyof AppMessages["adminHub"]["modules"];

const MODULES: {
  href: string;
  titleNavKey: keyof AppMessages["nav"];
  descKey: ModuleKey;
  Icon: typeof FlaskConical;
  card: string;
  iconWrap: string;
  chevron: string;
}[] = [
  {
    href: "/admin/nibby-lab",
    titleNavKey: "adminNibbyLab",
    descKey: "nibbyLab",
    Icon: FlaskConical,
    card: "border-sage-200/90 bg-gradient-to-br from-sage-50 to-white text-sage-900 shadow-sm hover:border-sage-300",
    iconWrap: "border-sage-200/80 bg-white text-sage-600",
    chevron: "text-sage-500",
  },
  {
    href: "/admin/achievements-lab",
    titleNavKey: "adminAchievementsLab",
    descKey: "achievementsLab",
    Icon: Medal,
    card: "border-amber-200/90 bg-gradient-to-br from-amber-50 to-white text-amber-950 shadow-sm hover:border-amber-300",
    iconWrap: "border-amber-200/80 bg-white text-amber-700",
    chevron: "text-amber-600",
  },
  {
    href: "/admin/languages",
    titleNavKey: "adminLanguages",
    descKey: "languages",
    Icon: Languages,
    card: "border-sky-200/90 bg-gradient-to-br from-sky-50 to-white text-sky-950 shadow-sm hover:border-sky-300",
    iconWrap: "border-sky-200/80 bg-white text-sky-700",
    chevron: "text-sky-600",
  },
  {
    href: "/admin/blog",
    titleNavKey: "adminBlog",
    descKey: "blog",
    Icon: Newspaper,
    card: "border-violet-200/90 bg-gradient-to-br from-violet-50 to-white text-violet-950 shadow-sm hover:border-violet-300",
    iconWrap: "border-violet-200/80 bg-white text-violet-700",
    chevron: "text-violet-600",
  },
  {
    href: "/admin/recipe-marketplace",
    titleNavKey: "adminRecipeMarketplace",
    descKey: "recipeMarketplace",
    Icon: Store,
    card: "border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-white text-emerald-950 shadow-sm hover:border-emerald-300",
    iconWrap: "border-emerald-200/80 bg-white text-emerald-700",
    chevron: "text-emerald-600",
  },
];

export default function AdminHubClient() {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-warm-900 sm:text-3xl">{t.adminHub.title}</h1>
        <p className="mt-2 text-sm text-warm-600 sm:text-base">{t.adminHub.subtitle}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {MODULES.map(({ href, titleNavKey, descKey, Icon, card, iconWrap, chevron }) => (
          <Link key={href} href={href} className="group block touch-manipulation">
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                "flex min-h-[120px] flex-col justify-between rounded-3xl border-2 p-5 transition-colors",
                card
              )}
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                    iconWrap
                  )}
                  aria-hidden
                >
                  <Icon size={22} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold leading-snug text-warm-900">
                    {t.nav[titleNavKey]}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-warm-600">
                    {t.adminHub.modules[descKey]}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-1 text-sm font-semibold">
                <span>{t.adminHub.cta}</span>
                <ChevronRight size={18} className={cn("transition-transform group-hover:translate-x-0.5", chevron)} />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
