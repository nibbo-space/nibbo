import { SCOPE_V1_READ } from "@/lib/api-scopes";
import { resolveV1Context, RateLimitError } from "@/lib/api-v1-context";
import { handleMcpReadResourceGet } from "@/lib/mcp-read-resource-response";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, ctx: { params: Promise<{ resource: string }> }) {
  try {
    const v1 = await resolveV1Context(req, SCOPE_V1_READ);
    if (!v1) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { resource } = await ctx.params;
    return handleMcpReadResourceGet(req, v1.familyId, v1.userId, resource);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    throw error;
  }
}
