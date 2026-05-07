import { auth } from "@/lib/auth";
import { pickAnnouncementTranslation } from "@/lib/announcement-translations";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const lang = (url.searchParams.get("lang") ?? "en").trim().toLowerCase();
  const now = new Date();
  const row = await prisma.announcement.findFirst({
    where: {
      published: true,
      OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
      views: {
        none: {
          userId: session.user.id,
        },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
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
    },
  });

  if (!row) return NextResponse.json({ item: null });

  const translated = pickAnnouncementTranslation(row, lang);
  return NextResponse.json({
    item: {
      id: row.id,
      title: translated.title,
      body: translated.body,
      publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    },
  });
}
