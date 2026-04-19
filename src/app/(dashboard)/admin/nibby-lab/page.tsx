import NibbyLabClient from "@/components/admin/NibbyLabClient";
import { auth } from "@/lib/auth";
import { isUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Nibby lab",
};

export default async function AdminNibbyLabPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isUserAdmin(session.user.id))) redirect("/dashboard");
  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true, id: true },
  });
  const defaultSeed = row?.familyId || row?.id || "nibbo";
  return <NibbyLabClient defaultSeed={defaultSeed} />;
}
