import { syncUserStatUnlocks } from "@/lib/achievements/evaluate";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { getTmdbApiKey, tmdbFetchDetails } from "@/lib/tmdb";
import { NextRequest, NextResponse } from "next/server";

const watchUserSelect = { id: true, name: true, image: true, color: true, emoji: true } as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [active, history] = await Promise.all([
    prisma.watchItem.findMany({
      where: { familyId, status: { in: ["WATCHING", "PAUSED"] } },
      include: { user: { select: watchUserSelect } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.watchItem.findMany({
      where: { familyId, status: { in: ["FINISHED", "DROPPED"] } },
      include: { user: { select: watchUserSelect } },
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
      take: 80,
    }),
  ]);

  return NextResponse.json({ active, history });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null as null | Record<string, unknown>);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const externalId = String(body.externalId || "").trim();
  const mediaTypeRaw = String(body.mediaType || "").toUpperCase();
  const provider = String(body.provider || "tmdb").trim() || "tmdb";

  if (!externalId || (mediaTypeRaw !== "MOVIE" && mediaTypeRaw !== "TV")) {
    return NextResponse.json({ error: "externalId and mediaType (MOVIE|TV) required" }, { status: 400 });
  }

  const mediaType = mediaTypeRaw as "MOVIE" | "TV";

  let title = String(body.title || "").trim();
  let posterPath: string | null = typeof body.posterPath === "string" ? body.posterPath : null;

  const key = getTmdbApiKey();
  if (key) {
    const details = await tmdbFetchDetails(mediaType, externalId);
    if (details) {
      title = details.title;
      posterPath = details.posterPath;
    }
  }

  if (!title) {
    return NextResponse.json({ error: "Could not resolve title; set TMDB_API_KEY or send title" }, { status: 422 });
  }

  const existing = await prisma.watchItem.findUnique({
    where: { familyId_provider_externalId: { familyId, provider, externalId } },
    include: { user: { select: watchUserSelect } },
  });

  if (existing) {
    const updated = await prisma.watchItem.update({
      where: { id: existing.id },
      data: {
        status: "WATCHING",
        userId: session.user.id,
        title,
        posterPath: posterPath ?? existing.posterPath,
        completedAt: null,
        startedAt: new Date(),
      },
      include: { user: { select: watchUserSelect } },
    });
    const newAchievementIds = await syncUserStatUnlocks(session.user.id, familyId);
    return NextResponse.json({ ...updated, newAchievementIds });
  }

  const created = await prisma.watchItem.create({
    data: {
      familyId,
      userId: session.user.id,
      provider,
      externalId,
      mediaType,
      title,
      posterPath,
      status: "WATCHING",
      season: null,
    },
    include: { user: { select: watchUserSelect } },
  });

  const newAchievementIds = await syncUserStatUnlocks(session.user.id, familyId);
  return NextResponse.json({ ...created, newAchievementIds }, { status: 201 });
}
