import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PUBLIC_LOCALE, PUBLIC_LOCALES, localeHref } from "@/lib/public-locales";
import { getMetadataBaseUrl } from "@/lib/site-url";

export const revalidate = 3600;

const STATIC_PATHS: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, freq: "weekly" },
  { path: "/blog", priority: 0.9, freq: "daily" },
  { path: "/roadmap", priority: 0.6, freq: "weekly" },
  { path: "/feedback", priority: 0.3, freq: "yearly" },
  { path: "/privacy", priority: 0.3, freq: "monthly" },
];

function languageAlternatesFor(path: string, origin: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of PUBLIC_LOCALES) out[l] = `${origin}${localeHref(l, path)}`;
  out["x-default"] = `${origin}${localeHref(DEFAULT_PUBLIC_LOCALE, path)}`;
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getMetadataBaseUrl();
  const origin = base.origin;
  const now = new Date();

  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const entries: MetadataRoute.Sitemap = [];

  for (const { path, priority, freq } of STATIC_PATHS) {
    for (const locale of PUBLIC_LOCALES) {
      entries.push({
        url: `${origin}${localeHref(locale, path)}`,
        lastModified: now,
        changeFrequency: freq,
        priority,
        alternates: { languages: languageAlternatesFor(path, origin) },
      });
    }
  }

  for (const p of posts) {
    const path = `/blog/${p.slug}`;
    for (const locale of PUBLIC_LOCALES) {
      entries.push({
        url: `${origin}${localeHref(locale, path)}`,
        lastModified: p.publishedAt ?? p.updatedAt,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: { languages: languageAlternatesFor(path, origin) },
      });
    }
  }

  return entries;
}
