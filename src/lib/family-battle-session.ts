import { applyUserCounterIncrement } from "@/lib/achievements/evaluate";
import { FAMILY_BATTLE_WINS_COUNTER_KEY } from "@/lib/achievements/registry";
import { FAMILY_BATTLE_WIN_XP, incrementFamilyBattleBonusXp } from "@/lib/family-display-xp";
import { zonedStartOfTodayUtc, zonedStartOfWeekUtc } from "@/lib/calendar-tz";
import { nibbyChargeStage } from "@/lib/nibby-charge";
import { prisma } from "@/lib/prisma";
import { userCreditedTaskWhere } from "@/lib/task-xp";

const MIN_ELAPSED_WIN_MS = 4_000;
const MIN_ELAPSED_LOSS_MS = 2_500;
const MAX_ELAPSED_MS = 3_600_000;

export async function createFamilyBattleRecord(input: {
  playerUserId: string;
  playerFamilyId: string;
  opponentFamilyId: string;
  timeZone: string;
}): Promise<{ id: string } | null> {
  const opponent = await prisma.family.findFirst({
    where: {
      id: input.opponentFamilyId,
      shareInLeaderboard: true,
      NOT: { id: input.playerFamilyId },
    },
    select: { id: true },
  });
  if (!opponent) return null;

  const startToday = zonedStartOfTodayUtc(new Date(), input.timeZone);
  const startWeek = zonedStartOfWeekUtc(new Date(), input.timeZone);
  const mine = userCreditedTaskWhere(input.playerUserId);

  const [playerDoneToday, playerDoneWeek, oppDoneToday, oppDoneWeek] = await Promise.all([
    prisma.task.count({
      where: {
        ...mine,
        completed: true,
        completedAt: { gte: startToday },
        column: { board: { familyId: input.playerFamilyId } },
      },
    }),
    prisma.task.count({
      where: {
        ...mine,
        completed: true,
        completedAt: { gte: startWeek },
        column: { board: { familyId: input.playerFamilyId } },
      },
    }),
    prisma.task.count({
      where: {
        completed: true,
        completedAt: { gte: startToday },
        column: { board: { familyId: opponent.id } },
      },
    }),
    prisma.task.count({
      where: {
        completed: true,
        completedAt: { gte: startWeek },
        column: { board: { familyId: opponent.id } },
      },
    }),
  ]);

  const playerStage = nibbyChargeStage(playerDoneToday, playerDoneWeek);
  const opponentStage = nibbyChargeStage(oppDoneToday, oppDoneWeek);

  return prisma.familyBattle.create({
    data: {
      playerUserId: input.playerUserId,
      playerFamilyId: input.playerFamilyId,
      opponentFamilyId: opponent.id,
      playerMaxLives: playerStage,
      opponentMaxLives: opponentStage,
    },
    select: { id: true },
  });
}

export async function completeFamilyBattle(
  playerUserId: string,
  battleId: string,
  outcome: "win" | "loss"
): Promise<
  | { ok: true; displayXp: number | null; newUnlockIds: string[] }
  | { ok: false; error: string; status: number }
> {
  const row = await prisma.familyBattle.findFirst({
    where: { id: battleId, playerUserId },
  });
  if (!row) return { ok: false, error: "Not found", status: 404 };
  if (row.status !== "IN_PROGRESS") return { ok: false, error: "Already completed", status: 409 };

  const elapsed = Date.now() - row.startedAt.getTime();
  if (elapsed > MAX_ELAPSED_MS) {
    await prisma.familyBattle.updateMany({
      where: { id: battleId, playerUserId, status: "IN_PROGRESS" },
      data: {
        status: "COMPLETED",
        outcome: "LOSS",
        completedAt: new Date(),
      },
    });
    return { ok: false, error: "Session expired", status: 410 };
  }

  const wantWin = outcome === "win";
  if (wantWin && elapsed < MIN_ELAPSED_WIN_MS) {
    return { ok: false, error: "Too fast", status: 429 };
  }
  if (!wantWin && elapsed < MIN_ELAPSED_LOSS_MS) {
    return { ok: false, error: "Too fast", status: 429 };
  }

  const dbOutcome = wantWin ? "WIN" : "LOSS";

  const updated = await prisma.familyBattle.updateMany({
    where: { id: battleId, playerUserId, status: "IN_PROGRESS" },
    data: {
      status: "COMPLETED",
      outcome: dbOutcome,
      completedAt: new Date(),
    },
  });
  if (updated.count !== 1) {
    return { ok: false, error: "Already completed", status: 409 };
  }

  const newUnlockIds: string[] = [];
  let displayXp: number | null = null;

  if (wantWin) {
    const xpRes = await incrementFamilyBattleBonusXp(playerUserId, FAMILY_BATTLE_WIN_XP);
    displayXp = xpRes.displayXp;
    const winCounter = await applyUserCounterIncrement(playerUserId, FAMILY_BATTLE_WINS_COUNTER_KEY, 1, 1);
    newUnlockIds.push(...winCounter.newUnlockIds);
    await prisma.familyBattle.update({
      where: { id: battleId },
      data: { xpAwarded: true },
    });
  }

  return { ok: true, displayXp, newUnlockIds };
}
