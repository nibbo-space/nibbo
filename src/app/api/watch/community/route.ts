import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.watchItem.findMany({
    where: {
      NOT: { familyId },
      status: "WATCHING",
      family: { shareWatchingFeed: true },
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      posterPath: true,
      mediaType: true,
      season: true,
      updatedAt: true,
      family: { select: { name: true } },
      user: { select: { name: true, emoji: true } },
    },
  });

  return NextResponse.json({ items: rows });
}
