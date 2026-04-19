import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hashMcpReadToken } from "@/lib/mcp-token-hash";
import { normalizeTokenScopes, tokenHasScope } from "@/lib/api-scopes";
import { checkV1RateLimit } from "@/lib/api-v1-rate-limit";

export type ApiV1Context = {
  userId: string;
  familyId: string;
  scopes: string[];
};

export class RateLimitError extends Error {
  constructor() {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
  }
}

function bearerToken(request: Request): string | null {
  const raw = request.headers.get("authorization");
  if (!raw || !raw.startsWith("Bearer ")) return null;
  const t = raw.slice(7).trim();
  return t.length > 0 ? t : null;
}

export async function resolveV1Context(
  request: Request,
  requiredScope: string
): Promise<ApiV1Context | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const tokenHash = hashMcpReadToken(token);

  if (!checkV1RateLimit(tokenHash)) {
    throw new RateLimitError();
  }

  const row = await prisma.mcpReadToken.findFirst({
    where: { tokenHash, revokedAt: null },
    select: { userId: true, scopes: true },
  });
  if (!row) return null;

  const scopes = normalizeTokenScopes(row.scopes);
  if (!tokenHasScope(scopes, requiredScope)) return null;

  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    select: { personalApiEnabled: true },
  });
  if (!user?.personalApiEnabled) return null;

  const familyId = await ensureUserFamily(row.userId);
  if (!familyId) return null;

  return { userId: row.userId, familyId, scopes };
}
