import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { syncFamilyCalendarWithGoogle } from "@/lib/google-calendar-sync";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await syncFamilyCalendarWithGoogle(familyId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync_failed";
    if (msg === "SYNC_DISABLED") {
      return NextResponse.json({ error: "sync_disabled" }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
