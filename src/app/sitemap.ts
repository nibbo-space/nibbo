import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getMetadataBaseUrl } from "@/lib/site-url";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getMetadataBaseUrl();
  const origin = base.origin;

  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${origin}/landing`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${origin}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${origin}/roadmap`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
  ];

  const blogEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${origin}/blog/${p.slug}`,
    lastModified: p.publishedAt ?? p.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticEntries, ...blogEntries];
}
