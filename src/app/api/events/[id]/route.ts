import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const existing = await prisma.event.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  await prisma.event.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      emoji: body.emoji,
      color: body.color,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      allDay: body.allDay,
      weeklyRepeat: body.weeklyRepeat,
      weeklyDay:
        body.weeklyRepeat === undefined
          ? undefined
          : body.weeklyRepeat
            ? Number(body.weeklyDay)
            : null,
      location: body.location,
      assigneeId: body.assigneeId || undefined,
      subscriptionId: body.subscriptionId || undefined,
    },
  });

  const event = await prisma.event.findFirst({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      subscription: { select: { id: true, title: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.event.findFirst({
    where: { id, familyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
