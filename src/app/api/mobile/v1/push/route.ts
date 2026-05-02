import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["android", "ios"]).default("android"),
});

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { token, platform } = parsed.data;

  await prisma.mobilePushToken.upsert({
    where: { token },
    create: { userId: ctx.userId, token, platform },
    update: { userId: ctx.userId, platform, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withMobileAuth(async (req: NextRequest, ctx) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = z.object({ token: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  await prisma.mobilePushToken.deleteMany({
    where: { token: parsed.data.token, userId: ctx.userId },
  });

  return NextResponse.json({ ok: true });
});
