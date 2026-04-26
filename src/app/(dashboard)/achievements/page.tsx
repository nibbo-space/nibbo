import AchievementsView from "@/components/achievements/AchievementsView";
import {
  getUnlockedFamilyAchievementIdsFromDb,
  getUnlockedUserAchievementIds,
  mergeUnlockedFamilyIds,
  syncFamilyMemberUnlocks,
  syncFamilyXpUnlocks,
  syncRegistrationRankUnlocks,
  syncUserStatUnlocks,
} from "@/lib/achievements/evaluate";
import { listAchievementsSorted } from "@/lib/achievements/registry";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { getFamilyDisplayXp } from "@/lib/family-display-xp";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type LeaderboardRow = {
  familyId: string;
  familyName: string;
  points: number;
};

type FamilyInfoRow = {
  id: string;
  name: string;
  shareInLeaderboard: boolean;
};

export default async function AchievementsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const familyId = await ensureUserFamily(userId);
  if (!familyId) redirect("/login");

  const [familyInfoRows, leaderboard] = await Promise.all([
    prisma.$queryRaw<FamilyInfoRow[]>`
      SELECT "id", "name", "shareInLeaderboard"
      FROM "Family"
      WHERE "id" = ${familyId}
      LIMIT 1
    `,
    prisma.$queryRaw<LeaderboardRow[]>`
      SELECT
        f."id" AS "familyId",
        f."name" AS "familyName",
        COALESCE(SUM(x."points"), 0)::int AS "points"
      FROM "Family" f
      LEFT JOIN "XpLedgerEntry" x ON x."familyId" = f."id"
      WHERE f."shareInLeaderboard" = true
      GROUP BY f."id", f."name"
      ORDER BY COALESCE(SUM(x."points"), 0) DESC, f."name" ASC
    `,
  ]);

  const familyInfo = familyInfoRows[0] ?? null;
  const points = await getFamilyDisplayXp(familyId);
  await syncFamilyXpUnlocks(familyId, points);
  await syncFamilyMemberUnlocks(familyId);
  await syncUserStatUnlocks(userId, familyId);
  await syncRegistrationRankUnlocks(userId);

  const [dbFamilyUnlocks, userUnlockIds] = await Promise.all([
    getUnlockedFamilyAchievementIdsFromDb(familyId),
    getUnlockedUserAchievementIds(userId),
  ]);

  const mergedFamilyUnlocks = mergeUnlockedFamilyIds(dbFamilyUnlocks, points);
  const userUnlockSet = new Set(userUnlockIds);
  const achievements = listAchievementsSorted().map((def) => ({
    id: def.id,
    kind: def.kind,
    threshold: def.threshold,
    secret: def.secret,
    order: def.order,
    badgeKey: def.badgeKey,
    emoji: def.emoji,
    stickerBorderUnlocked: def.stickerBorderUnlocked,
    stickerBgUnlocked: def.stickerBgUnlocked,
    stickerBorderLocked: def.stickerBorderLocked,
    stickerBgLocked: def.stickerBgLocked,
    unlocked:
      def.kind === "xp_family" || def.kind === "family_members"
        ? mergedFamilyUnlocks.includes(def.id)
        : def.kind === "counter_user" || def.kind === "stat_user" || def.kind === "registration_rank"
          ? userUnlockSet.has(def.id)
          : false,
  }));
  const rows = leaderboard.map((row, index) => ({
    rank: index + 1,
    familyId: row.familyId,
    familyName: row.familyName,
    points: row.points,
  }));
  const myRank = rows.find((row) => row.familyId === familyId) ?? null;

  return (
    <AchievementsView
      points={points}
      familyInfo={familyInfo}
      myRank={myRank}
      rows={rows}
      achievements={achievements}
    />
  );
}
