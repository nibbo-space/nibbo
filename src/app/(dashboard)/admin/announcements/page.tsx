import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AnnouncementAdminClient, {
  type AnnouncementAdminRow,
} from "@/components/admin/AnnouncementAdminClient";
import { getActiveLanguages } from "@/lib/languages";

export const metadata: Metadata = {
  title: "Admin — announcements",
};

export default async function AdminAnnouncementsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isUserAdmin(session.user.id))) redirect("/dashboard");

  const rows = await prisma.announcement.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      titleUk: true,
      titleEn: true,
      bodyUk: true,
      bodyEn: true,
      published: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      translations: {
        select: {
          languageId: true,
          title: true,
          body: true,
          language: { select: { code: true, name: true } },
        },
      },
    },
  });
  const languages = await getActiveLanguages();

  const initialRows: AnnouncementAdminRow[] = rows.map((row) => ({
    ...row,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return <AnnouncementAdminClient initialRows={initialRows} languages={languages} />;
}
