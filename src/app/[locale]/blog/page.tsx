import { BlogIndexContent } from "@/components/blog/BlogIndexContent";
import { auth } from "@/lib/auth";
import { I18N, messageLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { buildLanguageAlternates, isPublicLocale, localeHref, PUBLIC_LOCALES } from "@/lib/public-locales";
import { getMetadataBaseUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return {};
  const base = getMetadataBaseUrl();
  const b = I18N[messageLocale(locale)].blogPage;
  return {
    title: b.metaTitle,
    description: b.metaDescription,
    alternates: {
      canonical: new URL(localeHref(locale, "/blog"), base).href,
      languages: buildLanguageAlternates("/blog"),
    },
    robots: { index: true, follow: true },
  };
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();

  let signedIn = false;
  try {
    const session = await auth();
    signedIn = Boolean(session?.user?.id);
  } catch {
    signedIn = false;
  }

  const rows = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
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

  const posts = rows.map((p) => ({
    ...p,
    publishedAt: p.publishedAt?.toISOString() ?? null,
  }));

  return <BlogIndexContent posts={posts} signedIn={signedIn} />;
}
