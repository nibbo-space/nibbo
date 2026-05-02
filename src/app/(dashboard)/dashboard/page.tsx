import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/shared/DashboardClient";
import { DEFAULT_TIME_ZONE, zonedStartOfTodayUtc, zonedStartOfWeekUtc } from "@/lib/calendar-tz";
import { redirect } from "next/navigation";
import { ensureUserFamily } from "@/lib/family";
import { AUTO_BILLING_MARKER } from "@/lib/subscription-calendar";
import { userCreditedTaskWhere } from "@/lib/task-xp";
import {
  getUnlockedFamilyAchievementIdsFromDb,
  getUnlockedUserAchievementIds,
  mergeUnlockedFamilyIds,
  syncFamilyMemberUnlocks,
  syncFamilyXpUnlocks,
  syncRegistrationRankUnlocks,
  syncUserStatUnlocks,
} from "@/lib/achievements/evaluate";
import { getFamilyDisplayXp } from "@/lib/family-display-xp";
import { loadDashboardReminderDeck } from "@/lib/task-reminder-tick";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const familyId = await ensureUserFamily(userId);
  if (!familyId) redirect("/login");
  let disabledAppModules: string[] = [];
  try {
    const fam = await prisma.family.findUnique({
      where: { id: familyId },
      select: { disabledAppModules: true },
    });
    disabledAppModules = fam?.disabledAppModules ?? [];
  } catch {
    disabledAppModules = [];
  }
  const mine = userCreditedTaskWhere(userId);

  const tz = session.user.timeZone || DEFAULT_TIME_ZONE;
  const startToday = zonedStartOfTodayUtc(new Date(), tz);
  const startWeek = zonedStartOfWeekUtc(new Date(), tz);

  const [taskCount, eventCount, shoppingCount, myOpen, doneToday, doneWeek, doneTotal] = await Promise.all([
    prisma.task.count({ where: { completed: false, column: { board: { familyId } } } }),
    prisma.event.count({
      where: {
        familyId,
        startDate: { gte: new Date() },
        NOT: { description: { startsWith: AUTO_BILLING_MARKER } },
      },
    }),
    prisma.shoppingItem.count({ where: { checked: false, list: { familyId } } }),
    prisma.task.count({ where: { ...mine, completed: false, column: { board: { familyId } } } }),
    prisma.task.count({
      where: { ...mine, completed: true, completedAt: { gte: startToday }, column: { board: { familyId } } },
    }),
    prisma.task.count({
      where: { ...mine, completed: true, completedAt: { gte: startWeek }, column: { board: { familyId } } },
    }),
    prisma.task.count({ where: { ...mine, completed: true, column: { board: { familyId } } } }),
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

  const upcomingEvents = await prisma.event.findMany({
    where: {
      familyId,
      startDate: { gte: new Date() },
      NOT: { description: { startsWith: AUTO_BILLING_MARKER } },
    },
    include: { assignee: { select: { name: true, image: true, color: true, emoji: true } } },
    orderBy: { startDate: "asc" },
    take: 5,
  });

  const recentTasks = await prisma.task.findMany({
    where: { completed: false, assigneeId: userId, column: { board: { familyId } } },
    include: { assignee: { select: { name: true, image: true, color: true, emoji: true } } },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    take: 5,
  });

  const reminderDeck = await loadDashboardReminderDeck(userId, familyId, tz, new Date());

  return (
    <DashboardClient
      familyId={familyId}
      disabledAppModules={disabledAppModules}
      stats={{ taskCount, eventCount, shoppingCount }}
      personalTaskStats={{ myOpen, doneToday, doneWeek, doneTotal }}
      familyXp={familyXp}
      unlockedAchievementIds={unlockedAchievementIds}
      upcomingEvents={upcomingEvents}
      recentTasks={recentTasks}
      reminderDeck={reminderDeck}
    />
  );
}
