import { auth } from "@/lib/auth";
import { shoppingItemsVisibleWhere, shoppingListVisibleWhere } from "@/lib/family-private-scope";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const lists = await prisma.shoppingList.findMany({
    where: shoppingListVisibleWhere(familyId, userId),
    include: {
      items: {
        where: shoppingItemsVisibleWhere(userId),
        include: {
          addedBy: { select: { id: true, name: true, image: true, color: true, emoji: true } },
        },
        orderBy: [{ checked: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();

  if (body.type === "list") {
    const isPrivate = Boolean(body.isPrivate);
    const list = await prisma.$transaction(async (tx) => {
      await tx.shoppingList.updateMany({
        where: { familyId },
        data: { sortOrder: { increment: 1 } },
      });
      return tx.shoppingList.create({
        data: {
          name: body.name,
          emoji: body.emoji || "🛒",
          familyId,
          sortOrder: 0,
          isPrivate,
          ownerUserId: isPrivate ? userId : null,
        },
        include: { items: true },
      });
    });
    return NextResponse.json(list);
  }

  const list = await prisma.shoppingList.findFirst({
    where: { id: body.listId, ...shoppingListVisibleWhere(familyId, userId) },
    select: { id: true },
  });
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  const item = await prisma.shoppingItem.create({
    data: {
      name: body.name,
      quantity: body.quantity,
      unit: body.unit,
      category: body.category,
      listId: body.listId,
      addedById: session.user.id,
      isPrivate: Boolean(body.isPrivate),
    },
    include: {
      addedBy: { select: { id: true, name: true, image: true, color: true, emoji: true } },
    },
  });

  return NextResponse.json(item);
}
