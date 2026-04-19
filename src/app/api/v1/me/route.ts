import { SCOPE_V1_READ } from "@/lib/api-scopes";
import { resolveV1Context, RateLimitError } from "@/lib/api-v1-context";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const ctx = await resolveV1Context(req, SCOPE_V1_READ);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        color: true,
        emoji: true,
        familyId: true,
        displayCurrency: true,
        timeZone: true,
        personalApiEnabled: true,
        ollamaModel: true,
        ollamaApiKeyEnc: true,
      },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { ollamaApiKeyEnc: _k, ...rest } = user;
    return NextResponse.json({
      ...rest,
      ollamaKeyConfigured: Boolean(user.ollamaApiKeyEnc),
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    throw error;
  }
}
