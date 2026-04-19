import { BlogPostContent, type BlogPostView } from "@/components/blog/BlogPostContent";
import { auth } from "@/lib/auth";
import { APP_LANGUAGE_COOKIE_KEY, I18N, resolveAppLanguage } from "@/lib/i18n";
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
  const language = resolveAppLanguage(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  const post = await prisma.blogPost.findFirst({
    where: { slug, published: true },
    select: { titleUk: true, titleEn: true, excerptUk: true, excerptEn: true, coverImageUrl: true },
  });
  if (!post) {
    return { title: I18N[language].notFound.metaTitle };
  }
  const title = language === "uk" ? post.titleUk : post.titleEn;
  const description =
    (language === "uk" ? post.excerptUk : post.excerptEn) ||
    (language === "uk" ? post.excerptEn : post.excerptUk) ||
    I18N[language].blogPage.metaDescription;
  const base = getMetadataBaseUrl();
  const canonical = new URL(`/blog/${slug}`, base).href;
  const ogLocale = language === "uk" ? "uk_UA" : "en_US";
  const alternateLocale = language === "uk" ? ["en_US"] : ["uk_UA"];
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
      bodyUk: true,
      bodyEn: true,
      coverImageUrl: true,
      publishedAt: true,
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
    ...row,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };

  return <BlogPostContent post={post} signedIn={signedIn} />;
}
