import { type XpEventType as PrismaXpEventType } from "@prisma/client";
import { XP_EVENT_POINTS } from "@/lib/xp-events";

export const XP_RULES = [
  { eventType: "TASK_COMPLETED" as PrismaXpEventType, key: "task_completed", title: "Task completed" },
  { eventType: "SUBSCRIPTION_DELETED" as PrismaXpEventType, key: "subscription_deleted", title: "Subscription deleted" },
  { eventType: "CREDIT_CLOSED" as PrismaXpEventType, key: "credit_closed", title: "Credit closed" },
  { eventType: "SHOPPING_ITEM_CLOSED" as PrismaXpEventType, key: "shopping_item_closed", title: "Shopping item closed" },
  { eventType: "MEDICATION_TAKEN" as PrismaXpEventType, key: "medication_taken", title: "Medication taken" },
  { eventType: "NOTE_CREATED" as PrismaXpEventType, key: "note_created", title: "Note created" },
] as const;

export function xpTitleForEvent(eventType: PrismaXpEventType): string {
  return XP_RULES.find((row) => row.eventType === eventType)?.title ?? eventType;
}

export function xpPointsForPrismaEvent(eventType: PrismaXpEventType): number {
  const row = XP_RULES.find((item) => item.eventType === eventType);
  if (!row) return 0;
  return XP_EVENT_POINTS[row.key];
}
