import { BlogPostContent, type BlogPostView } from "@/components/blog/BlogPostContent";
import { auth } from "@/lib/auth";
import { blogTranslationItemsFromPost, pickBlogLine } from "@/lib/blog-translations";
import { I18N, messageLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { OG_ALT, OG_SIZE } from "@/lib/og-share-card";
import { buildLanguageAlternates, isPublicLocale, localeHref } from "@/lib/public-locales";
import { getMetadataBaseUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale)) return {};
  const ml = messageLocale(locale);
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
  if (!post) return { title: I18N[ml].notFound.metaTitle };

  const line = pickBlogLine(blogTranslationItemsFromPost(post), locale);
  const title = line?.title ?? post.titleEn;
  const description =
    line?.excerpt ||
    (ml === "uk" ? post.excerptUk || post.excerptEn : post.excerptEn || post.excerptUk) ||
    I18N[ml].blogPage.metaDescription;
  const base = getMetadataBaseUrl();
  const path = `/blog/${slug}`;
  const canonical = new URL(localeHref(locale, path), base).href;
  const ogLocale = ml === "uk" ? "uk_UA" : ml === "ja" ? "ja_JP" : "en_US";
  const alternateLocale = ["uk_UA", "en_US", "ja_JP"].filter((l) => l !== ogLocale);
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
    alternates: {
      canonical,
      languages: buildLanguageAlternates(path),
    },
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

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale)) notFound();

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
      updatedAt: true,
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

  const ml = messageLocale(locale);
  const line = pickBlogLine(blogTranslationItemsFromPost(row), locale);
  const headline = line?.title ?? row.titleEn;
  const description =
    line?.excerpt || (ml === "uk" ? row.excerptUk || row.excerptEn : row.excerptEn || row.excerptUk) || "";
  const base = getMetadataBaseUrl();
  const url = new URL(localeHref(locale, `/blog/${slug}`), base).href;
  const coverAbs = row.coverImageUrl
    ? row.coverImageUrl.startsWith("http")
      ? row.coverImageUrl
      : new URL(row.coverImageUrl, base).href
    : null;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    inLanguage: locale,
    mainEntityOfPage: url,
    url,
    datePublished: row.publishedAt?.toISOString(),
    dateModified: (row.publishedAt ?? row.updatedAt)?.toISOString(),
    image: coverAbs ? [coverAbs] : undefined,
    author: { "@type": "Organization", name: "Nibbo" },
    publisher: {
      "@type": "Organization",
      name: "Nibbo",
      logo: { "@type": "ImageObject", url: new URL("/icon.svg", base).href },
    },
  };

  return (
    <>
      <Script
        id={`article-ld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <BlogPostContent post={post} signedIn={signedIn} />
    </>
  );
}
