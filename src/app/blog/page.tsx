import { BlogIndexContent } from "@/components/blog/BlogIndexContent";
import { auth } from "@/lib/auth";
import { messageLocale, APP_LANGUAGE_COOKIE_KEY, I18N } from "@/lib/i18n";
import { resolveUiLanguageFromRequest } from "@/lib/languages";
import { prisma } from "@/lib/prisma";
import { getMetadataBaseUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const { language } = await resolveUiLanguageFromRequest(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  const base = getMetadataBaseUrl();
  const b = I18N[messageLocale(language)].blogPage;
  return {
    title: b.metaTitle,
    description: b.metaDescription,
    alternates: { canonical: new URL("/blog", base) },
    robots: { index: true, follow: true },
  };
}

export default async function BlogPage() {
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
