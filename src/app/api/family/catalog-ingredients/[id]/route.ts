import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const row = await prisma.familyIngredientCatalog.findFirst({
    where: { id, familyId },
    select: { id: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.familyIngredientCatalog.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
