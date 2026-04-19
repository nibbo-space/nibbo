import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const row = await prisma.mcpReadToken.findFirst({
    where: { id, userId: session.user.id, revokedAt: null },
    select: { id: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.mcpReadToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
