import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { parseMedicationPayload } from "@/lib/medications/parse-payload";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.medication.findFirst({
    where: { id, userId: session.user.id, familyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const tz = session.user.timeZone || "Europe/Kyiv";
  const merged: Record<string, unknown> = {
    name: body.name ?? existing.name,
    notes: body.notes !== undefined ? body.notes : existing.notes,
    scheduleMode: body.scheduleMode ?? existing.scheduleMode,
    dailySlotMinutes: body.dailySlotMinutes ?? existing.dailySlotMinutes,
    dailyTimes: body.dailyTimes,
    slotToleranceMin: body.slotToleranceMin ?? existing.slotToleranceMin,
    intervalDays: body.intervalDays ?? existing.intervalDays,
    intervalAnchorYmd: body.intervalAnchorYmd ?? existing.intervalAnchorYmd,
    intervalWindowStartMin: body.intervalWindowStartMin ?? existing.intervalWindowStartMin,
    intervalWindowEndMin: body.intervalWindowEndMin ?? existing.intervalWindowEndMin,
  };
  const parsed = parseMedicationPayload(merged, tz, new Date());
  if (!parsed) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const updated = await prisma.medication.update({
    where: { id },
    data: {
      name: parsed.name,
      notes: parsed.notes,
      scheduleMode: parsed.scheduleMode,
      dailySlotMinutes: parsed.dailySlotMinutes,
      slotToleranceMin: parsed.slotToleranceMin,
      intervalDays: parsed.intervalDays,
      intervalAnchorYmd: parsed.intervalAnchorYmd,
      intervalWindowStartMin: parsed.intervalWindowStartMin,
      intervalWindowEndMin: parsed.intervalWindowEndMin,
      intervalLastFiredYmd: null,
      lastDailyPushJson: Prisma.DbNull,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const result = await prisma.medication.deleteMany({
    where: { id, userId: session.user.id, familyId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
