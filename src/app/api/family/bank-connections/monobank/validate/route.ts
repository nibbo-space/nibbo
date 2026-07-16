import { auth } from "@/lib/auth";
import {
  defaultSelectableAccountIds,
  fetchMonobankClientInfo,
  MonobankApiError,
} from "@/lib/bank-sync/adapters/monobank";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await prisma.user.findFirst({
    where: { id: session.user.id, familyId, familyRole: "OWNER" },
    select: { id: true },
  });
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json({ error: "token_required" }, { status: 400 });

  try {
    const client = await fetchMonobankClientInfo(token);
    const defaults = defaultSelectableAccountIds(client.accounts);
    return NextResponse.json({
      name: client.name,
      accounts: client.accounts.map((a) => ({
        id: a.id,
        type: a.type,
        currencyCode: a.currencyCode,
        balance: a.balance,
        maskedPan: a.maskedPan,
        iban: a.iban,
        selectedByDefault: defaults.includes(a.id),
      })),
    });
  } catch (err) {
    if (err instanceof MonobankApiError && err.status === 429) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }
}
