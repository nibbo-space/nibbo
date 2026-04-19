"use client";

import Link from "next/link";
import Image from "next/image";
import { CozyPageBackground } from "@/components/shared/CozyPageBackground";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { I18N } from "@/lib/i18n";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { ACHIEVEMENT_UNLOCK_EVENT, type AchievementUnlockDetail } from "@/lib/achievement-unlock-events";
import {
  FEEDBACK_ALLOWED_MIME,
  FEEDBACK_HONEYPOT_NAME,
  FEEDBACK_MAX_DESC_LEN,
  FEEDBACK_MAX_FILE_BYTES,
  FEEDBACK_MAX_FILES,
  FEEDBACK_MAX_TITLE_LEN,
} from "@/lib/feedback-limits";

type Kind = "bug" | "suggestion";

export function FeedbackForm(props: {
  initialContactEmail: string;
  backHref: string;
  signedIn: boolean;
}) {
  const { language } = useAppLanguage();
  const t = I18N[language].feedback;
  const [kind, setKind] = useState<Kind>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState(props.initialContactEmail);
  const [files, setFiles] = useState<FileList | null>(null);
  const [sending, setSending] = useState(false);

  const backLabel = props.signedIn ? t.backDashboard : t.backLogin;
  const tNav = I18N[language].nav;

  const onFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) {
      setFiles(null);
      return;
    }
    const next: File[] = [];
    for (let i = 0; i < list.length && next.length < FEEDBACK_MAX_FILES; i++) {
      const f = list.item(i);
      if (!f || f.size === 0) continue;
      if (f.size > FEEDBACK_MAX_FILE_BYTES) {
        toast.error(t.errorFiles);
        return;
      }
      const ok = (FEEDBACK_ALLOWED_MIME as readonly string[]).includes(f.type);
      if (!ok) {
        toast.error(t.errorFiles);
        return;
      }
      next.push(f);
    }
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    setFiles(dt.files);
  }, [t.errorFiles]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3 || description.trim().length < 10) {
      toast.error(t.errorValidation);
      return;
    }
    setSending(true);
    try {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("title", title.trim().slice(0, FEEDBACK_MAX_TITLE_LEN));
      fd.set("description", description.trim().slice(0, FEEDBACK_MAX_DESC_LEN));
      fd.set("contactEmail", contactEmail.trim());
      if (kind === "bug" && files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const f = files.item(i);
          if (f && f.size > 0) fd.append("screenshots", f);
        }
      }
      const res = await fetch("/api/feedback", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { code?: string; newAchievementIds?: string[] };
      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (res.ok) {
        const achIds = data.newAchievementIds?.filter(Boolean) ?? [];
        if (achIds.length > 0) {
          window.dispatchEvent(
            new CustomEvent<AchievementUnlockDetail>(ACHIEVEMENT_UNLOCK_EVENT, { detail: { ids: achIds } })
          );
        }
        toast.success(t.success);
        setTitle("");
        setDescription("");
        setContactEmail(props.initialContactEmail);
        setFiles(null);
        const input = document.getElementById("feedback-screenshots") as HTMLInputElement | null;
        if (input) input.value = "";
        return;
      }
      if (res.status === 429) toast.error(t.errorRateLimit);
      else if (data.code === "mail") toast.error(t.errorMail);
      else if (data.code === "files") toast.error(t.errorFiles);
      else if (data.code === "validation") toast.error(t.errorValidation);
      else toast.error(t.errorGeneric);
    } catch {
      toast.error(t.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  return (
    <CozyPageBackground>
      <div className="min-h-screen px-4 py-8 md:py-12">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={props.backHref}
            className="text-sm font-semibold text-rose-600 hover:text-rose-700 underline-offset-2 hover:underline"
          >
            ← {backLabel}
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-2xl px-2 py-1.5 text-warm-800 outline-none ring-rose-200 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`Nibbo — ${tNav.dashboard}`}
          >
            <Image src="/favicon.svg" alt="" width={32} height={32} className="opacity-90" aria-hidden />
            <span className="font-heading text-lg font-bold tracking-tight">Nibbo</span>
          </Link>
          </div>

          <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-cozy md:p-8">
          <h1 className="font-heading text-2xl font-bold text-warm-800">{t.pageTitle}</h1>
          <p className="mt-2 text-sm text-warm-500">{t.pageSubtitle}</p>

          <div className="mt-6 flex gap-2 rounded-2xl bg-warm-50 p-1">
            {(["bug", "suggestion"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  kind === k
                    ? "bg-white text-rose-700 shadow-sm"
                    : "text-warm-600 hover:text-warm-800"
                )}
              >
                {k === "bug" ? t.tabBug : t.tabSuggestion}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="sr-only" aria-hidden>
              <label htmlFor={FEEDBACK_HONEYPOT_NAME}>{t.honeypotLabel}</label>
              <input
                tabIndex={-1}
                autoComplete="off"
                id={FEEDBACK_HONEYPOT_NAME}
                name={FEEDBACK_HONEYPOT_NAME}
                type="text"
              />
            </div>

            <div>
              <label htmlFor="fb-title" className="mb-1 block text-sm font-medium text-warm-700">
                {t.titleLabel}
              </label>
              <input
                id="fb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, FEEDBACK_MAX_TITLE_LEN))}
                className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2"
                maxLength={FEEDBACK_MAX_TITLE_LEN}
                required
                placeholder={kind === "bug" ? t.titlePlaceholderBug : t.titlePlaceholderSuggestion}
              />
            </div>

            <div>
              <label htmlFor="fb-desc" className="mb-1 block text-sm font-medium text-warm-700">
                {t.descriptionLabel}
              </label>
              <textarea
                id="fb-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, FEEDBACK_MAX_DESC_LEN))}
                rows={6}
                className="w-full resize-y rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2"
                maxLength={FEEDBACK_MAX_DESC_LEN}
                required
                placeholder={
                  kind === "bug" ? t.descriptionPlaceholderBug : t.descriptionPlaceholderSuggestion
                }
              />
            </div>

            <div>
              <label htmlFor="fb-email" className="mb-1 block text-sm font-medium text-warm-700">
                {t.contactLabel}
              </label>
              <input
                id="fb-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value.slice(0, 254))}
                className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2"
                placeholder={t.contactPlaceholder}
                autoComplete="email"
              />
            </div>

            {kind === "bug" && (
              <div>
                <label htmlFor="feedback-screenshots" className="mb-1 block text-sm font-medium text-warm-700">
                  {t.screenshotsLabel}
                </label>
                <input
                  id="feedback-screenshots"
                  type="file"
                  accept={FEEDBACK_ALLOWED_MIME.join(",")}
                  multiple
                  onChange={(e) => onFiles(e.target.files)}
                  className="w-full text-sm text-warm-600 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-50 file:px-3 file:py-2 file:font-semibold file:text-rose-700"
                />
                <p className="mt-1 text-xs text-warm-400">{t.screenshotsHint}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 py-3 text-sm font-semibold text-white shadow-md transition-opacity disabled:opacity-60"
            >
              {sending ? t.sending : t.submit}
            </button>
          </form>
          </div>
        </div>
      </div>
    </CozyPageBackground>
  );
}
