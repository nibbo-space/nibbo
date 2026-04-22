import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { APP_LANGUAGE_COOKIE_KEY } from "@/lib/i18n";
import { resolveUiLanguageFromRequest } from "@/lib/languages";
import { getTmdbApiKey, tmdbLanguageFromAppCode, tmdbSearch } from "@/lib/tmdb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getTmdbApiKey()) {
    return NextResponse.json({ error: "Search unavailable", configured: false }, { status: 503 });
  }
  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }
  const { language } = await resolveUiLanguageFromRequest(
    req.cookies.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    req.headers.get("accept-language")
  );
  const results = await tmdbSearch(q, tmdbLanguageFromAppCode(language));
  return NextResponse.json({ results });
}
