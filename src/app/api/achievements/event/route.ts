import { applyMascotBlobTapEvent, applyUserCounterIncrement } from "@/lib/achievements/evaluate";
import { achievementEventRateOk } from "@/lib/achievements/rate-limit";
import { BUDDY_CHAT_COUNTER_KEY } from "@/lib/achievements/registry";
import { auth } from "@/lib/auth";
import { completeFamilyBattle } from "@/lib/family-battle-session";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!achievementEventRateOk(session.user.id)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const type = typeof body === "object" && body !== null && "type" in body ? String((body as { type: unknown }).type) : "";
  if (type === "mascot_blob_tap") {
    const rawCount =
      typeof body === "object" && body !== null && "count" in body ? Number((body as { count: unknown }).count) : 1;
    const count = Math.min(15, Math.max(1, Math.floor(Number.isFinite(rawCount) ? rawCount : 1)));
    const { newUnlockIds, value } = await applyMascotBlobTapEvent(session.user.id, count);
    return NextResponse.json({ newUnlockIds, value });
  }
  if (type === "buddy_chat_turn") {
    const { newUnlockIds, value } = await applyUserCounterIncrement(
      session.user.id,
      BUDDY_CHAT_COUNTER_KEY,
      1,
      1
    );
    return NextResponse.json({ newUnlockIds, value });
  }
  if (type === "family_battle_complete") {
    const battleId =
      typeof body === "object" && body !== null && "battleId" in body
        ? String((body as { battleId: unknown }).battleId).trim()
        : "";
    const rawOutcome =
      typeof body === "object" && body !== null && "outcome" in body
        ? String((body as { outcome: unknown }).outcome).toLowerCase()
        : "";
    const outcome = rawOutcome === "win" ? "win" : rawOutcome === "loss" ? "loss" : null;
    if (!battleId || !outcome) {
      return NextResponse.json({ error: "Invalid battle" }, { status: 400 });
    }
    const result = await completeFamilyBattle(session.user.id, battleId, outcome);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      displayXp: result.displayXp,
      newUnlockIds: result.newUnlockIds,
    });
  }
  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
