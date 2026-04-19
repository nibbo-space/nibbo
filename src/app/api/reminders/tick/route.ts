import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { processMedicationTicksForUser } from "@/lib/medication-reminder-tick";
import { processReminderTicksForUser } from "@/lib/task-reminder-tick";
import { NextResponse } from "next/server";

export async function POST() {
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
  await processReminderTicksForUser(session.user.id, familyId, tz, now);
  return NextResponse.json({ ok: true });
}
