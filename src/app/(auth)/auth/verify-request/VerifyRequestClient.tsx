"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Mail } from "lucide-react";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function VerifyRequestClient() {
  const { language, setLanguage, locales } = useAppLanguage();
  const tRoot = I18N[messageLocale(language)];
  const t = tRoot.verifyRequest;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-cream-50 via-rose-50/40 to-lavender-50/30 p-4">
      <div
        className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-xl border border-warm-200 bg-white/90 px-1 py-1 shadow-sm backdrop-blur-sm"
        aria-label={tRoot.languageLabel}
        title={tRoot.languageLabel}
      >
        {locales.map((loc) => {
          const active = language.toLowerCase() === loc.code.toLowerCase();
          return (
            <button
              key={loc.code}
              type="button"
              title={loc.name}
              onClick={() => setLanguage(loc.code)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                active ? "bg-rose-100 text-rose-700" : "text-warm-600 hover:bg-warm-100"
              )}
            >
              {loc.code.toUpperCase()}
            </button>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/60 bg-white/85 p-10 text-center shadow-cozy-lg backdrop-blur-md">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-5 flex justify-center"
          >
            <Image src="/favicon.svg" alt="" width={72} height={72} />
          </motion.div>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <Mail size={32} strokeWidth={1.75} />
          </div>
          <h1 className="mb-3 text-2xl font-bold text-warm-800">{t.title}</h1>
          <p className="mb-8 text-sm leading-relaxed text-warm-600">{t.body}</p>
          <Link
            href="/login"
            className="inline-flex text-sm font-semibold text-rose-600 underline-offset-2 hover:underline"
          >
            {t.backToLogin}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
