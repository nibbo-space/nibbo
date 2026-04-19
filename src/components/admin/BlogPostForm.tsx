"use client";

import { BlogMarkdown } from "@/components/blog/BlogMarkdown";
import { slugify } from "@/lib/blog-slug";
import { cn } from "@/lib/utils";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { I18N } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { ImagePlus } from "lucide-react";

export type BlogPostFormInitial = {
  id: string;
  slug: string;
  titleUk: string;
  titleEn: string;
  excerptUk: string | null;
  excerptEn: string | null;
  bodyUk: string;
  bodyEn: string;
  coverImageUrl: string | null;
  published: boolean;
};

function emptyInitial(): BlogPostFormInitial {
  return {
    id: "",
    slug: "",
    titleUk: "",
    titleEn: "",
    excerptUk: null,
    excerptEn: null,
    bodyUk: "",
    bodyEn: "",
    coverImageUrl: null,
    published: false,
  };
}

export function BlogPostForm({
  mode,
  initial,
}: {
  mode: "new" | "edit";
  initial: BlogPostFormInitial | null;
}) {
  const router = useRouter();
  const { language } = useAppLanguage();
  const t = I18N[language].adminBlog;
  const base = initial ?? emptyInitial();

  const [slug, setSlug] = useState(base.slug);
  const [titleUk, setTitleUk] = useState(base.titleUk);
  const [titleEn, setTitleEn] = useState(base.titleEn);
  const [excerptUk, setExcerptUk] = useState(base.excerptUk ?? "");
  const [excerptEn, setExcerptEn] = useState(base.excerptEn ?? "");
  const [bodyUk, setBodyUk] = useState(base.bodyUk);
  const [bodyEn, setBodyEn] = useState(base.bodyEn);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(base.coverImageUrl ?? null);
  const [published, setPublished] = useState(base.published);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<"uk" | "en" | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const uploadFieldRef = useRef<"uk" | "en">("uk");

  const triggerUpload = (field: "uk" | "en") => {
    uploadFieldRef.current = field;
    fileInputRef.current?.click();
  };

  const onImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? t.uploadImageFailed);
        return;
      }
      if (!data.url) {
        toast.error(t.uploadImageFailed);
        return;
      }
      const md = `\n\n![${t.imageAltDefault}](${data.url})\n`;
      const field = uploadFieldRef.current;
      if (field === "uk") setBodyUk((s) => s + md);
      else setBodyEn((s) => s + md);
    } finally {
      setUploading(false);
    }
  };

  const onCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? t.uploadImageFailed);
        return;
      }
      if (!data.url) {
        toast.error(t.uploadImageFailed);
        return;
      }
      setCoverImageUrl(data.url);
    } finally {
      setUploading(false);
    }
  };

  const applySlugFromTitle = () => {
    setSlug(slugify(titleUk || titleEn));
  };

  const payload = () => ({
    slug,
    titleUk,
    titleEn,
    excerptUk: excerptUk.trim() || null,
    excerptEn: excerptEn.trim() || null,
    bodyUk,
    bodyEn,
    coverImageUrl,
    published,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === "new") {
        const res = await fetch("/api/admin/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload()),
        });
        const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
        if (res.status === 401) {
          window.location.assign("/login");
          return;
        }
        if (!res.ok) {
          toast.error(data.error ?? "Error");
          return;
        }
        if (data.id) {
          toast.success(t.save);
          router.push(`/admin/blog/${data.id}/edit`);
          router.refresh();
        }
        return;
      }
      const res = await fetch(`/api/admin/blog/${base.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? "Error");
        return;
      }
      toast.success(t.save);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (mode !== "edit" || !base.id) return;
    if (!window.confirm(t.deleteConfirm)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/blog/${base.id}`, { method: "DELETE" });
      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!res.ok) {
        toast.error("Error");
        return;
      }
      toast.success(t.delete);
      router.push("/admin/blog");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 outline-none ring-rose-200 focus:border-rose-300 focus:ring-2";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/blog"
          className="text-sm font-semibold text-rose-600 hover:text-rose-700 hover:underline"
        >
          ← {t.backToList}
        </Link>
      </div>

      <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-cozy md:p-8">
        <h1 className="font-heading text-2xl font-bold text-warm-800">
          {mode === "new" ? t.newPost : t.edit}
        </h1>
        <p className="mt-2 text-sm text-warm-500">{t.pageSubtitle}</p>
        <p className="mt-1 text-xs text-warm-400">{t.imageHint}</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onImageFile}
        />
        <input
          ref={coverFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onCoverFile}
        />

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="bp-slug" className="mb-1 block text-sm font-medium text-warm-700">
              {t.slug}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="bp-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.trim().toLowerCase())}
                className={cn(inputClass, "sm:flex-1")}
                autoComplete="off"
                placeholder="winter-update"
              />
              <button
                type="button"
                onClick={applySlugFromTitle}
                className="shrink-0 rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm font-semibold text-warm-700 hover:bg-warm-100"
              >
                {t.fromTitle}
              </button>
            </div>
            <p className="mt-1 text-xs text-warm-400">{t.slugHint}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="bp-tuk" className="mb-1 block text-sm font-medium text-warm-700">
                {t.titleUk}
              </label>
              <input
                id="bp-tuk"
                value={titleUk}
                onChange={(e) => setTitleUk(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="bp-ten" className="mb-1 block text-sm font-medium text-warm-700">
                {t.titleEn}
              </label>
              <input
                id="bp-ten"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="bp-euk" className="mb-1 block text-sm font-medium text-warm-700">
                {t.excerptUk}
              </label>
              <textarea
                id="bp-euk"
                value={excerptUk}
                onChange={(e) => setExcerptUk(e.target.value)}
                rows={3}
                className={cn(inputClass, "resize-y")}
              />
            </div>
            <div>
              <label htmlFor="bp-een" className="mb-1 block text-sm font-medium text-warm-700">
                {t.excerptEn}
              </label>
              <textarea
                id="bp-een"
                value={excerptEn}
                onChange={(e) => setExcerptEn(e.target.value)}
                rows={3}
                className={cn(inputClass, "resize-y")}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-warm-100 bg-warm-50/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-warm-800">{t.coverImageLabel}</p>
                <p className="mt-1 text-xs text-warm-500">{t.coverImageHint}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={uploading || saving}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-50"
                >
                  <ImagePlus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  {t.coverImageUpload}
                </button>
                {coverImageUrl ? (
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl(null)}
                    disabled={uploading || saving}
                    className="rounded-xl border border-warm-200 bg-white px-3 py-2 text-xs font-semibold text-warm-700 hover:bg-warm-100 disabled:opacity-50"
                  >
                    {t.coverImageRemove}
                  </button>
                ) : null}
              </div>
            </div>
            {coverImageUrl ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-warm-200 bg-white">
                <img
                  src={coverImageUrl}
                  alt=""
                  className="max-h-56 w-full object-cover"
                />
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="bp-buk" className="block text-sm font-medium text-warm-700">
                {t.bodyUk}
              </label>
              <button
                type="button"
                onClick={() => triggerUpload("uk")}
                disabled={uploading || saving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-warm-200 bg-warm-50 px-3 py-1.5 text-xs font-bold text-warm-700 hover:bg-warm-100 disabled:opacity-50"
              >
                <ImagePlus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                {t.uploadImageUk}
              </button>
            </div>
            <textarea
              id="bp-buk"
              value={bodyUk}
              onChange={(e) => setBodyUk(e.target.value)}
              rows={14}
              className={cn(inputClass, "resize-y font-mono text-[13px] leading-relaxed")}
            />
          </div>

          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="bp-ben" className="block text-sm font-medium text-warm-700">
                {t.bodyEn}
              </label>
              <button
                type="button"
                onClick={() => triggerUpload("en")}
                disabled={uploading || saving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-warm-200 bg-warm-50 px-3 py-1.5 text-xs font-bold text-warm-700 hover:bg-warm-100 disabled:opacity-50"
              >
                <ImagePlus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                {t.uploadImageEn}
              </button>
            </div>
            <textarea
              id="bp-ben"
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
              rows={14}
              className={cn(inputClass, "resize-y font-mono text-[13px] leading-relaxed")}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 rounded border-warm-300 text-rose-600 focus:ring-rose-400"
            />
            <span className="text-sm font-medium text-warm-800">{t.published}</span>
          </label>

          <div className="flex flex-wrap gap-2 border-t border-warm-100 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl border-2 border-rose-400 bg-gradient-to-b from-rose-400 to-rose-600 px-6 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60"
            >
              {saving ? t.saving : t.save}
            </button>
            {mode === "edit" ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={saving}
                className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
              >
                {t.delete}
              </button>
            ) : null}
          </div>
        </form>

        <div className="mt-8 border-t border-warm-100 pt-6">
          <p className="mb-3 text-sm font-semibold text-warm-700">{t.previewMarkdown}</p>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setPreview((p) => (p === "uk" ? null : "uk"))}
              className={cn(
                "rounded-xl px-3 py-1.5 text-sm font-semibold",
                preview === "uk" ? "bg-rose-100 text-rose-800" : "bg-warm-50 text-warm-600"
              )}
            >
              UK
            </button>
            <button
              type="button"
              onClick={() => setPreview((p) => (p === "en" ? null : "en"))}
              className={cn(
                "rounded-xl px-3 py-1.5 text-sm font-semibold",
                preview === "en" ? "bg-rose-100 text-rose-800" : "bg-warm-50 text-warm-600"
              )}
            >
              EN
            </button>
          </div>
          {preview === "uk" ? (
            <div className="rounded-2xl border border-warm-100 bg-cream-50/80 p-5">
              <BlogMarkdown content={bodyUk || "_"} />
            </div>
          ) : null}
          {preview === "en" ? (
            <div className="rounded-2xl border border-warm-100 bg-cream-50/80 p-5">
              <BlogMarkdown content={bodyEn || "_"} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
