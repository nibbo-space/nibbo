"use client";

import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarDays, CreditCard, NotebookPen, ShoppingCart, SquareKanban, UtensilsCrossed } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import Link from "next/link";

type AuthPanel = "signin" | "register";

export default function LoginClient({ magicLinkEnabled }: { magicLinkEnabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language, setLanguage, locales } = useAppLanguage();
  const tRoot = I18N[messageLocale(language)];
  const t = tRoot.login;
  const [panel, setPanel] = useState<AuthPanel>("signin");
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingMagic, setLoadingMagic] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [credEmail, setCredEmail] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const errKey = searchParams.get("error");
  const inviteFlow = searchParams.get("invite") === "1";
  const afterAuthUrl = inviteFlow ? "/onboarding/account-setup" : "/dashboard";
  const errorLine =
    errKey === "credential_expired"
      ? t.errors.credential_expired
      : errKey === "invite_invalid"
        ? t.errors.invite_invalid
        : errKey === "invite_expired"
          ? t.errors.invite_expired
          : errKey === "EmailSignin"
            ? t.errors.EmailSignin
            : errKey === "Configuration"
              ? t.errors.Configuration
              : errKey === "CredentialsSignin"
                ? t.errors.CredentialsSignin
                : errKey
                  ? errKey
                  : null;

  useEffect(() => {
    if (searchParams.get("tab") === "register") setPanel("register");
    const pre = searchParams.get("inviteEmail")?.trim().toLowerCase();
    if (pre && pre.includes("@")) {
      setMagicEmail(pre);
      setCredEmail(pre);
      const q = new URLSearchParams(searchParams.toString());
      if (q.has("inviteEmail")) {
        q.delete("inviteEmail");
        const qs = q.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }
    }
  }, [pathname, router, searchParams]);

  const busy = loadingGoogle || loadingMagic || loadingCredentials;

  const handleGoogleSignIn = async () => {
    setLoadingGoogle(true);
    await signIn("google", { callbackUrl: afterAuthUrl });
  };

  const handleMagicLink = async () => {
    const trimmed = magicEmail.trim().toLowerCase();
    if (!trimmed || !magicLinkEnabled) return;
    setLoadingMagic(true);
    await signIn("nodemailer", { email: trimmed, callbackUrl: afterAuthUrl });
    setLoadingMagic(false);
  };

  const handleCredentials = async () => {
    const e = credEmail.trim().toLowerCase();
    if (!e || !credPassword) return;
    setLoadingCredentials(true);
    const res = await signIn("credentials", {
      email: e,
      password: credPassword,
      callbackUrl: afterAuthUrl,
      redirect: false,
    });
    setLoadingCredentials(false);
    if (res?.error) {
      router.replace(`/login?error=${encodeURIComponent(res.error)}`);
      return;
    }
    if (res?.ok && res.url) {
      router.push(res.url);
      router.refresh();
    }
  };

  const decorations = [SquareKanban, CalendarDays, UtensilsCrossed, NotebookPen, CreditCard, ShoppingCart];
  const backgroundDecorations = Array.from({ length: 36 }, (_, index) => {
    const Icon = decorations[index % decorations.length];
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
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-rose-50/40 to-lavender-50/30 flex items-center justify-center p-4 overflow-hidden relative">
      <div
        className="absolute top-4 right-4 z-20 flex items-center gap-1 rounded-xl border border-warm-200 bg-white/90 backdrop-blur-sm px-1 py-1 shadow-sm"
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
                "px-2 py-1 text-[11px] rounded-md font-semibold transition-colors",
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
          className="absolute text-rose-300/70 pointer-events-none"
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
          className="absolute text-rose-300/70 select-none pointer-events-none"
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
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-cozy-lg p-10 text-center border border-white/60">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-6 flex items-center justify-center"
          >
            <Image src="/favicon.svg" alt="Nibbo logo" width={84} height={84} />
          </motion.div>

          <h1 className="text-3xl font-bold text-warm-800 mb-2">Nibbo</h1>
          <p className="text-warm-500 mb-6 text-sm">{t.subtitle}</p>

          {errorLine ? (
            <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{errorLine}</p>
          ) : null}
          {inviteFlow ? (
            <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {t.inviteFromEmailHint}
            </p>
          ) : null}

          <div
            className="mb-6 flex rounded-2xl border border-warm-200 bg-warm-50/80 p-1 text-sm font-semibold"
            role="tablist"
            aria-label={`${t.tabSignIn} · ${t.tabRegisterEmail}`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={panel === "signin"}
              onClick={() => setPanel("signin")}
              className={cn(
                "min-h-11 flex-1 rounded-xl px-2 py-2 transition-colors",
                panel === "signin" ? "bg-white text-rose-700 shadow-sm" : "text-warm-600 hover:text-warm-800"
              )}
            >
              {t.tabSignIn}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panel === "register"}
              onClick={() => setPanel("register")}
              className={cn(
                "min-h-11 flex-1 rounded-xl px-2 py-2 transition-colors",
                panel === "register" ? "bg-white text-rose-700 shadow-sm" : "text-warm-600 hover:text-warm-800"
              )}
            >
              {t.tabRegisterEmail}
            </button>
          </div>

          {panel === "signin" ? (
            <div className="text-left space-y-5">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-warm-200 bg-white px-6 py-4 font-semibold text-warm-700 shadow-cozy transition-all hover:border-rose-300 hover:shadow-cozy-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingGoogle ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-5 w-5 rounded-full border-2 border-rose-400 border-t-transparent"
                  />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span>{loadingGoogle ? t.signingIn : t.signInWithGoogle}</span>
              </motion.button>

              <div>
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-warm-400">{t.credentialsTitle}</p>
                <label className="sr-only" htmlFor="cred-email">
                  {t.emailPlaceholder}
                </label>
                <input
                  id="cred-email"
                  type="email"
                  autoComplete="email"
                  value={credEmail}
                  onChange={(e) => setCredEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="mb-3 w-full rounded-2xl border-2 border-warm-200 bg-white px-4 py-3 text-sm text-warm-800 outline-none focus:border-rose-300"
                />
                <label className="sr-only" htmlFor="cred-password">
                  {t.passwordPlaceholder}
                </label>
                <input
                  id="cred-password"
                  type="password"
                  autoComplete="current-password"
                  value={credPassword}
                  onChange={(e) => setCredPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="mb-3 w-full rounded-2xl border-2 border-warm-200 bg-white px-4 py-3 text-sm text-warm-800 outline-none focus:border-rose-300"
                />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCredentials}
                  disabled={busy || !credEmail.trim() || !credPassword}
                  className="w-full rounded-2xl border-2 border-warm-200 bg-white px-6 py-3 text-sm font-semibold text-warm-700 shadow-cozy transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingCredentials ? t.signingIn : t.signInWithPassword}
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="text-left space-y-4">
              <p className="text-center text-sm text-warm-600">{t.registerEmailHint}</p>
              {!magicLinkEnabled ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">{t.smtpDisabledHint}</p>
              ) : null}
              <label className="sr-only" htmlFor="magic-email">
                {t.emailPlaceholder}
              </label>
              <input
                id="magic-email"
                type="email"
                autoComplete="email"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                disabled={!magicLinkEnabled}
                className="w-full rounded-2xl border-2 border-warm-200 bg-white px-4 py-3 text-sm text-warm-800 outline-none focus:border-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <motion.button
                type="button"
                whileHover={{ scale: magicLinkEnabled ? 1.02 : 1 }}
                whileTap={{ scale: magicLinkEnabled ? 0.98 : 1 }}
                onClick={handleMagicLink}
                disabled={busy || !magicEmail.trim() || !magicLinkEnabled}
                className="w-full rounded-2xl bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-cozy transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMagic ? t.magicSending : t.registerSendLink}
              </motion.button>
            </div>
          )}

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { Icon: SquareKanban, label: t.features.tasks },
              { Icon: CalendarDays, label: t.features.calendar },
              { Icon: UtensilsCrossed, label: t.features.menu },
              { Icon: NotebookPen, label: t.features.notes },
              { Icon: CreditCard, label: t.features.budget },
              { Icon: ShoppingCart, label: t.features.shopping },
            ].map((f) => (
              <motion.div
                key={f.label}
                whileHover={{ scale: 1.05, y: -2 }}
                className="rounded-2xl border border-cream-200 bg-cream-50 p-3"
              >
                <div className="mb-1 flex justify-center">
                  <f.Icon size={20} className="text-warm-600" />
                </div>
                <div className="text-xs font-medium text-warm-500">{f.label}</div>
              </motion.div>
            ))}
          </div>

          <p className="mt-6 text-center">
            <Link
              href="/landing"
              className="text-sm font-semibold text-rose-600 underline-offset-2 hover:underline"
            >
              {t.landingLink}
            </Link>
          </p>

          <p className="mt-4 text-xs text-warm-400">{t.footer}</p>
        </div>
      </motion.div>
    </div>
  );
}
