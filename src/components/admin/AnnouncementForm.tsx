"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import type { ActiveLanguage } from "@/lib/languages";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export type AnnouncementFormInitial = {
  id: string;
  titleUk: string;
  titleEn: string;
  bodyUk: string;
  bodyEn: string;
  published: boolean;
  translations: Array<{
    languageId: string;
    code: string;
    name: string;
    title: string;
    body: string;
  }>;
};

function emptyInitial(): AnnouncementFormInitial {
  return {
    id: "",
    titleUk: "",
    titleEn: "",
    bodyUk: "",
    bodyEn: "",
    published: false,
    translations: [],
  };
}

function buildExtraMap(
  languages: ActiveLanguage[],
  initial: AnnouncementFormInitial | null
): Record<string, { title: string; body: string }> {
  const map: Record<string, { title: string; body: string }> = {};
  for (const l of languages) {
    if (["uk", "en"].includes(l.code.trim().toLowerCase())) continue;
    const tr = initial?.translations.find((x) => x.languageId === l.id);
    map[l.id] = { title: tr?.title ?? "", body: tr?.body ?? "" };
  }
  return map;
}

export default function AnnouncementForm({
  mode,
  initial,
  languages,
}: {
  mode: "new" | "edit";
  initial: AnnouncementFormInitial | null;
  languages: ActiveLanguage[];
}) {
  const router = useRouter();
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].adminAnnouncements;
  const base = initial ?? emptyInitial();
  const extraLanguages = languages.filter((l) => !["uk", "en"].includes(l.code.trim().toLowerCase()));

  const [titleUk, setTitleUk] = useState(base.titleUk);
  const [titleEn, setTitleEn] = useState(base.titleEn);
  const [bodyUk, setBodyUk] = useState(base.bodyUk);
  const [bodyEn, setBodyEn] = useState(base.bodyEn);
  const [extraMap, setExtraMap] = useState(() => buildExtraMap(languages, initial));
  const [published, setPublished] = useState(base.published);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!titleUk.trim() || !titleEn.trim() || !bodyUk.trim() || !bodyEn.trim()) {
      toast.error(t.validation);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titleUk,
        titleEn,
        bodyUk,
        bodyEn,
        published,
        translations: extraLanguages.map((l) => ({
          languageId: l.id,
          title: extraMap[l.id]?.title ?? "",
          body: extraMap[l.id]?.body ?? "",
        })),
      };
      const isEdit = mode === "edit";
      const res = await fetch(
        isEdit ? `/api/admin/announcements/${base.id}` : "/api/admin/announcements",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? t.saveFailed);
        return;
      }
      toast.success(t.saved);
      if (mode === "new" && data.id) router.push(`/admin/announcements/${data.id}/edit`);
      else router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/announcements"
          className="text-sm font-semibold text-rose-600 hover:text-rose-700 hover:underline"
        >
          ← {t.backToList}
        </Link>
      </div>
      <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-cozy md:p-8">
        <h1 className="font-heading text-2xl font-bold text-warm-800">
          {mode === "new" ? t.newAnnouncement : t.editAnnouncement}
        </h1>
        <p className="mt-2 text-sm text-warm-500">{t.pageSubtitle}</p>
        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-warm-700">{t.titleLabel}</label>
            <input value={titleUk} onChange={(e) => setTitleUk(e.target.value)} className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2" maxLength={160} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-warm-700">{t.bodyLabel}</label>
            <textarea value={bodyUk} onChange={(e) => setBodyUk(e.target.value)} rows={8} className="w-full resize-y rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2" maxLength={6000} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-warm-700">{t.titleEnLabel}</label>
            <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2" maxLength={160} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-warm-700">{t.bodyEnLabel}</label>
            <textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} rows={8} className="w-full resize-y rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2" maxLength={6000} />
          </div>
          {extraLanguages.map((lang) => (
            <div key={lang.id} className="space-y-3 rounded-2xl border border-lavender-100 bg-lavender-50/30 p-4">
              <p className="text-sm font-semibold text-warm-800">{lang.name} ({lang.code.toUpperCase()})</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-warm-700">{t.titleNamed.replace("{name}", lang.code.toUpperCase())}</label>
                <input value={extraMap[lang.id]?.title ?? ""} onChange={(e) => setExtraMap((prev) => ({ ...prev, [lang.id]: { title: e.target.value, body: prev[lang.id]?.body ?? "" } }))} className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2" maxLength={160} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-warm-700">{t.bodyNamed.replace("{name}", lang.code.toUpperCase())}</label>
                <textarea value={extraMap[lang.id]?.body ?? ""} onChange={(e) => setExtraMap((prev) => ({ ...prev, [lang.id]: { title: prev[lang.id]?.title ?? "", body: e.target.value } }))} rows={6} className="w-full resize-y rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2" maxLength={6000} />
              </div>
            </div>
          ))}
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 rounded border-warm-300 text-rose-600 focus:ring-rose-400" />
            <span className="text-sm font-medium text-warm-800">{t.publishNow}</span>
          </label>
          <div className="flex flex-wrap gap-2 border-t border-warm-100 pt-4">
            <button type="button" onClick={save} disabled={saving} className="rounded-2xl border-2 border-rose-400 bg-gradient-to-b from-rose-400 to-rose-600 px-6 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60">{saving ? t.saving : t.save}</button>
            <Link href="/admin/announcements" className="rounded-2xl border border-warm-200 bg-white px-5 py-3 text-sm font-semibold text-warm-700 hover:bg-warm-50">{t.cancel}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
