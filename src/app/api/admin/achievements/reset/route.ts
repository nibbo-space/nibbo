import { auth } from "@/lib/auth";
import { isUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isUserAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id;
  await prisma.$transaction([
    prisma.userAchievementCounter.deleteMany({ where: { userId } }),
    prisma.userAchievementUnlock.deleteMany({ where: { userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
