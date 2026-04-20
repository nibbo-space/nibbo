"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Cookie,
  CreditCard,
  NotebookPen,
  ShoppingCart,
  SquareKanban,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import {
  NIBBO_COOKIE_CONSENT_EVENT,
  NIBBO_COOKIE_CONSENT_KEY,
  NIBBO_COOKIE_CONSENT_VALUE,
} from "@/lib/nibbo-cookie-consent";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const COOKIE_BANNER_DECOR_ICONS = [
  SquareKanban,
  CalendarDays,
  UtensilsCrossed,
  NotebookPen,
  Cookie,
  ShoppingCart,
  CreditCard,
] as const;

const cookieBannerDecorItems = Array.from({ length: 18 }, (_, index) => {
  const Icon =
    COOKIE_BANNER_DECOR_ICONS[index % COOKIE_BANNER_DECOR_ICONS.length];
  const left = 1 + (index % 9) * 11 + ((index * 5) % 6);
  const top = -8 + Math.floor(index / 9) * 48 + ((index * 7) % 14);
  const size = 16 + (index % 4) * 5;
  const opacity = 0.055 + (index % 4) * 0.02;
  const duration = 4.2 + (index % 5) * 0.55;
  const delay = (index % 8) * 0.18;
  const rotate = (index % 2 === 0 ? 1 : -1) * (5 + (index % 3) * 4);
  return { Icon, left, top, size, opacity, duration, delay, rotate };
});

export function CookieConsent() {
  const pathname = usePathname();
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].legal;
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored =
        typeof localStorage !== "undefined"
          ? localStorage.getItem(NIBBO_COOKIE_CONSENT_KEY)
          : null;
      if (stored === NIBBO_COOKIE_CONSENT_VALUE) {
        setVisible(false);
      } else {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(NIBBO_COOKIE_CONSENT_KEY, NIBBO_COOKIE_CONSENT_VALUE);
    } catch {}
    window.dispatchEvent(new Event(NIBBO_COOKIE_CONSENT_EVENT));
    setVisible(false);
  };

  if (!mounted) return null;
  if (
    pathname === "/privacy" ||
    pathname?.startsWith("/privacy/") ||
    pathname === "/roadmap" ||
    pathname?.startsWith("/roadmap/")
  )
    return null;
  if (pathname === "/login" || pathname?.startsWith("/login/")) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-live="polite"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:px-4 md:pb-4 md:pt-0"
        >
          <div className="pointer-events-auto relative w-full max-w-3xl overflow-hidden rounded-3xl border border-rose-200/65 bg-white/95 shadow-[0_16px_48px_-8px_rgba(244,63,94,0.18)] backdrop-blur-md md:bg-gradient-to-br md:from-cream-50 md:via-white md:to-lavender-50 md:shadow-cozy-lg">
            <div
              className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-3xl md:block"
              aria-hidden
            >
              {cookieBannerDecorItems.map((item, i) => (
                <motion.div
                  key={i}
                  className="absolute text-rose-300 select-none"
                  style={{
                    left: `${item.left}%`,
                    top: `${item.top}%`,
                    opacity: item.opacity,
                  }}
                  animate={{
                    y: [0, -10, 0],
                    rotate: [-item.rotate, item.rotate, -item.rotate],
                    scale: [1, 1.05, 1],
                    opacity: [item.opacity, item.opacity + 0.04, item.opacity],
                  }}
                  transition={{
                    duration: item.duration,
                    repeat: Infinity,
                    delay: item.delay,
                    ease: "easeInOut",
                  }}
                >
                  <item.Icon size={item.size} strokeWidth={1.25} />
                </motion.div>
              ))}
            </div>
            <div className="relative z-10 flex gap-3 p-4 sm:p-5 sm:gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 via-rose-50 to-lavender-100 text-rose-500 sm:h-12 sm:w-12"
                aria-hidden
              >
                <Cookie className="h-[22px] w-[22px] sm:h-[26px] sm:w-[26px]" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="cookie-consent-title"
                  className="font-heading text-[15px] font-bold leading-snug text-warm-800 sm:text-base md:text-lg"
                >
                  {t.cookieTitle}
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-warm-600 sm:text-sm md:text-[15px]">
                  {t.cookieText}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-warm-500 sm:text-xs md:text-[13px]">
                  {t.cookieAckBeforeLink}{" "}
                  <Link
                    href="/privacy"
                    className="font-semibold text-rose-600 underline-offset-2 hover:underline"
                  >
                    {t.cookieAckLinkLabel}
                  </Link>{" "}
                  {t.cookieAckAfterLink}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    onClick={accept}
                    className="min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-transform active:scale-[0.98] hover:opacity-95 sm:min-h-0 sm:w-auto sm:py-2.5"
                  >
                    {t.cookieAccept}
                  </button>
                  <Link
                    href="/privacy"
                    className="flex min-h-[44px] w-full items-center justify-center rounded-2xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 active:bg-rose-100/80 sm:min-h-0 sm:w-auto sm:py-2"
                  >
                    {t.cookieLearnMore}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
