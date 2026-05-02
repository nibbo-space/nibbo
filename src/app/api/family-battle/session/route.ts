import { achievementEventRateOk } from "@/lib/achievements/rate-limit";
import { DEFAULT_TIME_ZONE } from "@/lib/calendar-tz";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { createFamilyBattleRecord } from "@/lib/family-battle-session";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!achievementEventRateOk(session.user.id)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const opponentFamilyId =
    typeof body === "object" && body !== null && "opponentFamilyId" in body
      ? String((body as { opponentFamilyId: unknown }).opponentFamilyId).trim()
      : "";
  if (!opponentFamilyId) {
    return NextResponse.json({ error: "Invalid opponent" }, { status: 400 });
  }

  const created = await createFamilyBattleRecord({
    playerUserId: session.user.id,
    playerFamilyId: familyId,
    opponentFamilyId,
    timeZone: session.user.timeZone || DEFAULT_TIME_ZONE,
  });
  if (!created) {
    return NextResponse.json({ error: "Invalid opponent" }, { status: 400 });
  }

  return NextResponse.json({ battleId: created.id });
}
