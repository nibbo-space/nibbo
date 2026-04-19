import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let niboWelcome = false;
  try {
    const body = (await req.json()) as { niboWelcome?: boolean };
    niboWelcome = Boolean(body.niboWelcome);
  } catch {
    niboWelcome = false;
  }
  try {
    if (niboWelcome) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { niboWelcomeCompletedAt: new Date() },
      });
    } else {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { onboardingCompletedAt: new Date() },
      });
    }
  } catch {
    return NextResponse.json({ error: "Failed to save onboarding state" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
