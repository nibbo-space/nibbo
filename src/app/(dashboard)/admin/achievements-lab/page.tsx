import AchievementsLabClient from "@/components/admin/AchievementsLabClient";
import { auth } from "@/lib/auth";
import { isUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Achievements lab",
};

export default async function AdminAchievementsLabPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isUserAdmin(session.user.id))) redirect("/dashboard");

  const row = await prisma.userAchievementCounter.findUnique({
    where: {
      userId_key: {
        userId: session.user.id,
        key: "mascot_blob_tap",
      },
    },
    select: { value: true },
  });

  return <AchievementsLabClient initialTapCount={row?.value ?? 0} />;
}
