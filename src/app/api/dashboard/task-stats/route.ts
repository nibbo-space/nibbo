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
import {
  userCreditedCompletedTasksWhere,
  userCreditedOpenTasksWhere,
} from "@/lib/family-private-scope";
import { ensureUserFamily } from "@/lib/family";
import { getFamilyDisplayXp } from "@/lib/family-display-xp";
import { DEFAULT_TIME_ZONE, zonedStartOfTodayUtc, zonedStartOfWeekUtc } from "@/lib/calendar-tz";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const tz = session.user.timeZone || DEFAULT_TIME_ZONE;
  const startToday = zonedStartOfTodayUtc(new Date(), tz);
  const startWeek = zonedStartOfWeekUtc(new Date(), tz);

  const [myOpen, doneToday, doneWeek, doneTotal] = await Promise.all([
    prisma.task.count({ where: userCreditedOpenTasksWhere(userId, familyId) }),
    prisma.task.count({
      where: userCreditedCompletedTasksWhere(userId, familyId, { gte: startToday }),
    }),
    prisma.task.count({
      where: userCreditedCompletedTasksWhere(userId, familyId, { gte: startWeek }),
    }),
    prisma.task.count({ where: userCreditedCompletedTasksWhere(userId, familyId) }),
  ]);

  const familyXp = await getFamilyDisplayXp(familyId);
  await syncFamilyXpUnlocks(familyId, familyXp);
  await syncFamilyMemberUnlocks(familyId);
  await syncUserStatUnlocks(userId, familyId);
  await syncRegistrationRankUnlocks(userId);

  const [dbFamilyUnlocks, unlockedUserAchievementIds] = await Promise.all([
    getUnlockedFamilyAchievementIdsFromDb(familyId),
    getUnlockedUserAchievementIds(userId),
  ]);

  const unlockedFamilyIds = mergeUnlockedFamilyIds(dbFamilyUnlocks, familyXp);
  const unlockedAchievementIds = [...new Set([...unlockedFamilyIds, ...unlockedUserAchievementIds])];

  return NextResponse.json({
    myOpen,
    doneToday,
    doneWeek,
    doneTotal,
    familyXp,
    unlockedAchievementIds,
    unlockedUserAchievementIds,
  });
}

