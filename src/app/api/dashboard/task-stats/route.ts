import {
  getUnlockedFamilyAchievementIdsFromDb,
  getUnlockedUserAchievementIds,
  mergeUnlockedFamilyIds,
  syncFamilyMemberUnlocks,
  syncFamilyXpUnlocks,
  syncRegistrationRankUnlocks,
  syncUserStatUnlocks,
} from "@/lib/achievements/evaluate";
import { familyXpFromCompletedTaskCount } from "@/lib/achievements/registry";
import { auth } from "@/lib/auth";
import {
  familyXpCompletedTasksWhere,
  userCreditedCompletedTasksWhere,
  userCreditedOpenTasksWhere,
} from "@/lib/family-private-scope";
import { ensureUserFamily } from "@/lib/family";
import { kyivStartOfTodayUtc, kyivStartOfWeekUtc } from "@/lib/kyiv-range";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const tz = session.user.timeZone || "Europe/Kyiv";
  const startToday = kyivStartOfTodayUtc(new Date(), tz);
  const startWeek = kyivStartOfWeekUtc(new Date(), tz);

  const [myOpen, doneToday, doneWeek, doneTotal, familyCompletedTasks] = await Promise.all([
    prisma.task.count({ where: userCreditedOpenTasksWhere(userId, familyId) }),
    prisma.task.count({
      where: userCreditedCompletedTasksWhere(userId, familyId, { gte: startToday }),
    }),
    prisma.task.count({
      where: userCreditedCompletedTasksWhere(userId, familyId, { gte: startWeek }),
    }),
    prisma.task.count({ where: userCreditedCompletedTasksWhere(userId, familyId) }),
    prisma.task.count({
      where: familyXpCompletedTasksWhere(familyId),
    }),
  ]);

  const familyXp = familyXpFromCompletedTaskCount(familyCompletedTasks);
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

