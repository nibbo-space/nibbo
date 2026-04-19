import { familyXpFromCompletedTaskCount } from "@/lib/achievements/registry";
import { syncFamilyXpUnlocks } from "@/lib/achievements/evaluate";
import { prisma } from "@/lib/prisma";

export const FAMILY_BATTLE_BONUS_XP_KEY = "family_battle_bonus_xp";

export const FAMILY_BATTLE_WIN_XP = 5;

export async function familyBattleBonusXpForFamily(familyId: string): Promise<number> {
  const agg = await prisma.userAchievementCounter.aggregate({
    where: { key: FAMILY_BATTLE_BONUS_XP_KEY, user: { familyId } },
    _sum: { value: true },
  });
  return agg._sum.value ?? 0;
}

export async function getFamilyDisplayXp(familyId: string): Promise<number> {
  const [completed, bonus] = await Promise.all([
    prisma.task.count({
      where: { completed: true, column: { board: { familyId } } },
    }),
    familyBattleBonusXpForFamily(familyId),
  ]);
  return familyXpFromCompletedTaskCount(completed) + bonus;
}

export async function incrementFamilyBattleBonusXp(
  userId: string,
  delta: number
): Promise<{ displayXp: number }> {
  const inc = Math.min(50, Math.max(0, Math.floor(delta)));
  if (inc === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });
    const fid = user?.familyId;
    if (!fid) return { displayXp: 0 };
    return { displayXp: await getFamilyDisplayXp(fid) };
  }

  const row = await prisma.userAchievementCounter.upsert({
    where: { userId_key: { userId, key: FAMILY_BATTLE_BONUS_XP_KEY } },
    create: { userId, key: FAMILY_BATTLE_BONUS_XP_KEY, value: inc },
    update: { value: { increment: inc } },
  });
  const capped = Math.min(row.value, 999_999);
  if (capped !== row.value) {
    await prisma.userAchievementCounter.update({
      where: { userId_key: { userId, key: FAMILY_BATTLE_BONUS_XP_KEY } },
      data: { value: capped },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { familyId: true },
  });
  const familyId = user?.familyId;
  if (!familyId) return { displayXp: 0 };

  const displayXp = await getFamilyDisplayXp(familyId);
  await syncFamilyXpUnlocks(familyId, displayXp);
  return { displayXp };
}
