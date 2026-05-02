import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  const where: Record<string, unknown> = { familyId };
  if (fromParam || toParam) {
    where.startDate = {
      ...(fromParam ? { gte: new Date(fromParam) } : {}),
      ...(toParam ? { lte: new Date(toParam) } : {}),
    };
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { startDate: "asc" },
    select: {
      id: true, title: true, description: true, emoji: true, color: true,
      startDate: true, endDate: true, allDay: true, weeklyRepeat: true,
      weeklyDay: true, location: true, assigneeId: true,
      assignee: { select: { id: true, name: true, emoji: true } },
    },
  });

  return NextResponse.json({
    items: events.map((e) => ({
      ...e,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate.toISOString(),
    })),
  });
});

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "TITLE_REQUIRED" }, { status: 400 });

  const startDate = body.startDate ? new Date(String(body.startDate)) : new Date();
  const endDate = body.endDate ? new Date(String(body.endDate)) : startDate;

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "INVALID_DATE" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      title,
      description: body.description ? String(body.description) : null,
      emoji: String(body.emoji ?? "📅"),
      color: String(body.color ?? "#8b5cf6"),
      startDate,
      endDate,
      allDay: Boolean(body.allDay),
      weeklyRepeat: Boolean(body.weeklyRepeat),
      weeklyDay: body.weeklyDay != null ? Number(body.weeklyDay) : null,
      location: body.location ? String(body.location) : null,
      assigneeId: body.assigneeId ? String(body.assigneeId) : null,
      familyId,
    },
    select: {
      id: true, title: true, description: true, emoji: true, color: true,
      startDate: true, endDate: true, allDay: true, weeklyRepeat: true,
      weeklyDay: true, location: true, assigneeId: true,
    },
  });

  return NextResponse.json(
    { ...event, startDate: event.startDate.toISOString(), endDate: event.endDate.toISOString() },
    { status: 201 },
  );
});
