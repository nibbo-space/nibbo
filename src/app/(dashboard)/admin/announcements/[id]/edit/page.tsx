import AnnouncementForm, {
  type AnnouncementFormInitial,
} from "@/components/admin/AnnouncementForm";
import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { getActiveLanguages } from "@/lib/languages";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Edit announcement",
};

export default async function AdminAnnouncementEditPage(props: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isUserAdmin(session.user.id))) redirect("/dashboard");

  const { id } = await props.params;
  const [row, languages] = await Promise.all([
    prisma.announcement.findUnique({
      where: { id },
      select: {
        id: true,
        titleUk: true,
        titleEn: true,
        bodyUk: true,
        bodyEn: true,
        published: true,
        translations: {
          select: {
            languageId: true,
            title: true,
            body: true,
            language: { select: { code: true, name: true } },
          },
        },
      },
    }),
    getActiveLanguages(),
  ]);
  if (!row) notFound();

  const initial: AnnouncementFormInitial = {
    id: row.id,
    titleUk: row.titleUk,
    titleEn: row.titleEn,
    bodyUk: row.bodyUk,
    bodyEn: row.bodyEn,
    published: row.published,
    translations: row.translations.map((tr) => ({
      languageId: tr.languageId,
      code: tr.language.code,
      name: tr.language.name,
      title: tr.title,
      body: tr.body,
    })),
  };

  return <AnnouncementForm mode="edit" initial={initial} languages={languages} />;
}
