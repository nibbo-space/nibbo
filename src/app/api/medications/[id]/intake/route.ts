import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { awardXp, syncFamilyXpUnlocksFromLedger } from "@/lib/xp-ledger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: medicationId } = await params;
  const med = await prisma.medication.findFirst({
    where: { id: medicationId, userId: session.user.id, familyId },
    select: { id: true, scheduleMode: true, dailySlotMinutes: true },
  });
  if (!med) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: { dateYmd?: string; slotIndex?: number; taken?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const dateYmd = typeof body.dateYmd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dateYmd.trim())
    ? body.dateYmd.trim()
    : null;
  if (!dateYmd) {
    return NextResponse.json({ error: "dateYmd required" }, { status: 400 });
  }
  const slotIndex = typeof body.slotIndex === "number" && Number.isFinite(body.slotIndex) ? Math.floor(body.slotIndex) : 0;
  const taken = Boolean(body.taken);
  if (med.scheduleMode === "DAILY_TIMES") {
    const maxIdx = Math.max(0, med.dailySlotMinutes.length - 1);
    if (slotIndex < 0 || slotIndex > maxIdx) {
      return NextResponse.json({ error: "slotIndex" }, { status: 400 });
    }
  } else if (slotIndex !== 0) {
    return NextResponse.json({ error: "slotIndex" }, { status: 400 });
  }

  const existingIntake = await prisma.medicationIntake.findUnique({
    where: {
      medicationId_dateYmd_slotIndex: { medicationId, dateYmd, slotIndex },
    },
    select: { taken: true },
  });

  const row = await prisma.medicationIntake.upsert({
    where: {
      medicationId_dateYmd_slotIndex: { medicationId, dateYmd, slotIndex },
    },
    create: {
      medicationId,
      dateYmd,
      slotIndex,
      taken,
      takenAt: taken ? new Date() : null,
    },
    update: {
      taken,
      takenAt: taken ? new Date() : null,
    },
  });
  let awardedPoints = 0;
  let newAchievementIds: string[] = [];
  if (taken && !existingIntake?.taken) {
    awardedPoints = await awardXp({
      familyId,
      userId: session.user.id,
      eventType: "medication_taken",
      sourceType: "medication_intake",
      sourceId: row.id,
      dedupeKey: `medication_taken:medication:${medicationId}:date:${dateYmd}:slot:${slotIndex}`,
      createdAt: row.takenAt ?? undefined,
    });
    if (awardedPoints > 0) {
      newAchievementIds = await syncFamilyXpUnlocksFromLedger(familyId);
    }
  }
  return NextResponse.json({ ...row, awardedPoints, newAchievementIds });
}
