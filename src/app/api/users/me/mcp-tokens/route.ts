import { auth } from "@/lib/auth";
import {
  parseTokenCreateMode,
  TOKEN_MODE_SCOPES,
  type TokenCreateMode,
} from "@/lib/api-scopes";
import { generateMcpReadTokenPlain, hashMcpReadToken } from "@/lib/mcp-token-hash";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.mcpReadToken.findMany({
    where: { userId: session.user.id, revokedAt: null },
    select: { id: true, createdAt: true, scopes: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tokens: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let mode: TokenCreateMode = "mcp_read";
  try {
    const body = (await req.json()) as { mode?: unknown };
    mode = parseTokenCreateMode(body.mode);
  } catch {
    mode = "mcp_read";
  }

  if (mode !== "mcp_read") {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { personalApiEnabled: true },
    });
    if (!u?.personalApiEnabled) {
      return NextResponse.json({ error: "Personal API is disabled" }, { status: 403 });
    }
  }

  const scopes = [...TOKEN_MODE_SCOPES[mode]];
  const plain = generateMcpReadTokenPlain();
  const tokenHash = hashMcpReadToken(plain);

  const row = await prisma.mcpReadToken.create({
    data: { userId: session.user.id, tokenHash, scopes },
    select: { id: true, createdAt: true, scopes: true },
  });

  return NextResponse.json({
    id: row.id,
    token: plain,
    createdAt: row.createdAt.toISOString(),
    scopes: row.scopes,
  });
}
