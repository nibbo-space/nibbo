import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { clearSubscriptionBillingEvents, syncSubscriptionBillingEvents } from "@/lib/subscription-calendar";
import { SubscriptionBillingCycle, SubscriptionMemberRole, SubscriptionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const billingCycles = new Set<SubscriptionBillingCycle>(["MONTHLY", "YEARLY"]);
const statuses = new Set<SubscriptionStatus>(["ACTIVE", "PAUSED", "CANCELLED"]);

async function getCurrentFamilyUser(userId: string, familyId: string) {
  return prisma.user.findFirst({
    where: { id: userId, familyId },
    select: { id: true, familyRole: true },
  });
}

function parseDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await getCurrentFamilyUser(session.user.id, familyId);
  if (!currentUser || currentUser.familyRole !== "OWNER") {
    return NextResponse.json({ error: "Only owner can update subscriptions" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.familySubscription.findFirst({
    where: { id, familyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  const category = typeof body.category === "string" ? body.category.trim() : undefined;
  const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : undefined;
  const note = typeof body.note === "string" ? body.note.trim() : undefined;
  const billingCycle = body.billingCycle ? (String(body.billingCycle) as SubscriptionBillingCycle) : undefined;
  const status = body.status ? (String(body.status) as SubscriptionStatus) : undefined;
  const amount = body.amount !== undefined ? Number(body.amount) : undefined;
  const nextBillingDate = body.nextBillingDate !== undefined ? parseDate(body.nextBillingDate) : undefined;
  const trialEndsAt = body.trialEndsAt !== undefined ? (body.trialEndsAt ? parseDate(body.trialEndsAt) : null) : undefined;
  const ownerUserId = body.ownerUserId !== undefined ? (body.ownerUserId ? String(body.ownerUserId) : null) : undefined;
  const memberUserIds: string[] | undefined =
    body.memberUserIds !== undefined && Array.isArray(body.memberUserIds)
      ? body.memberUserIds.map((item: unknown) => String(item))
      : undefined;
  const payerUserId = body.payerUserId !== undefined ? (body.payerUserId ? String(body.payerUserId) : null) : undefined;

  if (title !== undefined && !title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (billingCycle && !billingCycles.has(billingCycle)) return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
  if (status && !statuses.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }
  if (body.nextBillingDate !== undefined && !nextBillingDate) {
    return NextResponse.json({ error: "Invalid next billing date" }, { status: 400 });
  }
  if (body.trialEndsAt !== undefined && body.trialEndsAt && !trialEndsAt) {
    return NextResponse.json({ error: "Invalid trial end date" }, { status: 400 });
  }

  const validFamilyMembers = await prisma.user.findMany({
    where: { familyId },
    select: { id: true },
  });
  const validIds = new Set(validFamilyMembers.map((m) => m.id));

  if (ownerUserId && !validIds.has(ownerUserId)) {
    return NextResponse.json({ error: "Owner user must be from your family" }, { status: 400 });
  }

  let normalizedMembers: string[] | undefined;
  if (memberUserIds) {
    normalizedMembers = Array.from(new Set(memberUserIds.filter((memberId) => validIds.has(memberId))));
  }

  if (payerUserId && !validIds.has(payerUserId)) {
    return NextResponse.json({ error: "Payer must be from your family" }, { status: 400 });
  }

  if (normalizedMembers && payerUserId && !normalizedMembers.includes(payerUserId)) {
    normalizedMembers.push(payerUserId);
  }
  const nextBillingDateValue = nextBillingDate === undefined ? undefined : nextBillingDate || undefined;
  const trialEndsAtValue = trialEndsAt === undefined ? undefined : trialEndsAt || undefined;

  const updated = await prisma.$transaction(async (tx) => {
    if (normalizedMembers) {
      await tx.familySubscriptionMember.deleteMany({ where: { subscriptionId: id } });
      if (normalizedMembers.length) {
        await tx.familySubscriptionMember.createMany({
          data: normalizedMembers.map((userId) => ({
            subscriptionId: id,
            userId,
            role: payerUserId === userId ? SubscriptionMemberRole.PAYER : SubscriptionMemberRole.USER,
          })),
        });
      }
    }

    return tx.familySubscription.update({
      where: { id },
      data: {
        title,
        category: category === undefined ? undefined : category || null,
        currency,
        note: note === undefined ? undefined : note || null,
        billingCycle,
        status,
        amount,
        nextBillingDate: nextBillingDateValue,
        trialEndsAt: trialEndsAtValue,
        ownerUserId,
      },
      include: {
        ownerUser: { select: { id: true, name: true, email: true, color: true, emoji: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, color: true, emoji: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  });

  await syncSubscriptionBillingEvents({
    subscriptionId: updated.id,
    familyId: updated.familyId,
    title: updated.title,
    billingCycle: updated.billingCycle,
    nextBillingDate: updated.nextBillingDate,
    status: updated.status,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await getCurrentFamilyUser(session.user.id, familyId);
  if (!currentUser || currentUser.familyRole !== "OWNER") {
    return NextResponse.json({ error: "Only owner can delete subscriptions" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.familySubscription.findFirst({
    where: { id, familyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

  await clearSubscriptionBillingEvents(id);
  await prisma.familySubscription.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
