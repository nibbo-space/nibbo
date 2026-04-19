import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { getFamilyDisplayXp } from "@/lib/family-display-xp";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const points = await getFamilyDisplayXp(familyId);
  return NextResponse.json({ points });
}
