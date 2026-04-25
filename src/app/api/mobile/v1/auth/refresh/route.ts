import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueMobileTokens, verifyMobileRefreshToken } from "@/lib/auth-mobile/jwt";
import { mobileAuthRefreshRequestSchema } from "@/lib/contracts/mobile/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = mobileAuthRefreshRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 });
  }
  const token = parsed.data.refreshToken.trim();
  if (!token) return NextResponse.json({ error: "REFRESH_TOKEN_REQUIRED" }, { status: 400 });

  let userId: string;
  try {
    const payload = await verifyMobileRefreshToken(token);
    userId = payload.sub;
  } catch {
    return NextResponse.json({ error: "INVALID_REFRESH_TOKEN" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 401 });

  const tokens = await issueMobileTokens(userId);
  return NextResponse.json(tokens);
}
