import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { APP_LANGUAGE_COOKIE_KEY } from "@/lib/i18n";
import { resolveUiLanguageFromRequest } from "@/lib/languages";
import { prisma } from "@/lib/prisma";
import { getTmdbApiKey, tmdbLanguageFromAppCode } from "@/lib/tmdb";
import { localizeTmdbWatchRows } from "@/lib/watch-tmdb-locale";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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
      provider: true,
      externalId: true,
      title: true,
      posterPath: true,
      mediaType: true,
      season: true,
      updatedAt: true,
      family: { select: { name: true } },
      user: { select: { name: true, emoji: true } },
    },
  });

  if (!getTmdbApiKey()) {
    return NextResponse.json({ items: rows });
  }
  const { language } = await resolveUiLanguageFromRequest(
    req.cookies.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    req.headers.get("accept-language")
  );
  const items = await localizeTmdbWatchRows(rows, tmdbLanguageFromAppCode(language));
  return NextResponse.json({ items });
}
