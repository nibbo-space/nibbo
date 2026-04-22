import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (body.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: body.assigneeId, familyId },
      select: { id: true },
    });
    if (!assignee) return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
  }
  if (body.subscriptionId) {
    const subscription = await prisma.familySubscription.findFirst({
      where: { id: body.subscriptionId, familyId },
      select: { id: true },
    });
    if (!subscription) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  const event = await prisma.event.create({
    data: {
      title: body.title,
      description: body.description,
      emoji: body.emoji || "event",
      color: body.color || "#8b5cf6",
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      allDay: body.allDay || false,
      weeklyRepeat: Boolean(body.weeklyRepeat),
      weeklyDay: body.weeklyRepeat ? Number(body.weeklyDay) : null,
      location: body.location,
      assigneeId: body.assigneeId || undefined,
      subscriptionId: body.subscriptionId || undefined,
      familyId,
    },
    include: {
      assignee: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      subscription: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(event);
}
