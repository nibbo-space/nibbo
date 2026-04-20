import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { getActiveLanguages } from "@/lib/languages";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "New blog post",
};

export default async function AdminBlogNewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isUserAdmin(session.user.id))) redirect("/dashboard");

  const languages = await getActiveLanguages();
  return <BlogPostForm mode="new" initial={null} languages={languages} />;
}
