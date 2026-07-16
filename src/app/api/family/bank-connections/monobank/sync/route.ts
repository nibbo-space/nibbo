import { auth } from "@/lib/auth";
import { syncFamilyMonobank } from "@/lib/bank-sync/sync-family";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await prisma.user.findFirst({
    where: { id: session.user.id, familyId, familyRole: "OWNER" },
    select: { id: true },
  });
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const connection = await prisma.bankConnection.findUnique({
    where: { familyId_provider: { familyId, provider: "MONOBANK" } },
  });
  if (!connection) return NextResponse.json({ error: "not_configured" }, { status: 404 });

  const result = await syncFamilyMonobank(connection, { force: true });
  if (result.rateLimited) {
    return NextResponse.json(result, { status: 429 });
  }
  if (result.error && result.error !== "disabled") {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
