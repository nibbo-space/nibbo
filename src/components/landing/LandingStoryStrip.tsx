"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useLandingReducedMotion } from "@/lib/landing-motion";
import { messageLocale, I18N } from "@/lib/i18n";
import { motion } from "framer-motion";
import { LayoutGrid, Sparkles, Users } from "lucide-react";

export function LandingStoryStrip() {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].landing;
  const reduced = useLandingReducedMotion();

  const cards = [
    { Icon: Sparkles, title: t.nibbyTitle, body: t.nibbyBody },
    { Icon: LayoutGrid, title: t.hubTitle, body: t.hubBody },
    { Icon: Users, title: t.familyTitle, body: t.familyBody },
  ];

  return (
    <section id="landing-story" className="scroll-mt-24">
      <div className="mb-8 text-center md:text-left">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-rose-500/90">{t.storyExpandEyebrow}</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold text-warm-950 sm:text-3xl">{t.storyExpandTitle}</h2>
      </div>
      <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:pb-0">
        {cards.map((card, index) => (
          <motion.li
            key={card.title}
            initial={false}
            transition={{ duration: 0.45, delay: reduced ? 0 : index * 0.08, ease: [0.4, 0, 0.2, 1] }}
            whileHover={reduced ? {} : { y: -6, transition: { duration: 0.22 } }}
            className="min-w-[min(100%,320px)] shrink-0 snap-center rounded-2xl border-2 border-rose-100/90 bg-gradient-to-b from-white/95 to-cream-50/50 p-7 shadow-[0_6px_0_0_rgba(254,205,211,0.85)] backdrop-blur-md md:min-w-0 md:rounded-3xl"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-lavender-100 text-rose-600 shadow-inner">
              <card.Icon className="h-7 w-7" strokeWidth={2} />
            </div>
            <h3 className="font-display text-lg font-extrabold text-warm-950">{card.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-warm-600">{card.body}</p>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
