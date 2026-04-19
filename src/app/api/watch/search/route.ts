import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { getTmdbApiKey, tmdbSearch } from "@/lib/tmdb";
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
  const results = await tmdbSearch(q);
  return NextResponse.json({ results });
}
