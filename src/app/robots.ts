import type { MetadataRoute } from "next";
import { getMetadataBaseUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getMetadataBaseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/admin", "/login", "/onboarding", "/profile"],
    },
    sitemap: `${base.origin}/sitemap.xml`,
  };
}
