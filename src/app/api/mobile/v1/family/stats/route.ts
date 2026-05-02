import { NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENT_BADGES_UK } from "@/lib/achievements/badge-i18n";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/achievements/registry";

export const GET = withMobileAuth(async (_req, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const [xpByUser, familyAchievements, members] = await Promise.all([
    prisma.xpLedgerEntry.groupBy({
      by: ["userId"],
      where: { familyId },
      _sum: { points: true },
    }),
    prisma.familyAchievementUnlock.findMany({
      where: { familyId },
      select: { achievementId: true, unlockedAt: true },
      orderBy: { unlockedAt: "asc" },
    }),
    prisma.user.findMany({
      where: { familyId },
      select: { id: true, name: true, image: true, emoji: true, color: true },
    }),
  ]);

  const xpMap = new Map(
    xpByUser.map((row) => [row.userId ?? "__family__", row._sum.points ?? 0])
  );

  const membersWithXp = members.map((m) => ({
    id: m.id,
    name: m.name,
    image: m.image,
    emoji: m.emoji,
    color: m.color,
    xp: xpMap.get(m.id) ?? 0,
  }));

  const totalFamilyXp = membersWithXp.reduce((sum, m) => sum + m.xp, 0);

  const achievements = familyAchievements.map((ua) => {
    const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === ua.achievementId);
    const badgeKey = def && "badgeKey" in def ? (def as { badgeKey: string }).badgeKey : ua.achievementId;
    return {
      id: ua.achievementId,
      name: ACHIEVEMENT_BADGES_UK[badgeKey] ?? ua.achievementId,
      unlockedAt: ua.unlockedAt.toISOString(),
    };
  });

  return NextResponse.json({
    totalXp: totalFamilyXp,
    members: membersWithXp,
    achievements,
  });
});
