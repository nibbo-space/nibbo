import AdminHubClient from "@/components/admin/AdminHubClient";
import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminHubPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isUserAdmin(session.user.id))) redirect("/dashboard");
  return <AdminHubClient />;
}
