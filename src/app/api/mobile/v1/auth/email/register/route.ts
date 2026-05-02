import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueMobileTokens } from "@/lib/auth-mobile/jwt";
import { mobileAuthEmailRegisterRequestSchema } from "@/lib/contracts/mobile/auth";

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

  const parsed = mobileAuthEmailRegisterRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, name } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "EMAIL_TAKEN" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const created = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name?.trim() ?? null,
      passwordHash,
      emailVerified: null,
    },
    select: USER_SELECT,
  });

  const tokens = await issueMobileTokens(created.id);

  return NextResponse.json({ user: created, ...tokens }, { status: 201 });
}
