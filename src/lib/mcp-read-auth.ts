import { timingSafeEqual } from "node:crypto";
import { SCOPE_MCP_READ, tokenHasScope } from "@/lib/api-scopes";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hashMcpReadToken } from "@/lib/mcp-token-hash";

export type McpReadContext = { familyId: string; userId: string };

function bearerToken(request: Request): string | null {
  const raw = request.headers.get("authorization");
  if (!raw || !raw.startsWith("Bearer ")) return null;
  const t = raw.slice(7).trim();
  return t.length > 0 ? t : null;
}

function tokenEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function parseMultiTokens(): { userId: string; secret: string }[] | null {
  const raw = process.env.NIBBO_MCP_READ_TOKENS?.trim();
  if (!raw) return null;
  const out: { userId: string; secret: string }[] = [];
  for (const part of raw.split(",")) {
    const entry = part.trim();
    if (!entry) continue;
    const i = entry.indexOf("|");
    if (i <= 0 || i === entry.length - 1) continue;
    const userId = entry.slice(0, i).trim();
    const secret = entry.slice(i + 1).trim();
    if (userId && secret) out.push({ userId, secret });
  }
  return out.length > 0 ? out : null;
}

export async function getMcpReadContext(request: Request): Promise<McpReadContext | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const tokenHash = hashMcpReadToken(token);
  const dbRow = await prisma.mcpReadToken.findFirst({
    where: { tokenHash, revokedAt: null },
    select: { userId: true, scopes: true },
  });
  if (dbRow) {
    if (!tokenHasScope(dbRow.scopes, SCOPE_MCP_READ)) return null;
    const familyId = await ensureUserFamily(dbRow.userId);
    if (!familyId) return null;
    return { familyId, userId: dbRow.userId };
  }

  const pairs = parseMultiTokens();
  if (pairs) {
    for (const { userId, secret } of pairs) {
      if (!tokenEquals(token, secret)) continue;
      const familyId = await ensureUserFamily(userId);
      if (!familyId) return null;
      return { familyId, userId };
    }
    return null;
  }

  return null;
}
