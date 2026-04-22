import { BlogAdminListClient, type BlogAdminRow } from "@/components/admin/BlogAdminListClient";
import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin — blog",
};

export default async function AdminBlogListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isUserAdmin(session.user.id))) redirect("/dashboard");

  const rows = await prisma.blogPost.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      titleUk: true,
      titleEn: true,
      excerptUk: true,
      excerptEn: true,
      bodyUk: true,
      bodyEn: true,
      published: true,
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

  const initialPosts: BlogAdminRow[] = rows.map((r) => ({
    ...r,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return <BlogAdminListClient initialPosts={initialPosts} />;
}
