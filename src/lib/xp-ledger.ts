import { Prisma, XpEventType as PrismaXpEventType, type Prisma as PrismaTypes } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncFamilyXpUnlocks } from "@/lib/achievements/evaluate";
import { XP_EVENT_POINTS, type XpEventType } from "@/lib/xp-events";

const XP_EVENT_TO_PRISMA: Record<XpEventType, PrismaXpEventType> = {
  task_completed: PrismaXpEventType.TASK_COMPLETED,
  subscription_deleted: PrismaXpEventType.SUBSCRIPTION_DELETED,
  credit_closed: PrismaXpEventType.CREDIT_CLOSED,
  shopping_item_closed: PrismaXpEventType.SHOPPING_ITEM_CLOSED,
  medication_taken: PrismaXpEventType.MEDICATION_TAKEN,
  note_created: PrismaXpEventType.NOTE_CREATED,
};

export type AwardXpInput = {
  familyId: string;
  userId?: string | null;
  eventType: XpEventType;
  sourceType: string;
  sourceId: string;
  dedupeKey: string;
  createdAt?: Date;
};

export async function awardXp(input: AwardXpInput): Promise<number> {
  const points = XP_EVENT_POINTS[input.eventType];
  const payload: PrismaTypes.XpLedgerEntryCreateInput = {
    eventType: XP_EVENT_TO_PRISMA[input.eventType],
    points,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    dedupeKey: input.dedupeKey,
    createdAt: input.createdAt ?? new Date(),
    family: { connect: { id: input.familyId } },
    ...(input.userId ? { user: { connect: { id: input.userId } } } : {}),
  };

  try {
    await prisma.xpLedgerEntry.create({ data: payload });
    return points;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return 0;
    }
    throw error;
  }
}

export async function getFamilyXpFromLedger(familyId: string): Promise<number> {
  const row = await prisma.xpLedgerEntry.aggregate({
    where: { familyId },
    _sum: { points: true },
  });
  return row._sum.points ?? 0;
}

export async function syncFamilyXpUnlocksFromLedger(familyId: string): Promise<string[]> {
  const familyXp = await getFamilyXpFromLedger(familyId);
  return syncFamilyXpUnlocks(familyId, familyXp);
}
