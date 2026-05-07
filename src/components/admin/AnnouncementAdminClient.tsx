"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import type { ActiveLanguage } from "@/lib/languages";
import { format } from "date-fns";
import { enUS, uk } from "date-fns/locale";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

export type AnnouncementAdminRow = {
  id: string;
  titleUk: string;
  titleEn: string;
  bodyUk: string;
  bodyEn: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  translations: Array<{
    languageId: string;
    title: string;
    body: string;
    language: { code: string; name: string };
  }>;
};

type EditorState = {
  id: string | null;
  titleUk: string;
  titleEn: string;
  bodyUk: string;
  bodyEn: string;
  extra: Record<string, { title: string; body: string }>;
  published: boolean;
};

function initialEditorState(languages: ActiveLanguage[]): EditorState {
  const extra: Record<string, { title: string; body: string }> = {};
  for (const l of languages) {
    if (["uk", "en"].includes(l.code.toLowerCase())) continue;
    extra[l.id] = { title: "", body: "" };
  }
  return {
    id: null,
    titleUk: "",
    titleEn: "",
    bodyUk: "",
    bodyEn: "",
    extra,
    published: false,
  };
}

export default function AnnouncementAdminClient({
  initialRows,
  languages,
}: {
  initialRows: AnnouncementAdminRow[];
  languages: ActiveLanguage[];
}) {
  const { language } = useAppLanguage();
  const ml = messageLocale(language);
  const t = I18N[ml].adminAnnouncements;
  const dateLocale = ml === "uk" ? uk : enUS;
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editor, setEditor] = useState<EditorState>(initialEditorState(languages));
  const [saving, setSaving] = useState(false);
  const extraLanguages = languages.filter((l) => !["uk", "en"].includes(l.code.toLowerCase()));
  const pickLocalized = (row: AnnouncementAdminRow) => {
    const preferred = language.toLowerCase();
    const tr = row.translations.find((x) => x.language.code.toLowerCase() === preferred);
    if (tr?.title && tr?.body) return { title: tr.title, body: tr.body };
    if (preferred === "en") return { title: row.titleEn, body: row.bodyEn };
    return { title: row.titleUk, body: row.bodyUk };
  };

  const openCreate = () => {
    setEditor(initialEditorState(languages));
    setShowEditor(true);
  };

  const openEdit = (row: AnnouncementAdminRow) => {
    setEditor({
      id: row.id,
      titleUk: row.titleUk,
      titleEn: row.titleEn,
      bodyUk: row.bodyUk,
      bodyEn: row.bodyEn,
      extra: extraLanguages.reduce<Record<string, { title: string; body: string }>>((acc, l) => {
        const tr = row.translations.find((x) => x.languageId === l.id);
        acc[l.id] = { title: tr?.title ?? "", body: tr?.body ?? "" };
        return acc;
      }, {}),
      published: row.published,
    });
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditor(initialEditorState(languages));
  };

  const save = async () => {
    if (!editor.titleUk.trim() || !editor.titleEn.trim() || !editor.bodyUk.trim() || !editor.bodyEn.trim()) {
      toast.error(t.validation);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titleUk: editor.titleUk,
        titleEn: editor.titleEn,
        bodyUk: editor.bodyUk,
        bodyEn: editor.bodyEn,
        translations: extraLanguages.map((l) => ({
          languageId: l.id,
          title: editor.extra[l.id]?.title ?? "",
          body: editor.extra[l.id]?.body ?? "",
        })),
        published: editor.published,
      };
      const isEdit = Boolean(editor.id);
      const url = isEdit ? `/api/admin/announcements/${editor.id}` : "/api/admin/announcements";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t.saveFailed);
        return;
      }
      const row = (await res.json()) as AnnouncementAdminRow;
      const normalized: AnnouncementAdminRow = {
        ...row,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
        publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
      };
      setRows((prev) => {
        if (isEdit) {
          return prev
            .map((item) => (item.id === normalized.id ? normalized : item))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        }
        return [normalized, ...prev].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
      toast.success(t.saved);
      closeEditor();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t.deleteConfirm)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error(t.deleteFailed);
        return;
      }
      setRows((prev) => prev.filter((item) => item.id !== id));
      toast.success(t.deleted);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-warm-900 md:text-3xl">{t.pageTitle}</h1>
          <p className="mt-2 max-w-xl text-sm text-warm-600">{t.pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-warm-200 bg-white px-4 py-2 text-sm font-semibold text-warm-700 hover:bg-warm-50"
          >
            {t.backToAdmin}
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-rose-400 bg-gradient-to-b from-rose-400 to-rose-600 px-5 py-3 text-sm font-bold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            {t.newAnnouncement}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-warm-200 bg-white/80 py-16 text-center text-sm font-medium text-warm-500">
          {t.listEmpty}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const updated = new Date(row.updatedAt);
            const publishedAt = row.publishedAt ? new Date(row.publishedAt) : null;
            const localized = pickLocalized(row);
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-3xl border border-warm-100 bg-white p-4 shadow-cozy sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-bold text-warm-900">{localized.title}</h2>
                    <span
                      className={
                        row.published
                          ? "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800"
                          : "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900"
                      }
                    >
                      {row.published ? t.published : t.draft}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-warm-600">{localized.body}</p>
                  <p className="mt-2 text-xs text-warm-500">
                    {publishedAt ? `${t.publishedAt}: ${format(publishedAt, "d MMM yyyy HH:mm", { locale: dateLocale })} · ` : ""}
                    {t.updatedAt}: {format(updated, "d MMM yyyy HH:mm", { locale: dateLocale })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    {t.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(row.id)}
                    disabled={busyId === row.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    {t.delete}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showEditor ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-warm-100 bg-white p-5 shadow-cozy md:p-6">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 className="font-heading text-xl font-bold text-warm-900">
                {editor.id ? t.editAnnouncement : t.newAnnouncement}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-xl border border-warm-200 bg-white p-2 text-warm-500 hover:bg-warm-50"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-warm-700">{t.titleLabel}</label>
                <input
                  value={editor.titleUk}
                  onChange={(e) => setEditor((prev) => ({ ...prev, titleUk: e.target.value }))}
                  className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2"
                  maxLength={160}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-warm-700">{t.bodyLabel}</label>
                <textarea
                  value={editor.bodyUk}
                  onChange={(e) => setEditor((prev) => ({ ...prev, bodyUk: e.target.value }))}
                  rows={8}
                  className="w-full resize-y rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2"
                  maxLength={6000}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-warm-700">{t.titleEnLabel}</label>
                <input
                  value={editor.titleEn}
                  onChange={(e) => setEditor((prev) => ({ ...prev, titleEn: e.target.value }))}
                  className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2"
                  maxLength={160}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-warm-700">{t.bodyEnLabel}</label>
                <textarea
                  value={editor.bodyEn}
                  onChange={(e) => setEditor((prev) => ({ ...prev, bodyEn: e.target.value }))}
                  rows={8}
                  className="w-full resize-y rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2"
                  maxLength={6000}
                />
              </div>
              {extraLanguages.map((lang) => (
                <div key={lang.id} className="space-y-3 rounded-2xl border border-lavender-100 bg-lavender-50/30 p-4">
                  <p className="text-sm font-semibold text-warm-800">{lang.name} ({lang.code.toUpperCase()})</p>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-warm-700">
                      {t.titleNamed.replace("{name}", lang.code.toUpperCase())}
                    </label>
                    <input
                      value={editor.extra[lang.id]?.title ?? ""}
                      onChange={(e) =>
                        setEditor((prev) => ({
                          ...prev,
                          extra: {
                            ...prev.extra,
                            [lang.id]: { title: e.target.value, body: prev.extra[lang.id]?.body ?? "" },
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2"
                      maxLength={160}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-warm-700">
                      {t.bodyNamed.replace("{name}", lang.code.toUpperCase())}
                    </label>
                    <textarea
                      value={editor.extra[lang.id]?.body ?? ""}
                      onChange={(e) =>
                        setEditor((prev) => ({
                          ...prev,
                          extra: {
                            ...prev.extra,
                            [lang.id]: { title: prev.extra[lang.id]?.title ?? "", body: e.target.value },
                          },
                        }))
                      }
                      rows={6}
                      className="w-full resize-y rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2"
                      maxLength={6000}
                    />
                  </div>
                </div>
              ))}
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={editor.published}
                  onChange={(e) => setEditor((prev) => ({ ...prev, published: e.target.checked }))}
                  className="h-4 w-4 rounded border-warm-300 text-rose-600 focus:ring-rose-400"
                />
                <span className="text-sm font-medium text-warm-800">{t.publishNow}</span>
              </label>
              <div className="flex flex-wrap gap-2 border-t border-warm-100 pt-4">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="rounded-2xl border-2 border-rose-400 bg-gradient-to-b from-rose-400 to-rose-600 px-6 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                >
                  {saving ? t.saving : t.save}
                </button>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-2xl border border-warm-200 bg-white px-5 py-3 text-sm font-semibold text-warm-700 hover:bg-warm-50"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
