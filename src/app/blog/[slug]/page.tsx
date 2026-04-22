import { BlogPostContent, type BlogPostView } from "@/components/blog/BlogPostContent";
import { auth } from "@/lib/auth";
import { blogTranslationItemsFromPost, pickBlogLine } from "@/lib/blog-translations";
import { messageLocale, APP_LANGUAGE_COOKIE_KEY, I18N } from "@/lib/i18n";
import { resolveUiLanguageFromRequest } from "@/lib/languages";
import { prisma } from "@/lib/prisma";
import { OG_ALT, OG_SIZE } from "@/lib/og-share-card";
import { getMetadataBaseUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const cookieStore = await cookies();
  const hdrs = await headers();
  const { language } = await resolveUiLanguageFromRequest(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  const ml = messageLocale(language);
  const post = await prisma.blogPost.findFirst({
    where: { slug, published: true },
    select: {
      titleUk: true,
      titleEn: true,
      excerptUk: true,
      excerptEn: true,
      bodyUk: true,
      bodyEn: true,
      coverImageUrl: true,
      translations: {
        select: {
          title: true,
          excerpt: true,
          body: true,
          language: { select: { code: true } },
        },
      },
    },
  });
  if (!post) {
    return { title: I18N[messageLocale(language)].notFound.metaTitle };
  }
  const line = pickBlogLine(blogTranslationItemsFromPost(post), language);
  const title = line?.title ?? post.titleEn;
  const description =
    line?.excerpt ||
    (ml === "uk" ? post.excerptUk || post.excerptEn : post.excerptEn || post.excerptUk) ||
    I18N[ml].blogPage.metaDescription;
  const base = getMetadataBaseUrl();
  const canonical = new URL(`/blog/${slug}`, base).href;
  const ogLocale = ml === "uk" ? "uk_UA" : "en_US";
  const alternateLocale = ml === "uk" ? ["en_US"] : ["uk_UA"];
  const pageTitle = `${title} — Nibbo`;

  const coverAbs = post.coverImageUrl
    ? post.coverImageUrl.startsWith("http")
      ? post.coverImageUrl
      : new URL(post.coverImageUrl, base).href
    : null;

  const openGraphImages = coverAbs
    ? [{ url: coverAbs, alt: title }]
    : [
        {
          url: "/opengraph-image",
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          alt: OG_ALT,
          type: "image/png" as const,
        },
      ];

  const twitterImages = coverAbs ? [coverAbs] : ["/twitter-image"];

  return {
    title: pageTitle,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      locale: ogLocale,
      alternateLocale,
      url: canonical,
      siteName: "Nibbo",
      title: pageTitle,
      description,
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: twitterImages,
    },
  };
}

export default async function BlogPostPage(props: Props) {
  const { slug } = await props.params;
  const row = await prisma.blogPost.findFirst({
    where: { slug, published: true },
    select: {
      slug: true,
      titleUk: true,
      titleEn: true,
      excerptUk: true,
      excerptEn: true,
      bodyUk: true,
      bodyEn: true,
      coverImageUrl: true,
      publishedAt: true,
      translations: {
        select: {
          title: true,
          excerpt: true,
          body: true,
          language: { select: { code: true } },
        },
      },
    },
  });
  if (!row) notFound();

  let signedIn = false;
  try {
    const session = await auth();
    signedIn = Boolean(session?.user?.id);
  } catch {
    signedIn = false;
  }

  const post: BlogPostView = {
    slug: row.slug,
    titleUk: row.titleUk,
    titleEn: row.titleEn,
    excerptUk: row.excerptUk,
    excerptEn: row.excerptEn,
    bodyUk: row.bodyUk,
    bodyEn: row.bodyEn,
    coverImageUrl: row.coverImageUrl,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    translations: row.translations,
  };

  return <BlogPostContent post={post} signedIn={signedIn} />;
}
