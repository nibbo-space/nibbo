import { AdminLanguagesClient } from "@/components/admin/AdminLanguagesClient";
import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin — languages",
};

export default async function AdminLanguagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isUserAdmin(session.user.id))) redirect("/dashboard");
  const items = await prisma.language.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: { id: true, code: true, name: true, isDefault: true, isActive: true, sortOrder: true },
  });
  return <AdminLanguagesClient initial={items} />;
}
