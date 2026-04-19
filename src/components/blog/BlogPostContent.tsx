"use client";

import { BlogMarkdown } from "@/components/blog/BlogMarkdown";
import { CozyPageBackground } from "@/components/shared/CozyPageBackground";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { I18N } from "@/lib/i18n";
import { format } from "date-fns";
import { enUS, uk } from "date-fns/locale";
import { Newspaper } from "lucide-react";
import Link from "next/link";

export type BlogPostView = {
  slug: string;
  titleUk: string;
  titleEn: string;
  bodyUk: string;
  bodyEn: string;
  coverImageUrl: string | null;
  publishedAt: string | null;
};

export function BlogPostContent({
  post,
  signedIn,
}: {
  post: BlogPostView;
  signedIn: boolean;
}) {
  const { language } = useAppLanguage();
  const t = I18N[language].blogPage;
  const nav = I18N[language].nav;
  const dateLocale = language === "uk" ? uk : enUS;
  const title = language === "uk" ? post.titleUk : post.titleEn;
  const body = language === "uk" ? post.bodyUk : post.bodyEn;
  const date = post.publishedAt ? new Date(post.publishedAt) : null;

  return (
    <CozyPageBackground>
      <article className="min-h-screen px-4 py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="text-sm font-semibold text-rose-600 underline-offset-2 transition-colors hover:text-rose-700 hover:underline"
          >
            ← {t.heading}
          </Link>
          <Link
            href={signedIn ? "/dashboard" : "/landing"}
            className="ml-4 text-sm font-medium text-warm-500 underline-offset-2 hover:text-warm-700 hover:underline"
          >
            {signedIn ? nav.dashboard : t.backToSite}
          </Link>

          <header className="mt-8 border-b border-warm-100 pb-8 md:mt-10">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-lavender-50 shadow-sm">
              <Newspaper className="h-6 w-6 text-rose-500" strokeWidth={2.2} aria-hidden />
            </div>
            <h1 className="font-heading text-balance text-3xl font-bold tracking-tight text-warm-900 md:text-[2.15rem] md:leading-tight">
              {title}
            </h1>
            {date ? (
              <p className="mt-4 text-sm font-medium text-warm-500">
                <span className="text-warm-400">{t.datePublished}: </span>
                <time dateTime={post.publishedAt!}>{format(date, "d MMMM yyyy", { locale: dateLocale })}</time>
              </p>
            ) : null}
          </header>

          {post.coverImageUrl ? (
            <div className="mt-8 overflow-hidden rounded-3xl border border-warm-100 bg-warm-50/50 shadow-inner">
              <img
                src={post.coverImageUrl}
                alt=""
                className="max-h-[min(52vh,480px)] w-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
          ) : null}

          <div className="pb-16 pt-8">
            <BlogMarkdown content={body} />
          </div>
        </div>
      </article>
    </CozyPageBackground>
  );
}
