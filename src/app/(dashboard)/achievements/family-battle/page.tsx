import FamilyBattleView from "@/components/achievements/FamilyBattleView";
import { CozyPageBackground } from "@/components/shared/CozyPageBackground";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { pickRandomElement } from "@/lib/family-battle";
import { kyivStartOfTodayUtc, kyivStartOfWeekUtc } from "@/lib/kyiv-range";
import { nibbyChargeStage, type NibbyChargeStage } from "@/lib/nibby-charge";
import { createFamilyBattleRecord } from "@/lib/family-battle-session";
import { prisma } from "@/lib/prisma";
import { userCreditedTaskWhere } from "@/lib/task-xp";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Family battle",
};

export default async function FamilyBattlePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const familyId = await ensureUserFamily(userId);
  if (!familyId) redirect("/login");

  const [playerFamily, candidates] = await Promise.all([
    prisma.family.findUnique({
      where: { id: familyId },
      select: { id: true, name: true },
    }),
    prisma.family.findMany({
      where: { shareInLeaderboard: true, id: { not: familyId } },
      select: { id: true, name: true },
    }),
  ]);

  const opponent = pickRandomElement(candidates);

  const timeZone = session.user.timeZone || "Europe/Kyiv";
  const startToday = kyivStartOfTodayUtc(new Date(), timeZone);
  const startWeek = kyivStartOfWeekUtc(new Date(), timeZone);
  const mine = userCreditedTaskWhere(userId);

  const [playerDoneToday, playerDoneWeek, opponentStats] = await Promise.all([
    prisma.task.count({
      where: {
        ...mine,
        completed: true,
        completedAt: { gte: startToday },
        column: { board: { familyId } },
      },
    }),
    prisma.task.count({
      where: {
        ...mine,
        completed: true,
        completedAt: { gte: startWeek },
        column: { board: { familyId } },
      },
    }),
    opponent
      ? Promise.all([
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
        ])
      : Promise.resolve([0, 0] as const),
  ]);

  const playerChargeStage = nibbyChargeStage(playerDoneToday, playerDoneWeek);
  const playerMaxLives = playerChargeStage;

  let opponentMaxLives = 1;
  let opponentChargeStage: NibbyChargeStage = 1;
  if (opponent) {
    const [oppDoneToday, oppDoneWeek] = opponentStats;
    opponentChargeStage = nibbyChargeStage(oppDoneToday, oppDoneWeek);
    opponentMaxLives = opponentChargeStage;
  }

  let initialBattleId: string | null = null;
  if (opponent) {
    const rec = await createFamilyBattleRecord({
      playerUserId: userId,
      playerFamilyId: familyId,
      opponentFamilyId: opponent.id,
      timeZone,
    });
    initialBattleId = rec?.id ?? null;
  }

  return (
    <CozyPageBackground>
      <FamilyBattleView
        playerFamilyId={familyId}
        playerFamilyName={playerFamily?.name ?? ""}
        opponent={opponent}
        initialBattleId={initialBattleId}
        playerMaxLives={playerMaxLives}
        playerChargeStage={playerChargeStage}
        opponentMaxLives={opponentMaxLives}
        opponentChargeStage={opponentChargeStage}
      />
    </CozyPageBackground>
  );
}
