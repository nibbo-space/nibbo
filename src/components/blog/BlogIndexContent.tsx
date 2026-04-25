"use client";

import { CozyPageBackground } from "@/components/shared/CozyPageBackground";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { blogTranslationItemsFromPost, pickBlogLine } from "@/lib/blog-translations";
import { messageLocale, I18N } from "@/lib/i18n";
import { format } from "date-fns";
import { enUS, uk } from "date-fns/locale";
import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";
import Link from "next/link";

export type BlogListItem = {
  id: string;
  slug: string;
  titleUk: string;
  titleEn: string;
  excerptUk: string | null;
  excerptEn: string | null;
  bodyUk: string;
  bodyEn: string;
  coverImageUrl: string | null;
  publishedAt: string | null;
  translations: Array<{
    title: string;
    excerpt: string | null;
    body: string;
    language: { code: string };
  }>;
};

export function BlogIndexContent({
  posts,
  signedIn,
}: {
  posts: BlogListItem[];
  signedIn: boolean;
}) {
  const { language } = useAppLanguage();
  const ml = messageLocale(language);
  const t = I18N[ml].blogPage;
  const nav = I18N[ml].nav;
  const dateLocale = ml === "uk" ? uk : enUS;
  const lineFor = (post: BlogListItem) => pickBlogLine(blogTranslationItemsFromPost(post), language);

  return (
    <CozyPageBackground>
      <div className="min-h-screen px-4 py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          <Link
            href={signedIn ? "/dashboard" : `/${language}`}
            className="text-sm font-semibold text-rose-600 underline-offset-2 transition-colors hover:text-rose-700 hover:underline"
          >
            ← {signedIn ? nav.dashboard : t.backToSite}
          </Link>

          <header className="mt-8 text-center md:mt-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-rose-200/90 bg-gradient-to-br from-rose-50 to-lavender-50 shadow-cozy">
              <Newspaper className="h-7 w-7 text-rose-500" strokeWidth={2.2} aria-hidden />
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-warm-900 md:text-4xl">{t.heading}</h1>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-warm-600 md:text-base">
              {t.lead}
            </p>
          </header>

          {posts.length === 0 ? (
            <p className="mt-14 text-center text-sm font-medium text-warm-500">{t.empty}</p>
          ) : (
            <ul className="mt-10 space-y-4 md:mt-12">
              {posts.map((post, i) => {
                const line = lineFor(post);
                const title = line?.title ?? post.titleEn;
                const excerpt =
                  line?.excerpt ||
                  (ml === "uk" ? post.excerptUk || post.excerptEn : post.excerptEn || post.excerptUk);
                const date = post.publishedAt ? new Date(post.publishedAt) : null;
                return (
                  <motion.li
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.35 }}
                  >
                    <Link
                      href={`/${language}/blog/${post.slug}`}
                      className="group block overflow-hidden rounded-3xl border border-warm-100 bg-white/95 shadow-cozy transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-cozy-hover"
                    >
                      <div className="flex flex-col md:flex-row">
                        {post.coverImageUrl ? (
                          <div className="relative h-44 w-full shrink-0 overflow-hidden bg-gradient-to-br from-warm-50 to-rose-50/80 md:h-auto md:min-h-[220px] md:w-52 lg:w-60">
                            <img
                              src={post.coverImageUrl}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                          </div>
                        ) : null}
                        <div className="flex min-w-0 flex-1 flex-col gap-2 p-5 md:flex-row md:items-start md:justify-between md:gap-6 md:p-6">
                          <div className="min-w-0 flex-1">
                            <h2 className="font-heading text-lg font-bold text-warm-900 transition-colors group-hover:text-rose-700 md:text-xl">
                              {title}
                            </h2>
                            {excerpt ? (
                              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-warm-600">{excerpt}</p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                            {date ? (
                              <time
                                dateTime={post.publishedAt!}
                                className="text-xs font-semibold uppercase tracking-wide text-warm-400"
                              >
                                {format(date, "d MMM yyyy", { locale: dateLocale })}
                              </time>
                            ) : null}
                            <span className="inline-flex items-center gap-1 text-sm font-bold text-rose-600">
                              {t.readMore}
                              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                                →
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </CozyPageBackground>
  );
}
