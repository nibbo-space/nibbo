"use client";

import { motion } from "framer-motion";
import { CalendarDays, CreditCard, Mail, NotebookPen, ShoppingCart, SquareKanban, UtensilsCrossed } from "lucide-react";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function VerifyRequestClient() {
  const { language, setLanguage, locales } = useAppLanguage();
  const tRoot = I18N[messageLocale(language)];
  const t = tRoot.verifyRequest;

  const decorations = [SquareKanban, CalendarDays, UtensilsCrossed, NotebookPen, CreditCard, ShoppingCart];
  const backgroundDecorations = Array.from({ length: 36 }, (_, index) => {
    const Icon = decorations[index % decorations.length]!;
    const col = index % 6;
    const row = Math.floor(index / 6);
    const left = 6 + col * 17 + ((index * 7) % 9) - 4;
    const top = 5 + row * 16 + ((index * 11) % 7) - 3;
    const size = 18 + (index % 4) * 8;
    return {
      Icon,
      left,
      top,
      size,
      duration: 4.5 + (index % 6) * 0.6,
      delay: (index % 8) * 0.25,
      rotate: (index % 2 === 0 ? 1 : -1) * (5 + (index % 3) * 4),
      opacity: 0.12 + (index % 4) * 0.05,
    };
  });
  const accentDecorations = [
    { Icon: NotebookPen, left: "10%", top: "12%", size: 96, opacity: 0.08 },
    { Icon: CalendarDays, left: "78%", top: "16%", size: 120, opacity: 0.07 },
    { Icon: ShoppingCart, left: "70%", top: "72%", size: 110, opacity: 0.07 },
    { Icon: CreditCard, left: "18%", top: "74%", size: 88, opacity: 0.08 },
  ];

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

      {accentDecorations.map((item, i) => (
        <motion.div
          key={`accent-${i}`}
          className="pointer-events-none absolute text-rose-300/70"
          style={{ left: item.left, top: item.top, opacity: item.opacity }}
          animate={{ y: [0, -14, 0], rotate: [-4, 4, -4], scale: [1, 1.04, 1] }}
          transition={{ duration: 9 + i * 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <item.Icon size={item.size} strokeWidth={1.25} />
        </motion.div>
      ))}
      {backgroundDecorations.map((item, i) => (
        <motion.div
          key={`bg-${i}`}
          className="pointer-events-none absolute select-none text-rose-300/70"
          style={{ left: `${item.left}%`, top: `${item.top}%`, opacity: item.opacity }}
          animate={{
            y: [0, -16, 0],
            rotate: [-item.rotate, item.rotate, -item.rotate],
            scale: [1, 1.08, 1],
            opacity: [item.opacity, item.opacity + 0.12, item.opacity],
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            delay: item.delay,
            ease: "easeInOut",
          }}
        >
          <item.Icon size={item.size} />
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/60 bg-white/85 p-10 text-center shadow-cozy-lg backdrop-blur-md">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-8 flex justify-center"
          >
            <div
              className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-50 via-white to-rose-100/90 text-rose-600 shadow-cozy ring-2 ring-rose-200/50"
              aria-hidden
            >
              <Mail size={44} strokeWidth={1.65} />
            </div>
          </motion.div>
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
