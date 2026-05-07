import { auth } from "@/lib/auth";
import { pickAnnouncementTranslation } from "@/lib/announcement-translations";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const url = new URL(req.url);
  const lang = (url.searchParams.get("lang") ?? "en").trim().toLowerCase();
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: {
      published: true,
      OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      titleUk: true,
      titleEn: true,
      bodyUk: true,
      bodyEn: true,
      publishedAt: true,
      createdAt: true,
      translations: {
        select: {
          title: true,
          body: true,
          language: { select: { code: true } },
        },
      },
      views: {
        where: { userId },
        select: { viewedAt: true },
        take: 1,
      },
    },
  });

  const items = rows.map((row) => {
    const translated = pickAnnouncementTranslation(row, lang);
    return {
      id: row.id,
      title: translated.title,
      body: translated.body,
      publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
      viewedAt: row.views[0]?.viewedAt?.toISOString() ?? null,
      viewed: row.views.length > 0,
    };
  });

  return NextResponse.json({
    items,
    unreadCount: items.filter((item) => !item.viewed).length,
  });
}
