"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { House, MessageSquareText } from "lucide-react";
import { I18N } from "@/lib/i18n";
import { useAppLanguage } from "@/hooks/useAppLanguage";

export function NotFoundContent() {
  const { language } = useAppLanguage();
  const t = I18N[language].notFound;

  return (
    <div className="flex min-h-[calc(100dvh-1px)] flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md text-center"
      >
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-100 via-white to-lavender-100 shadow-cozy ring-2 ring-rose-100/80">
          <motion.div
            animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image src="/favicon.svg" alt="" width={56} height={56} className="opacity-95" />
          </motion.div>
        </div>

        <p className="font-heading text-sm font-bold uppercase tracking-[0.2em] text-rose-500">{t.badge}</p>
        <h1 className="font-heading mt-2 text-2xl font-bold text-warm-800 md:text-3xl">{t.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-warm-600 md:text-[15px]">{t.subtitle}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95"
          >
            <House size={18} strokeWidth={2} aria-hidden />
            {t.homeCta}
          </Link>
          <Link
            href="/feedback"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-warm-200 bg-white px-5 py-3 text-sm font-semibold text-warm-700 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50/60"
          >
            <MessageSquareText size={18} strokeWidth={2} aria-hidden />
            {t.feedbackCta}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
