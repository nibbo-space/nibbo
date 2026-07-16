import { auth } from "@/lib/auth";
import {
  defaultSelectableAccountIds,
  fetchMonobankClientInfo,
  MonobankApiError,
} from "@/lib/bank-sync/adapters/monobank";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { encryptUserSecret } from "@/lib/user-secret-crypto";
import { NextRequest, NextResponse } from "next/server";

async function requireOwner(userId: string, familyId: string) {
  return prisma.user.findFirst({
    where: { id: userId, familyId, familyRole: "OWNER" },
    select: { id: true },
  });
}

function publicConnection(row: {
  id: string;
  provider: string;
  enabled: boolean;
  accountIds: string[];
  lastSyncAt: Date | null;
  lastSuccessAt: Date | null;
  lastError: string | null;
  connectedByUserId: string;
  tokenEnc: string;
}) {
  return {
    id: row.id,
    provider: row.provider,
    enabled: row.enabled,
    accountIds: row.accountIds,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
    lastError: row.lastError,
    connectedByUserId: row.connectedByUserId,
    configured: Boolean(row.tokenEnc),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await requireOwner(session.user.id, familyId);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const connections = await prisma.bankConnection.findMany({
    where: { familyId },
    orderBy: { provider: "asc" },
  });

  return NextResponse.json({
    connections: connections.map(publicConnection),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await requireOwner(session.user.id, familyId);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const provider = body.provider === "MONOBANK" ? "MONOBANK" : null;
  if (!provider) return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });

  const clearToken = body.clearToken === true;
  const tokenRaw = typeof body.token === "string" ? body.token.trim() : "";
  const enabled = typeof body.enabled === "boolean" ? body.enabled : undefined;
  const accountIds = Array.isArray(body.accountIds)
    ? body.accountIds.map((id: unknown) => String(id)).filter(Boolean).slice(0, 20)
    : undefined;

  const existing = await prisma.bankConnection.findUnique({
    where: { familyId_provider: { familyId, provider } },
  });

  if (clearToken) {
    if (existing) {
      await prisma.bankConnection.delete({ where: { id: existing.id } });
    }
    return NextResponse.json({ connections: [] });
  }

  let tokenEnc = existing?.tokenEnc;
  let resolvedAccountIds = accountIds ?? existing?.accountIds ?? [];

  if (tokenRaw) {
    try {
      const client = await fetchMonobankClientInfo(tokenRaw);
      tokenEnc = encryptUserSecret(tokenRaw);
      if (!accountIds) {
        resolvedAccountIds = defaultSelectableAccountIds(client.accounts);
      } else {
        const allowed = new Set(client.accounts.map((a) => a.id));
        resolvedAccountIds = accountIds.filter((id: string) => allowed.has(id));
      }
    } catch (err) {
      if (err instanceof MonobankApiError && err.status === 429) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }
  }

  if (!tokenEnc) {
    return NextResponse.json({ error: "token_required" }, { status: 400 });
  }

  const row = await prisma.bankConnection.upsert({
    where: { familyId_provider: { familyId, provider } },
    create: {
      familyId,
      provider,
      tokenEnc,
      enabled: enabled ?? false,
      accountIds: resolvedAccountIds,
      connectedByUserId: session.user.id,
      syncFromAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    update: {
      tokenEnc,
      ...(enabled !== undefined ? { enabled } : {}),
      ...(accountIds !== undefined || tokenRaw ? { accountIds: resolvedAccountIds } : {}),
      connectedByUserId: session.user.id,
      lastError: null,
      ...(tokenRaw
        ? { syncFromAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), lastStatementAt: null }
        : {}),
    },
  });

  return NextResponse.json({ connection: publicConnection(row) });
}
