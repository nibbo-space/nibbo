import { getMcpReadContext } from "@/lib/mcp-read-auth";
import { handleMcpReadResourceGet } from "@/lib/mcp-read-resource-response";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, ctx: { params: Promise<{ resource: string }> }) {
  const mcp = await getMcpReadContext(req);
  if (!mcp) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { familyId, userId } = mcp;

  const { resource } = await ctx.params;
  return handleMcpReadResourceGet(req, familyId, userId, resource);
}
