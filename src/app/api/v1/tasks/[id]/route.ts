import { SCOPE_V1_TASKS_WRITE } from "@/lib/api-scopes";
import { handleV1TaskPatch } from "@/lib/api-v1-task-patch";
import { resolveV1Context, RateLimitError } from "@/lib/api-v1-context";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveV1Context(req, SCOPE_V1_TASKS_WRITE);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    return handleV1TaskPatch(ctx.familyId, ctx.userId, id, body);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    throw error;
  }
}
