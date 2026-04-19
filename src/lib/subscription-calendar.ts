import { prisma } from "@/lib/prisma";
import { SubscriptionBillingCycle, SubscriptionStatus } from "@prisma/client";

export const AUTO_BILLING_MARKER = "[AUTO_BILLING]";

function addBillingStep(date: Date, billingCycle: SubscriptionBillingCycle, step: number) {
  if (billingCycle === "YEARLY") {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + step);
    return next;
  }
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + step + 1);
  next.setDate(0);
  const lastDay = next.getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

function buildBillingDates(startDate: Date, billingCycle: SubscriptionBillingCycle) {
  const occurrences = billingCycle === "YEARLY" ? 5 : 24;
  return Array.from({ length: occurrences }, (_, index) => addBillingStep(startDate, billingCycle, index));
}

export async function syncSubscriptionBillingEvents(input: {
  subscriptionId: string;
  familyId: string;
  title: string;
  billingCycle: SubscriptionBillingCycle;
  nextBillingDate: Date;
  status: SubscriptionStatus;
}) {
  const baseWhere = {
    subscriptionId: input.subscriptionId,
    description: { startsWith: AUTO_BILLING_MARKER },
  };

  if (input.status !== "ACTIVE") {
    await prisma.event.deleteMany({ where: baseWhere });
    return;
  }

  const dates = buildBillingDates(input.nextBillingDate, input.billingCycle);
  const rows = dates.map((date) => ({
    title: `Списання: ${input.title}`,
    description: `${AUTO_BILLING_MARKER} ${input.title}`,
    emoji: "subscription",
    color: "#8b5cf6",
    startDate: date,
    endDate: date,
    allDay: true,
    weeklyRepeat: false,
    weeklyDay: null,
    location: null,
    assigneeId: null,
    familyId: input.familyId,
    subscriptionId: input.subscriptionId,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.event.deleteMany({ where: baseWhere });
    if (rows.length > 0) {
      await tx.event.createMany({ data: rows });
    }
  });
}

export async function clearSubscriptionBillingEvents(subscriptionId: string) {
  await prisma.event.deleteMany({
    where: {
      subscriptionId,
      description: { startsWith: AUTO_BILLING_MARKER },
    },
  });
}

