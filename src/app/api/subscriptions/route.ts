import { auth } from "@/lib/auth";
import { getNbuExchangeRates } from "@/lib/exchange-rates";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { syncSubscriptionBillingEvents } from "@/lib/subscription-calendar";
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

function toMonthlyAmount(amount: number, billingCycle: SubscriptionBillingCycle) {
  if (billingCycle === "YEARLY") return amount / 12;
  return amount;
}

function toUah(amount: number, currency: string, exchangeRates: Record<string, number>) {
  const rate = exchangeRates[currency] ?? 1;
  return amount * rate;
}

function parseDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await getCurrentFamilyUser(session.user.id, familyId);
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const status = searchParams.get("status");
  const billingCycle = searchParams.get("billingCycle");
  const upcomingOnly = searchParams.get("upcomingOnly") === "1";
  const upcomingDays = Number(searchParams.get("upcomingDays") || 7);

  const where = {
    familyId,
    status: status && statuses.has(status as SubscriptionStatus) ? (status as SubscriptionStatus) : undefined,
    billingCycle:
      billingCycle && billingCycles.has(billingCycle as SubscriptionBillingCycle)
        ? (billingCycle as SubscriptionBillingCycle)
        : undefined,
    nextBillingDate: upcomingOnly
      ? {
          gte: new Date(),
          lte: new Date(Date.now() + Math.max(1, Math.min(upcomingDays, 365)) * 24 * 60 * 60 * 1000),
        }
      : undefined,
    members: memberId
      ? {
          some: {
            userId: memberId,
          },
        }
      : undefined,
  };

  const [items, members, exchangeRates] = await Promise.all([
    prisma.familySubscription.findMany({
      where,
      include: {
        ownerUser: { select: { id: true, name: true, email: true, color: true, emoji: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, color: true, emoji: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ nextBillingDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({
      where: { familyId },
      select: { id: true, name: true, email: true, color: true, emoji: true, image: true, familyRole: true },
      orderBy: { name: "asc" },
    }),
    getNbuExchangeRates(),
  ]);

  const monthlyTotal = items.reduce((sum, item) => {
    if (item.status !== "ACTIVE") return sum;
    return sum + toUah(toMonthlyAmount(item.amount, item.billingCycle), item.currency, exchangeRates);
  }, 0);

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingCount = items.filter((item) => item.status === "ACTIVE" && item.nextBillingDate >= now && item.nextBillingDate <= in7Days).length;

  return NextResponse.json({
    items,
    members,
    currentUserRole: currentUser.familyRole,
    summary: {
      monthlyTotal,
      activeCount: items.filter((item) => item.status === "ACTIVE").length,
      upcomingCount,
    },
    exchangeRates,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await getCurrentFamilyUser(session.user.id, familyId);
  if (!currentUser || currentUser.familyRole !== "OWNER") {
    return NextResponse.json({ error: "Only owner can create subscriptions" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const title = String(body.title || "").trim();
  const category = String(body.category || "").trim();
  const currency = String(body.currency || "UAH").trim().toUpperCase();
  const note = String(body.note || "").trim();
  const billingCycle = String(body.billingCycle || "MONTHLY") as SubscriptionBillingCycle;
  const status = String(body.status || "ACTIVE") as SubscriptionStatus;
  const amount = Number(body.amount);
  const nextBillingDate = parseDate(body.nextBillingDate);
  const trialEndsAt = body.trialEndsAt ? parseDate(body.trialEndsAt) : null;
  const ownerUserId = body.ownerUserId ? String(body.ownerUserId) : null;
  const memberUserIds: string[] = Array.isArray(body.memberUserIds)
    ? body.memberUserIds.map((id: unknown) => String(id))
    : [];
  const payerUserId = body.payerUserId ? String(body.payerUserId) : null;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!billingCycles.has(billingCycle)) return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
  if (!statuses.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  if (!nextBillingDate) return NextResponse.json({ error: "Next billing date is required" }, { status: 400 });
  if (trialEndsAt && trialEndsAt > nextBillingDate) {
    return NextResponse.json({ error: "Trial end date must be before next billing date" }, { status: 400 });
  }

  const validFamilyMembers = await prisma.user.findMany({
    where: { familyId },
    select: { id: true },
  });
  const validIds = new Set(validFamilyMembers.map((m) => m.id));

  if (ownerUserId && !validIds.has(ownerUserId)) {
    return NextResponse.json({ error: "Owner user must be from your family" }, { status: 400 });
  }

  const normalizedMembers = Array.from(new Set(memberUserIds.filter((id: string) => validIds.has(id))));
  if (payerUserId) {
    if (!validIds.has(payerUserId)) {
      return NextResponse.json({ error: "Payer must be from your family" }, { status: 400 });
    }
    if (!normalizedMembers.includes(payerUserId)) normalizedMembers.push(payerUserId);
  }

  const created = await prisma.familySubscription.create({
    data: {
      title,
      category: category || null,
      billingCycle,
      amount,
      currency,
      nextBillingDate,
      trialEndsAt,
      status,
      note: note || null,
      familyId,
      ownerUserId: ownerUserId || null,
      members: normalizedMembers.length
        ? {
            createMany: {
              data: normalizedMembers.map((userId: string) => ({
                userId,
                role: payerUserId === userId ? SubscriptionMemberRole.PAYER : SubscriptionMemberRole.USER,
              })),
            },
          }
        : undefined,
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

  await syncSubscriptionBillingEvents({
    subscriptionId: created.id,
    familyId: created.familyId,
    title: created.title,
    billingCycle: created.billingCycle,
    nextBillingDate: created.nextBillingDate,
    status: created.status,
  });

  return NextResponse.json(created);
}
