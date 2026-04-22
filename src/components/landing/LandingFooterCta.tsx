"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useLandingReducedMotion } from "@/lib/landing-motion";
import { messageLocale, I18N } from "@/lib/i18n";
import { motion } from "framer-motion";
import { LogIn, MapPinned, Newspaper, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function LandingFooterCta() {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].landing;
  const nav = I18N[messageLocale(language)].nav;
  const reduced = useLandingReducedMotion();

  const navItems = [
    { href: "/roadmap", label: nav.roadmap, Icon: MapPinned },
    { href: "/blog", label: nav.blog, Icon: Newspaper },
    { href: "/privacy", label: t.privacyLink, Icon: Shield },
    { href: "/login", label: t.ctaSignIn, Icon: LogIn },
  ] as const;

  return (
    <section className="scroll-mt-24 space-y-4">
      {/* CTA card */}
      <div className="relative overflow-hidden rounded-[1.75rem] border-[3px] border-rose-200/80 bg-gradient-to-br from-white via-rose-50/60 to-lavender-50/50 px-6 py-14 text-center shadow-[0_10px_0_0_rgba(253,164,175,0.3),0_28px_60px_-20px_rgba(244,63,94,0.12)] sm:px-10 sm:py-16 md:rounded-[2rem]">
        {/* Soft radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 110%, rgba(251,207,232,0.55) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 15% 0%, rgba(221,214,254,0.3) 0%, transparent 55%)",
          }}
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center gap-7">
          <motion.div
            animate={reduced ? {} : { y: [0, -5, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-20 w-20 items-center justify-center rounded-3xl border-[3px] border-rose-200/80 bg-white shadow-[0_8px_0_0_rgba(253,164,175,0.4)]"
          >
            <Image src="/favicon.svg" alt="Nibbo" width={44} height={44} />
          </motion.div>

          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-rose-500">
              {t.footerCtaEyebrow}
            </p>
            <h2 className="font-display text-balance text-3xl font-extrabold leading-tight tracking-tight text-warm-950 sm:text-4xl">
              {t.closingTitle}
            </h2>
            <p className="mx-auto max-w-sm text-pretty text-sm leading-relaxed text-warm-600 sm:text-base">
              {t.footerCtaSupport}
            </p>
          </div>

          <motion.div
            whileHover={reduced ? {} : { scale: 1.04 }}
            whileTap={reduced ? {} : { scale: 0.97 }}
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-3 rounded-2xl border-2 border-rose-500 bg-gradient-to-b from-rose-400 to-rose-600 px-10 py-4 font-display text-base font-extrabold text-white shadow-[0_6px_0_#be123c] transition-[transform,box-shadow] active:translate-y-1.5 active:shadow-[0_2px_0_#be123c]"
            >
              <Image src="/favicon.svg" alt="" width={22} height={22} />
              {t.ctaSignIn}
            </Link>
          </motion.div>

          <p className="text-xs font-semibold text-warm-400">
            {t.trustLine}
          </p>
        </div>
      </div>

      {/* Footer bar */}
      <footer className="flex flex-col items-center gap-4 rounded-2xl border border-warm-200/60 bg-white/70 px-5 py-5 backdrop-blur-sm sm:px-8 md:flex-row md:justify-between md:rounded-[1.5rem]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-white shadow-sm">
            <Image src="/favicon.svg" alt="" width={26} height={26} />
          </div>
          <div>
            <p className="font-display text-sm font-extrabold text-warm-900">Nibbo</p>
            <p className="text-xs text-warm-500">{t.footerBrandLine}</p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          {navItems.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-4 py-2 text-xs font-bold text-warm-700 shadow-sm transition-colors hover:border-rose-200 hover:text-rose-600"
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </footer>
    </section>
  );
}
