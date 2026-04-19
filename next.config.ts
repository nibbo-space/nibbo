import type { NextConfig } from "next";

if (process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://homecrm:homecrm_local@127.0.0.1:5432/homecrm";
}

const publicSiteUrl =
  process.env.AUTH_URL?.trim() ||
  process.env.NEXTAUTH_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  turbopack: {
    root: process.cwd(),
  },
  env: {
    NEXT_PUBLIC_APP_URL: publicSiteUrl,
  },
  async rewrites() {
    return [
      {
        source: "/uploads/recipes/:filename",
        destination: "/api/recipes/image/:filename",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
};

export default nextConfig;
