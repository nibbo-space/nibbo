import {
  getUnlockedFamilyAchievementIdsFromDb,
  getUnlockedUserAchievementIds,
  mergeUnlockedFamilyIds,
  syncFamilyMemberUnlocks,
  syncFamilyXpUnlocks,
  syncRegistrationRankUnlocks,
  syncUserStatUnlocks,
} from "@/lib/achievements/evaluate";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { getFamilyDisplayXp } from "@/lib/family-display-xp";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const familyXp = await getFamilyDisplayXp(familyId);
  const [newXp, newMembers, newStats, newRank] = await Promise.all([
    syncFamilyXpUnlocks(familyId, familyXp),
    syncFamilyMemberUnlocks(familyId),
    syncUserStatUnlocks(userId, familyId),
    syncRegistrationRankUnlocks(userId),
  ]);
  const newUnlockIds = [...newXp, ...newMembers, ...newStats, ...newRank];

  const [dbFamilyUnlocks, unlockedUserAchievementIds, tapRow] = await Promise.all([
    getUnlockedFamilyAchievementIdsFromDb(familyId),
    getUnlockedUserAchievementIds(userId),
    prisma.userAchievementCounter.findUnique({
      where: { userId_key: { userId, key: "mascot_blob_tap" } },
      select: { value: true },
    }),
  ]);

  const unlockedFamilyAchievementIds = mergeUnlockedFamilyIds(dbFamilyUnlocks, familyXp);

  return NextResponse.json({
    familyXp,
    unlockedFamilyAchievementIds,
    unlockedUserAchievementIds,
    mascotTapCount: tapRow?.value ?? 0,
    newUnlockIds,
  });
}
