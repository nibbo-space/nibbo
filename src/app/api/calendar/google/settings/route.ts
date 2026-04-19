import { auth } from "@/lib/auth";
import { accountHasCalendarScope } from "@/lib/google-calendar";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { enabled?: boolean; calendarId?: string };
  const enabled = Boolean(body.enabled);

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
    select: { scope: true },
  });

  if (enabled) {
    if (!accountHasCalendarScope(account?.scope)) {
      return NextResponse.json({ error: "calendar_scope_required" }, { status: 400 });
    }
    const calId =
      typeof body.calendarId === "string" && body.calendarId.trim().length > 0
        ? body.calendarId.trim()
        : "primary";
    await prisma.family.update({
      where: { id: familyId },
      data: {
        googleCalendarSyncEnabled: true,
        googleCalendarSyncUserId: session.user.id,
        googleCalendarId: calId,
      },
    });
    return NextResponse.json({ ok: true });
  }

  const fam = await prisma.family.findUnique({
    where: { id: familyId },
    select: { googleCalendarSyncUserId: true },
  });
  if (fam?.googleCalendarSyncUserId && fam.googleCalendarSyncUserId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.family.update({
    where: { id: familyId },
    data: {
      googleCalendarSyncEnabled: false,
      googleCalendarSyncUserId: null,
    },
  });
  return NextResponse.json({ ok: true });
}
