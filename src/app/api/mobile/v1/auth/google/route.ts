import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueMobileTokens } from "@/lib/auth-mobile/jwt";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { mobileAuthGoogleRequestSchema } from "@/lib/contracts/mobile/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = mobileAuthGoogleRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 });
  }
  const idToken = parsed.data.idToken.trim();
  if (!idToken) {
    return NextResponse.json({ error: "ID_TOKEN_REQUIRED" }, { status: 400 });
  }
  const expectedProjectId = process.env.FIREBASE_PROJECT_ID || "";
  if (!expectedProjectId) {
    return NextResponse.json({ error: "SERVER_NOT_CONFIGURED" }, { status: 500 });
  }

  let payload: {
    sub?: string;
    uid?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    aud?: string;
  };
  try {
    payload = await getFirebaseAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "INVALID_GOOGLE_TOKEN" }, { status: 401 });
  }

  if (payload.aud !== expectedProjectId) {
    return NextResponse.json({ error: "INVALID_GOOGLE_AUDIENCE" }, { status: 401 });
  }

  const googleSub = payload.sub ?? payload.uid;
  if (!googleSub || !payload.email) {
    return NextResponse.json({ error: "MISSING_CLAIMS" }, { status: 401 });
  }
  if (payload.email_verified === false) {
    return NextResponse.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 401 });
  }

  const email = payload.email.toLowerCase();

  let account = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: googleSub,
      },
    },
    select: { userId: true },
  });

  let userId: string;
  if (account) {
    userId = account.userId;
  } else {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      userId = existingUser.id;
      await prisma.account.create({
        data: {
          userId,
          type: "oauth",
          provider: "google",
          providerAccountId: googleSub,
        },
      });
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          name: payload.name ?? null,
          image: payload.picture ?? null,
          emailVerified: payload.email_verified ? new Date() : null,
          accounts: {
            create: {
              type: "oauth",
              provider: "google",
              providerAccountId: googleSub,
            },
          },
        },
        select: { id: true },
      });
      userId = created.id;
    }
  }

  const tokens = await issueMobileTokens(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      familyId: true,
      onboardingCompletedAt: true,
    },
  });

  return NextResponse.json({
    user,
    ...tokens,
  });
}
