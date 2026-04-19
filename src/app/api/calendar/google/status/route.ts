import { auth } from "@/lib/auth";
import { accountHasCalendarScope } from "@/lib/google-calendar";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [account, family] = await Promise.all([
    prisma.account.findFirst({
      where: { userId: session.user.id, provider: "google" },
      select: { scope: true },
    }),
    prisma.family.findUnique({
      where: { id: familyId },
      select: {
        googleCalendarSyncEnabled: true,
        googleCalendarSyncUserId: true,
        googleCalendarId: true,
        googleCalendarLastSyncAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    googleAccount: Boolean(account),
    hasCalendarScope: accountHasCalendarScope(account?.scope),
    syncEnabled: family?.googleCalendarSyncEnabled ?? false,
    syncUserId: family?.googleCalendarSyncUserId ?? null,
    isSyncUser: family?.googleCalendarSyncUserId === session.user.id,
    calendarId: family?.googleCalendarId ?? "primary",
    lastSyncAt: family?.googleCalendarLastSyncAt?.toISOString() ?? null,
  });
}
