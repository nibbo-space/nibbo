import { NextRequest, NextResponse } from "next/server";
import { withMobileAuthParams } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export const PATCH = withMobileAuthParams<{ id: string }>(async (req, { id }, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await prisma.event.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.description === "string") data.description = body.description;
  if (typeof body.emoji === "string") data.emoji = body.emoji;
  if (typeof body.color === "string") data.color = body.color;
  if (typeof body.location === "string") data.location = body.location;
  if (typeof body.allDay === "boolean") data.allDay = body.allDay;
  if (typeof body.weeklyRepeat === "boolean") data.weeklyRepeat = body.weeklyRepeat;
  if (body.weeklyDay != null) data.weeklyDay = Number(body.weeklyDay);
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId ? String(body.assigneeId) : null;
  if (body.startDate) data.startDate = new Date(String(body.startDate));
  if (body.endDate) data.endDate = new Date(String(body.endDate));

  const event = await prisma.event.update({
    where: { id },
    data,
    select: {
      id: true, title: true, description: true, emoji: true, color: true,
      startDate: true, endDate: true, allDay: true, weeklyRepeat: true,
      weeklyDay: true, location: true, assigneeId: true,
    },
  });

  return NextResponse.json({ ...event, startDate: event.startDate.toISOString(), endDate: event.endDate.toISOString() });
});

export const DELETE = withMobileAuthParams<{ id: string }>(async (_req, { id }, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await prisma.event.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
