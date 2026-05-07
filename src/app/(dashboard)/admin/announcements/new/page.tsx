import AnnouncementForm from "@/components/admin/AnnouncementForm";
import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { getActiveLanguages } from "@/lib/languages";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "New announcement",
};

export default async function AdminAnnouncementNewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isUserAdmin(session.user.id))) redirect("/dashboard");

  const languages = await getActiveLanguages();
  return <AnnouncementForm mode="new" initial={null} languages={languages} />;
}
