"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";

export default function SetPasswordClient({ initialName }: { initialName: string }) {
  const router = useRouter();
  const { language, setLanguage, locales } = useAppLanguage();
  const tRoot = I18N[messageLocale(language)];
  const t = tRoot.setPassword;
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        name: name.trim() || undefined,
        inviteEmails: inviteEmails.trim() || undefined,
      }),
    });
    setBusy(false);
    if (res.status === 403) {
      router.replace("/api/auth/incomplete-expired");
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (data.error === "password_too_short") setError(t.errorTooShort);
      else setError(t.errorGeneric);
      return;
    }
    router.refresh();
    router.replace("/dashboard");
  };

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
              className={
                active
                  ? "rounded-md bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700"
                  : "rounded-md px-2 py-1 text-[11px] font-semibold text-warm-600 hover:bg-warm-100"
              }
            >
              {loc.code.toUpperCase()}
            </button>
          );
        })}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/60 bg-white/85 p-10 text-center shadow-cozy-lg backdrop-blur-md">
          <div className="mb-6 flex justify-center">
            <Image src="/favicon.svg" alt="" width={72} height={72} />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-warm-800">{t.title}</h1>
          <p className="mb-6 text-sm text-warm-500">{t.subtitle}</p>
          {error ? <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
          <label className="sr-only" htmlFor="sp-name">
            {t.nameLabel}
          </label>
          <input
            id="sp-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="mb-4 w-full rounded-2xl border-2 border-warm-200 bg-white px-4 py-3 text-sm text-warm-800 outline-none focus:border-rose-300"
          />
          <label className="sr-only" htmlFor="new-password">
            {t.passwordLabel}
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.passwordLabel}
            className="mb-2 w-full rounded-2xl border-2 border-warm-200 bg-white px-4 py-3 text-sm text-warm-800 outline-none focus:border-rose-300"
          />
          <p className="mb-4 text-left text-xs text-warm-400">{t.hint}</p>
          <label className="sr-only" htmlFor="sp-invite-emails">
            {t.inviteEmailsLabel}
          </label>
          <textarea
            id="sp-invite-emails"
            rows={2}
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            placeholder={t.inviteEmailsPlaceholder}
            className="mb-4 w-full resize-y rounded-2xl border-2 border-warm-200 bg-white px-4 py-3 text-left text-sm text-warm-800 outline-none focus:border-rose-300"
          />
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={busy || password.length < 8}
            onClick={submit}
            className="w-full rounded-2xl bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-cozy transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t.submitting : t.submit}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
