import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { prisma } from "@/lib/prisma";

export const POST = withMobileAuth(async (_req: NextRequest, ctx) => {
  try {
    const user = await prisma.user.update({
      where: { id: ctx.userId },
      data: { onboardingCompletedAt: new Date() },
      select: { id: true, onboardingCompletedAt: true },
    });
    return NextResponse.json({ success: true, onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
});
