import {
  getUnlockedFamilyAchievementIdsFromDb,
  getUnlockedUserAchievementIds,
  mergeUnlockedFamilyIds,
  syncFamilyMemberUnlocks,
  syncFamilyXpUnlocks,
  syncUserStatUnlocks,
} from "@/lib/achievements/evaluate";
import {
  shoppingItemsVisibleWhere,
  shoppingListVisibleWhere,
  taskBoardVisibleWhere,
  userCreditedCompletedTasksWhere,
  userCreditedOpenTasksWhere,
} from "@/lib/family-private-scope";
import { getFamilyDisplayXp } from "@/lib/family-display-xp";
import { kyivStartOfTodayUtc, kyivStartOfWeekUtc } from "@/lib/kyiv-range";
import { prisma } from "@/lib/prisma";
import { boardFullIncludeFor } from "@/lib/task-prisma-include";
import { NextRequest, NextResponse } from "next/server";

const RESOURCES = new Set(["tasks", "events", "shopping", "notes", "task_stats"]);

export async function handleMcpReadResourceGet(
  req: NextRequest,
  familyId: string,
  userId: string,
  resource: string
): Promise<NextResponse> {
  if (!RESOURCES.has(resource)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  switch (resource) {
    case "tasks": {
      const boards = await prisma.taskBoard.findMany({
        where: taskBoardVisibleWhere(familyId, userId),
        include: boardFullIncludeFor(userId),
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      return NextResponse.json(boards);
    }
    case "events": {
      const { searchParams } = new URL(req.url);
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const events = await prisma.event.findMany({
        where: {
          familyId,
          startDate: from ? { gte: new Date(from) } : undefined,
          endDate: to ? { lte: new Date(to) } : undefined,
        },
        include: {
          assignee: { select: { id: true, name: true, image: true, color: true, emoji: true } },
          subscription: { select: { id: true, title: true } },
        },
        orderBy: { startDate: "asc" },
      });
      return NextResponse.json(events);
    }
    case "shopping": {
      const lists = await prisma.shoppingList.findMany({
        where: shoppingListVisibleWhere(familyId, userId),
        include: {
          items: {
            where: shoppingItemsVisibleWhere(userId),
            include: {
              addedBy: { select: { id: true, name: true, image: true, color: true, emoji: true } },
            },
            orderBy: [{ checked: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      return NextResponse.json(lists);
    }
    case "notes": {
      const notes = await prisma.note.findMany({
        where: { familyId },
        include: {
          author: { select: { id: true, name: true, image: true, color: true, emoji: true } },
          category: { select: { id: true, name: true, emoji: true, color: true, parentId: true } },
        },
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      });
      return NextResponse.json(notes);
    }
    case "task_stats": {
      const userRow = await prisma.user.findUnique({
        where: { id: userId },
        select: { timeZone: true },
      });
      const tz = userRow?.timeZone || "Europe/Kyiv";
      const startToday = kyivStartOfTodayUtc(new Date(), tz);
      const startWeek = kyivStartOfWeekUtc(new Date(), tz);

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
    default:
      return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
