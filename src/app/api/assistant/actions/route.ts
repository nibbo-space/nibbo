import { auth } from "@/lib/auth";
import { executeAssistantActions } from "@/lib/assistant-actions-execute";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { actions?: unknown };
  try {
    body = (await req.json()) as { actions?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.actions) || body.actions.length === 0) {
    return NextResponse.json({ error: "No actions" }, { status: 400 });
  }

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timeZone: true },
  });
  const { results } = await executeAssistantActions(
    session.user.id,
    familyId,
    body.actions,
    viewer?.timeZone ?? undefined
  );
  return NextResponse.json({ results });
}
