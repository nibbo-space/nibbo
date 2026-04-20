"use client";

import { CozyPageBackground } from "@/components/shared/CozyPageBackground";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { motion } from "framer-motion";
import {
  Baby,
  CalendarHeart,
  MapPinned,
  MessageCircleHeart,
  Smartphone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const ICONS = [Smartphone, Baby, Sparkles, CalendarHeart, MessageCircleHeart] as const;

export function RoadmapContent({ signedIn = false }: { signedIn?: boolean }) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].roadmapPage;
  const nav = I18N[messageLocale(language)].nav;

  const items = [
    { title: t.item1Title, body: t.item1Body },
    { title: t.item2Title, body: t.item2Body },
    { title: t.item3Title, body: t.item3Body },
    { title: t.item4Title, body: t.item4Body },
    { title: t.item5Title, body: t.item5Body },
  ] as const;

  return (
    <CozyPageBackground>
      <div className="min-h-screen px-4 py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          <Link
            href={signedIn ? "/dashboard" : "/landing"}
            className="text-sm font-semibold text-rose-600 underline-offset-2 transition-colors hover:text-rose-700 hover:underline"
          >
            ← {signedIn ? nav.dashboard : t.backToSite}
          </Link>

          <header className="mt-8 text-center md:mt-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-rose-200/90 bg-gradient-to-br from-rose-50 to-lavender-50 shadow-cozy">
              <MapPinned className="h-7 w-7 text-rose-500" strokeWidth={2.2} aria-hidden />
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-warm-900 md:text-4xl">
              {t.heading}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-warm-600 md:text-base">
              {t.lead}
            </p>
          </header>

          <ul className="mt-10 space-y-4 md:mt-12">
            {items.map((item, i) => {
              const Icon = ICONS[i]!;
              return (
                <motion.li
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                  className="group relative overflow-hidden rounded-3xl border border-warm-100 bg-white/95 p-5 shadow-cozy transition-shadow hover:shadow-cozy-hover md:p-6"
                >
                  <div
                    className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-rose-100/80 to-lavender-100/60 opacity-70 blur-2xl transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                  <div className="relative flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-gradient-to-b from-white to-rose-50/80 text-rose-500 shadow-sm">
                      <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-heading text-lg font-bold text-warm-800 md:text-xl">
                        {item.title}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-warm-600 md:text-[15px]">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <p className="mt-10 text-center text-xs font-medium text-warm-400">{t.disclaimer}</p>
        </div>
      </div>
    </CozyPageBackground>
  );
}
