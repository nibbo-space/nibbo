import { BlogPostForm, type BlogPostFormInitial } from "@/components/admin/BlogPostForm";
import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { getActiveLanguages } from "@/lib/languages";
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
  const [row, languages] = await Promise.all([
    prisma.blogPost.findUnique({
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
        translations: {
          select: {
            title: true,
            excerpt: true,
            body: true,
            languageId: true,
            language: { select: { code: true, name: true } },
          },
        },
      },
    }),
    getActiveLanguages(),
  ]);
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
    translations: row.translations.map((tr) => ({
      languageId: tr.languageId,
      code: tr.language.code,
      name: tr.language.name,
      title: tr.title,
      excerpt: tr.excerpt,
      body: tr.body,
    })),
  };

  return <BlogPostForm mode="edit" initial={initial} languages={languages} />;
}
