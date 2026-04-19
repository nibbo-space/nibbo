import { auth } from "@/lib/auth";
import { shoppingListVisibleWhere } from "@/lib/family-private-scope";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const orderedIds = body?.orderedIds;
  if (!Array.isArray(orderedIds) || orderedIds.some((x: unknown) => typeof x !== "string")) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const existing = await prisma.shoppingList.findMany({
    where: shoppingListVisibleWhere(familyId, userId),
    select: { id: true },
  });
  const idSet = new Set(existing.map((r) => r.id));
  if (orderedIds.length !== idSet.size || orderedIds.some((listId: string) => !idSet.has(listId))) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  await prisma.$transaction(
    orderedIds.map((listId: string, i: number) =>
      prisma.shoppingList.update({ where: { id: listId }, data: { sortOrder: i } })
    )
  );

  return NextResponse.json({ ok: true });
}
