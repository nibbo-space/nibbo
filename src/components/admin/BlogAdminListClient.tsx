"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { I18N } from "@/lib/i18n";
import { format } from "date-fns";
import { enUS, uk } from "date-fns/locale";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export type BlogAdminRow = {
  id: string;
  slug: string;
  titleUk: string;
  titleEn: string;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export function BlogAdminListClient({ initialPosts }: { initialPosts: BlogAdminRow[] }) {
  const router = useRouter();
  const { language } = useAppLanguage();
  const t = I18N[language].adminBlog;
  const blogPage = I18N[language].blogPage;
  const dateLocale = language === "uk" ? uk : enUS;
  const [posts, setPosts] = useState(initialPosts);
  const [busyId, setBusyId] = useState<string | null>(null);

  const titleOf = (p: BlogAdminRow) => (language === "uk" ? p.titleUk : p.titleEn);

  const remove = async (id: string) => {
    if (!window.confirm(t.deleteConfirm)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!res.ok) {
        toast.error("Error");
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success(t.delete);
      router.refresh();
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
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-rose-400 bg-gradient-to-b from-rose-400 to-rose-600 px-5 py-3 text-sm font-bold text-white shadow-sm"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          {t.newPost}
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-warm-200 bg-white/80 py-16 text-center text-sm font-medium text-warm-500">
          {t.listEmpty}
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => {
            const updated = new Date(p.updatedAt);
            const pub = p.publishedAt ? new Date(p.publishedAt) : null;
            return (
              <li
                key={p.id}
                className="flex flex-col gap-3 rounded-3xl border border-warm-100 bg-white p-4 shadow-cozy sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-bold text-warm-900">{titleOf(p)}</h2>
                    <span
                      className={
                        p.published
                          ? "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800"
                          : "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900"
                      }
                    >
                      {p.published ? t.publishedLabel : t.draft}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-warm-400">/{p.slug}</p>
                  <p className="mt-2 text-xs text-warm-500">
                    {pub ? `${blogPage.datePublished}: ${format(pub, "d MMM yyyy", { locale: dateLocale })} · ` : ""}
                    {t.updated}: {format(updated, "d MMM yyyy HH:mm", { locale: dateLocale })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {p.published ? (
                    <a
                      href={`/blog/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-xs font-bold text-warm-700 hover:bg-warm-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      /blog
                    </a>
                  ) : null}
                  <Link
                    href={`/admin/blog/${p.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    {t.edit}
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    disabled={busyId === p.id}
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
