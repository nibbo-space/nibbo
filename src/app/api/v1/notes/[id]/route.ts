import { SCOPE_V1_NOTES_WRITE } from "@/lib/api-scopes";
import { handleV1NoteDelete, handleV1NotePatch } from "@/lib/api-v1-note-mutate";
import { resolveV1Context, RateLimitError } from "@/lib/api-v1-context";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveV1Context(req, SCOPE_V1_NOTES_WRITE);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    return handleV1NotePatch(ctx.familyId, id, body);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    throw error;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveV1Context(_req, SCOPE_V1_NOTES_WRITE);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    return handleV1NoteDelete(ctx.familyId, id);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    throw error;
  }
}
