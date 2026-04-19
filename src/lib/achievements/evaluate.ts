import { prisma } from "@/lib/prisma";
import {
  ACHIEVEMENT_DEFINITIONS,
  MASCOT_BLOB_TAP_COUNTER_KEY,
  unlockedXpFamilyIdsFromXp,
  type UserStatAchievementKey,
} from "@/lib/achievements/registry";
import { userCreditedTaskWhere } from "@/lib/task-xp";

export async function syncFamilyMemberUnlocks(familyId: string): Promise<string[]> {
  const defs = ACHIEVEMENT_DEFINITIONS.filter((d) => d.kind === "family_members");
  if (defs.length === 0) return [];
  const n = await prisma.user.count({ where: { familyId } });
  const eligibleIds = defs.filter((d) => n >= d.threshold).map((d) => d.id);
  if (eligibleIds.length === 0) return [];

  const existing = await prisma.familyAchievementUnlock.findMany({
    where: { familyId, achievementId: { in: eligibleIds } },
    select: { achievementId: true },
  });
  const have = new Set(existing.map((e) => e.achievementId));
  const toCreate = eligibleIds.filter((id) => !have.has(id));
  if (toCreate.length === 0) return [];

  await prisma.familyAchievementUnlock.createMany({
    data: toCreate.map((achievementId) => ({ familyId, achievementId })),
  });
  return toCreate;
}

export async function syncFamilyXpUnlocks(familyId: string, familyXp: number): Promise<string[]> {
  const eligibleIds = ACHIEVEMENT_DEFINITIONS.filter(
    (d) => d.kind === "xp_family" && familyXp >= d.threshold
  ).map((d) => d.id);
  if (eligibleIds.length === 0) return [];

  const existing = await prisma.familyAchievementUnlock.findMany({
    where: { familyId, achievementId: { in: eligibleIds } },
    select: { achievementId: true },
  });
  const have = new Set(existing.map((e) => e.achievementId));
  const toCreate = eligibleIds.filter((id) => !have.has(id));
  if (toCreate.length === 0) return [];

  await prisma.familyAchievementUnlock.createMany({
    data: toCreate.map((achievementId) => ({ familyId, achievementId })),
  });
  return toCreate;
}

export async function applyUserCounterIncrement(
  userId: string,
  counterKey: string,
  increment: number,
  maxIncrementPerCall: number
): Promise<{ newUnlockIds: string[]; value: number }> {
  const defs = ACHIEVEMENT_DEFINITIONS.filter(
    (d) => d.kind === "counter_user" && d.counterKey === counterKey
  ).sort((a, b) => a.threshold - b.threshold);
  if (defs.length === 0) return { newUnlockIds: [], value: 0 };

  const inc = Math.min(Math.max(0, Math.floor(increment)), maxIncrementPerCall);

  return prisma.$transaction(async (tx) => {
    const row = await tx.userAchievementCounter.upsert({
      where: { userId_key: { userId, key: counterKey } },
      create: { userId, key: counterKey, value: Math.min(inc, 9999) },
      update: { value: { increment: inc } },
    });
    let value = Math.min(row.value, 9999);
    if (value !== row.value) {
      await tx.userAchievementCounter.update({
        where: { userId_key: { userId, key: counterKey } },
        data: { value },
      });
    }

    const existingUnlocks = await tx.userAchievementUnlock.findMany({
      where: { userId, achievementId: { in: defs.map((d) => d.id) } },
      select: { achievementId: true },
    });
    const unlocked = new Set(existingUnlocks.map((e) => e.achievementId));
    const newUnlockIds: string[] = [];

    for (const def of defs) {
      if (value < def.threshold || unlocked.has(def.id)) continue;
      await tx.userAchievementUnlock.create({
        data: { userId, achievementId: def.id },
      });
      unlocked.add(def.id);
      newUnlockIds.push(def.id);
    }

    return { newUnlockIds, value };
  });
}

export async function applyMascotBlobTapEvent(
  userId: string,
  increment: number
): Promise<{ newUnlockIds: string[]; value: number }> {
  return applyUserCounterIncrement(userId, MASCOT_BLOB_TAP_COUNTER_KEY, increment, 50);
}

async function loadUserStatCounts(
  userId: string,
  familyId: string
): Promise<Record<UserStatAchievementKey, number>> {
  const mine = userCreditedTaskWhere(userId);
  const [
    user_tasks_done,
    user_events_assigned,
    user_notes_written,
    user_shopping_checked,
    user_meals_cooked,
    user_watch_items,
    user_watch_watching,
  ] = await Promise.all([
    prisma.task.count({
      where: { completed: true, ...mine, column: { board: { familyId } } },
    }),
    prisma.event.count({ where: { familyId, assigneeId: userId } }),
    prisma.note.count({ where: { familyId, authorId: userId } }),
    prisma.shoppingItem.count({
      where: { checked: true, addedById: userId, list: { familyId } },
    }),
    prisma.mealPlan.count({ where: { familyId, cookId: userId } }),
    prisma.watchItem.count({ where: { familyId, userId } }),
    prisma.watchItem.count({ where: { familyId, userId, status: "WATCHING" } }),
  ]);

  return {
    user_tasks_done,
    user_events_assigned,
    user_notes_written,
    user_shopping_checked,
    user_meals_cooked,
    user_watch_items,
    user_watch_watching,
  };
}

export async function syncRegistrationRankUnlocks(userId: string): Promise<string[]> {
  const defs = ACHIEVEMENT_DEFINITIONS.filter((d) => d.kind === "registration_rank");
  if (defs.length === 0) return [];
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, id: true },
  });
  if (!user) return [];
  const before = await prisma.user.count({
    where: {
      OR: [{ createdAt: { lt: user.createdAt } }, { AND: [{ createdAt: user.createdAt }, { id: { lt: user.id } }] }],
    },
  });
  const rank = before + 1;
  const eligibleIds = defs.filter((d) => rank <= d.threshold).map((d) => d.id);
  if (eligibleIds.length === 0) return [];
  const existing = await prisma.userAchievementUnlock.findMany({
    where: { userId, achievementId: { in: eligibleIds } },
    select: { achievementId: true },
  });
  const have = new Set(existing.map((e) => e.achievementId));
  const toCreate = eligibleIds.filter((id) => !have.has(id));
  if (toCreate.length === 0) return [];
  await prisma.userAchievementUnlock.createMany({
    data: toCreate.map((achievementId) => ({ userId, achievementId })),
  });
  return toCreate;
}

export async function syncUserStatUnlocks(userId: string, familyId: string): Promise<string[]> {
  const statDefs = ACHIEVEMENT_DEFINITIONS.filter((d) => d.kind === "stat_user" && d.statKey);
  if (statDefs.length === 0) return [];

  const counts = await loadUserStatCounts(userId, familyId);
  const eligibleIds = statDefs
    .filter((d) => {
      const k = d.statKey!;
      return counts[k] >= d.threshold;
    })
    .map((d) => d.id);

  if (eligibleIds.length === 0) return [];

  const existing = await prisma.userAchievementUnlock.findMany({
    where: { userId, achievementId: { in: eligibleIds } },
    select: { achievementId: true },
  });
  const have = new Set(existing.map((e) => e.achievementId));
  const toCreate = eligibleIds.filter((id) => !have.has(id));
  if (toCreate.length === 0) return [];

  await prisma.userAchievementUnlock.createMany({
    data: toCreate.map((achievementId) => ({ userId, achievementId })),
  });
  return toCreate;
}

export async function getUnlockedUserAchievementIds(userId: string): Promise<string[]> {
  const rows = await prisma.userAchievementUnlock.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  return rows.map((r) => r.achievementId);
}

export async function getUnlockedFamilyAchievementIdsFromDb(familyId: string): Promise<string[]> {
  const rows = await prisma.familyAchievementUnlock.findMany({
    where: { familyId },
    select: { achievementId: true },
  });
  return rows.map((r) => r.achievementId);
}

export function mergeUnlockedFamilyIds(dbIds: string[], familyXp: number): string[] {
  const fromXp = new Set(unlockedXpFamilyIdsFromXp(familyXp));
  const out = new Set<string>([...dbIds, ...fromXp]);
  return [...out];
}
