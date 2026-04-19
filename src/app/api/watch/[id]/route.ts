import { syncUserStatUnlocks } from "@/lib/achievements/evaluate";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const watchUserSelect = { id: true, name: true, image: true, color: true, emoji: true } as const;

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null as null | Record<string, unknown>);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await prisma.watchItem.findFirst({
    where: { id, familyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const statusRaw = body.status != null ? String(body.status).toUpperCase() : null;
  const allowed = ["WATCHING", "PAUSED", "FINISHED", "DROPPED"] as const;
  const status =
    statusRaw && (allowed as readonly string[]).includes(statusRaw)
      ? (statusRaw as (typeof allowed)[number])
      : undefined;

  let season = existing.season;
  if (body.season != null) {
    const s = Number(body.season);
    if (!Number.isFinite(s) || s < 0) return NextResponse.json({ error: "Invalid season" }, { status: 400 });
    season = Math.floor(s);
  }

  const data: {
    status?: (typeof allowed)[number];
    season?: number | null;
    completedAt?: Date | null;
    userId: string;
  } = { userId: session.user.id };

  if (status) {
    data.status = status;
    if (status === "FINISHED" || status === "DROPPED") data.completedAt = new Date();
    else data.completedAt = null;
  }

  if (body.season != null) {
    data.season = season;
  }

  const updated = await prisma.watchItem.update({
    where: { id },
    data,
    include: { user: { select: watchUserSelect } },
  });

  const newAchievementIds = await syncUserStatUnlocks(session.user.id, familyId);
  return NextResponse.json({ ...updated, newAchievementIds });
}

export async function DELETE(_req: NextRequest, ctx: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const res = await prisma.watchItem.deleteMany({ where: { id, familyId } });
  if (res.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
