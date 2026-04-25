"use client";



import { motion } from "framer-motion";

import { Plus, X } from "lucide-react";

import Image from "next/image";

import { useRouter } from "next/navigation";

import { useRef, useState } from "react";

import { useAppLanguage } from "@/hooks/useAppLanguage";

import { messageLocale, I18N } from "@/lib/i18n";



const MAX_INVITE_ROWS = 8;



type InviteRow = { id: number; value: string };



export default function AccountSetupClient({ initialName }: { initialName: string }) {

  const router = useRouter();

  const { language, setLanguage, locales } = useAppLanguage();

  const tRoot = I18N[messageLocale(language)];

  const tOb = tRoot.onboarding;

  const tSp = tRoot.setPassword;

  const inviteId = useRef(0);

  const [name, setName] = useState(initialName);

  const [password, setPassword] = useState("");

  const [inviteRows, setInviteRows] = useState<InviteRow[]>(() => [{ id: 0, value: "" }]);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);



  const invitePayload = inviteRows

    .map((r) => r.value.trim())

    .filter(Boolean)

    .join(", ");



  const submit = async () => {

    setError(null);

    setBusy(true);

    const res = await fetch("/api/auth/set-password", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        password,

        name: name.trim() || undefined,

        inviteEmails: invitePayload || undefined,

      }),

    });

    setBusy(false);

    if (res.status === 403) {

      router.replace("/api/auth/incomplete-expired");

      return;

    }

    if (!res.ok) {

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (data.error === "password_too_short") setError(tSp.errorTooShort);

      else setError(tSp.errorGeneric);

      return;

    }

    router.refresh();

    router.replace("/onboarding/nibo");

  };



  const updateInviteRow = (id: number, value: string) => {

    setInviteRows((rows) => rows.map((r) => (r.id === id ? { ...r, value } : r)));

  };



  const addInviteRow = () => {

    if (inviteRows.length >= MAX_INVITE_ROWS) return;

    inviteId.current += 1;

    setInviteRows((rows) => [...rows, { id: inviteId.current, value: "" }]);

  };



  const removeInviteRow = (id: number) => {

    setInviteRows((rows) => {

      if (rows.length <= 1) {

        return rows.map((r) => (r.id === id ? { ...r, value: "" } : r));

      }

      return rows.filter((r) => r.id !== id);

    });

  };



  return (

    <div className="relative flex min-h-dvh items-center justify-center p-4">

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

        className="relative z-10 w-full max-w-md"

      >

        <div className="rounded-3xl border border-white/60 bg-white/90 p-8 text-center shadow-cozy-lg backdrop-blur-md sm:p-10">

          <p className="mb-2 text-xs font-medium text-rose-600">{tOb.accountSetupEyebrow}</p>

          <div className="mb-4 flex justify-center">

            <Image src="/favicon.svg" alt="" width={64} height={64} />

          </div>

          <h1 className="mb-2 text-xl font-bold leading-snug text-warm-800 sm:text-2xl">{tOb.accountSetupTitle}</h1>

          <p className="mb-6 text-sm leading-relaxed text-warm-500">{tOb.accountSetupSubtitle}</p>

          {error ? (

            <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>

          ) : null}

          <label className="sr-only" htmlFor="as-name">

            {tSp.nameLabel}

          </label>

          <input

            id="as-name"

            type="text"

            autoComplete="name"

            value={name}

            onChange={(e) => setName(e.target.value)}

            placeholder={tSp.namePlaceholder}

            className="mb-4 w-full rounded-2xl border-2 border-warm-200 bg-white px-4 py-3 text-sm text-warm-800 outline-none focus:border-rose-300"

          />

          <label className="sr-only" htmlFor="as-password">

            {tSp.passwordLabel}

          </label>

          <input

            id="as-password"

            type="password"

            autoComplete="new-password"

            value={password}

            onChange={(e) => setPassword(e.target.value)}

            placeholder={tSp.passwordLabel}

            className="mb-2 w-full rounded-2xl border-2 border-warm-200 bg-white px-4 py-3 text-sm text-warm-800 outline-none focus:border-rose-300"

          />

          <p className="mb-5 text-left text-xs text-warm-400">{tOb.accountSetupPasswordHint}</p>

          <fieldset className="mb-6 text-left">

            <legend className="mb-1 text-sm font-medium text-warm-700">{tOb.accountSetupInviteSectionTitle}</legend>

            <p className="mb-3 text-xs leading-relaxed text-warm-400">{tOb.accountSetupInviteSectionHint}</p>

            <div className="flex flex-col gap-2">

              {inviteRows.map((row, index) => (

                <div key={row.id} className="flex gap-2">

                  <label className="sr-only" htmlFor={`as-invite-${row.id}`}>

                    {tSp.inviteEmailsLabel}

                    {inviteRows.length > 1 ? ` ${index + 1}` : ""}

                  </label>

                  <input

                    id={`as-invite-${row.id}`}

                    type="email"

                    autoComplete="email"

                    inputMode="email"

                    value={row.value}

                    onChange={(e) => updateInviteRow(row.id, e.target.value)}

                    placeholder={tOb.accountSetupInvitePlaceholder}

                    className="min-w-0 flex-1 rounded-2xl border-2 border-warm-200 bg-white px-4 py-3 text-sm text-warm-800 outline-none focus:border-rose-300"

                  />

                  <button

                    type="button"

                    aria-label={tOb.accountSetupRemoveInvite}

                    onClick={() => removeInviteRow(row.id)}

                    className="flex h-[46px] w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-warm-200 bg-warm-50 text-warm-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"

                  >

                    <X className="h-4 w-4" strokeWidth={2} />

                  </button>

                </div>

              ))}

            </div>

            {inviteRows.length < MAX_INVITE_ROWS ? (

              <button

                type="button"

                onClick={addInviteRow}

                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 transition hover:text-rose-700"

              >

                <Plus className="h-4 w-4" strokeWidth={2} />

                {tOb.accountSetupAddInvite}

              </button>

            ) : null}

          </fieldset>

          <motion.button

            type="button"

            whileHover={{ scale: 1.02 }}

            whileTap={{ scale: 0.98 }}

            disabled={busy || password.length < 8}

            onClick={submit}

            className="w-full rounded-2xl bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-cozy transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"

          >

            {busy ? tSp.submitting : tOb.accountSetupContinue}

          </motion.button>

        </div>

      </motion.div>

    </div>

  );

}

