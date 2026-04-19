import { BlogPostForm, type BlogPostFormInitial } from "@/components/admin/BlogPostForm";
import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Edit blog post",
};

export default async function AdminBlogEditPage(props: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isUserAdmin(session.user.id))) redirect("/dashboard");

  const { id } = await props.params;
  const row = await prisma.blogPost.findUnique({
    where: { id },
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
      published: true,
    },
  });
  if (!row) notFound();

  const initial: BlogPostFormInitial = {
    id: row.id,
    slug: row.slug,
    titleUk: row.titleUk,
    titleEn: row.titleEn,
    excerptUk: row.excerptUk,
    excerptEn: row.excerptEn,
    bodyUk: row.bodyUk,
    bodyEn: row.bodyEn,
    coverImageUrl: row.coverImageUrl,
    published: row.published,
  };

  return <BlogPostForm mode="edit" initial={initial} />;
}
