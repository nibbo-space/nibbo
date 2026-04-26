import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { processMedicationTicksForUser } from "@/lib/medication-reminder-tick";
import { parseMedicationPayload } from "@/lib/medications/parse-payload";
import { prisma } from "@/lib/prisma";
import { kyivCalendarYmd } from "@/lib/kyiv-range";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tz = session.user.timeZone || "Europe/Kyiv";
  const now = new Date();
  await processMedicationTicksForUser(session.user.id, familyId, tz, now);
  const todayYmd = kyivCalendarYmd(now, tz);
  const rows = await prisma.medication.findMany({
    where: { userId: session.user.id, familyId },
    include: {
      intakes: {
        where: { dateYmd: todayYmd },
        select: { slotIndex: true, taken: true, takenAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    todayYmd,
    timeZone: tz,
    items: rows.map((m) => ({
      id: m.id,
      name: m.name,
      startYmd: m.intervalAnchorYmd ?? kyivCalendarYmd(m.createdAt, tz),
      notes: m.notes,
      scheduleMode: m.scheduleMode,
      dailySlotMinutes: m.dailySlotMinutes,
      slotToleranceMin: m.slotToleranceMin,
      intervalDays: m.intervalDays,
      intervalAnchorYmd: m.intervalAnchorYmd,
      intervalWindowStartMin: m.intervalWindowStartMin,
      intervalWindowEndMin: m.intervalWindowEndMin,
      todayIntakes: m.intakes,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const tz = session.user.timeZone || "Europe/Kyiv";
  const parsed = parseMedicationPayload(body, tz, new Date());
  if (!parsed) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const created = await prisma.medication.create({
    data: {
      userId: session.user.id,
      familyId,
      name: parsed.name,
      notes: parsed.notes,
      scheduleMode: parsed.scheduleMode,
      dailySlotMinutes: parsed.dailySlotMinutes,
      slotToleranceMin: parsed.slotToleranceMin,
      intervalDays: parsed.intervalDays,
      intervalAnchorYmd: parsed.intervalAnchorYmd,
      intervalWindowStartMin: parsed.intervalWindowStartMin,
      intervalWindowEndMin: parsed.intervalWindowEndMin,
    },
  });
  return NextResponse.json(created);
}
