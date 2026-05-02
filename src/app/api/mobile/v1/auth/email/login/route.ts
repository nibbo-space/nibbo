import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueMobileTokens } from "@/lib/auth-mobile/jwt";
import { mobileAuthEmailLoginRequestSchema } from "@/lib/contracts/mobile/auth";

export const runtime = "nodejs";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  image: true,
  familyId: true,
  onboardingCompletedAt: true,
} as const;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = mobileAuthEmailLoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { ...USER_SELECT, passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const tokens = await issueMobileTokens(user.id);
  const { passwordHash: _ph, ...userWithoutHash } = user;

  return NextResponse.json({ user: userWithoutHash, ...tokens });
}
