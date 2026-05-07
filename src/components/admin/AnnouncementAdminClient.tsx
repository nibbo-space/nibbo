"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { format } from "date-fns";
import { enUS, uk } from "date-fns/locale";
import { Pencil, Plus, Trash2 } from "lucide-react";
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

export default function AnnouncementAdminClient({
  initialRows,
}: {
  initialRows: AnnouncementAdminRow[];
}) {
  const { language } = useAppLanguage();
  const ml = messageLocale(language);
  const t = I18N[ml].adminAnnouncements;
  const dateLocale = ml === "uk" ? uk : enUS;
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pickLocalized = (row: AnnouncementAdminRow) => {
    const preferred = language.toLowerCase();
    const tr = row.translations.find((x) => x.language.code.toLowerCase() === preferred);
    if (tr?.title && tr?.body) return { title: tr.title, body: tr.body };
    if (preferred === "en") return { title: row.titleEn, body: row.bodyEn };
    return { title: row.titleUk, body: row.bodyUk };
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
          <Link
            href="/admin/announcements/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-rose-400 bg-gradient-to-b from-rose-400 to-rose-600 px-5 py-3 text-sm font-bold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            {t.newAnnouncement}
          </Link>
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
                  <Link
                    href={`/admin/announcements/${row.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    {t.edit}
                  </Link>
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

    </div>
  );
}
