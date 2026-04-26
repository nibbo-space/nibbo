import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { parseDisabledAppModules } from "@/lib/family-app-modules";
import { prisma } from "@/lib/prisma";

async function currentFamilyUser(userId: string, familyId: string) {
  return prisma.user.findFirst({
    where: { id: userId, familyId },
    select: { id: true, familyRole: true },
  });
}

export const GET = withMobileAuth(async (_req, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const [me, family, members, invitations] = await Promise.all([
    currentFamilyUser(ctx.userId, familyId),
    prisma.family.findUnique({
      where: { id: familyId },
      select: {
        id: true,
        name: true,
        shareInLeaderboard: true,
        shareWatchingFeed: true,
        disabledAppModules: true,
        modulesSetupCompletedAt: true,
      },
    }),
    prisma.user.findMany({
      where: { familyId },
      select: { id: true, name: true, email: true, image: true, color: true, emoji: true, familyRole: true },
      orderBy: { name: "asc" },
    }),
    prisma.familyInvitation.findMany({
      where: { familyId, acceptedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    family,
    members,
    invitations,
    currentUserId: me?.id ?? ctx.userId,
    currentUserRole: me?.familyRole ?? "MEMBER",
  });
});

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await currentFamilyUser(ctx.userId, familyId);
  if (!me || me.familyRole !== "OWNER") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (body.type === "settings") {
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "FAMILY_NAME_REQUIRED" }, { status: 400 });
    if (name.length > 64) return NextResponse.json({ error: "FAMILY_NAME_TOO_LONG" }, { status: 400 });

    const family = await prisma.family.update({
      where: { id: familyId },
      data: {
        name,
        shareInLeaderboard: Boolean(body.shareInLeaderboard),
        shareWatchingFeed: Boolean(body.shareWatchingFeed),
      },
      select: { id: true, name: true, shareInLeaderboard: true, shareWatchingFeed: true },
    });
    return NextResponse.json({ success: true, family });
  }

  if (body.type === "modules") {
    if (!Array.isArray(body.disabledAppModules)) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const disabledAppModules = parseDisabledAppModules(
      body.disabledAppModules.map((x: unknown) => String(x))
    );
    const family = await prisma.family.update({
      where: { id: familyId },
      data: {
        disabledAppModules,
        ...(body.completeModulesSetup ? { modulesSetupCompletedAt: new Date() } : {}),
      },
      select: { id: true, disabledAppModules: true, modulesSetupCompletedAt: true },
    });
    return NextResponse.json({ success: true, family });
  }

  const ownerId = String(body.ownerId || "").trim();
  if (!ownerId) return NextResponse.json({ error: "OWNER_ID_REQUIRED" }, { status: 400 });
  if (ownerId === ctx.userId) return NextResponse.json({ success: true });

  const nextOwner = await prisma.user.findFirst({
    where: { id: ownerId, familyId },
    select: { id: true },
  });
  if (!nextOwner) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });

  await prisma.$transaction([
    prisma.user.updateMany({ where: { familyId, familyRole: "OWNER" }, data: { familyRole: "MEMBER" } }),
    prisma.user.update({ where: { id: ownerId }, data: { familyRole: "OWNER" } }),
  ]);
  return NextResponse.json({ success: true });
});
