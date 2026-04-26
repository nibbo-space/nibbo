import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { shoppingItemsVisibleWhere, shoppingListVisibleWhere } from "@/lib/family-private-scope";

export const GET = withMobileAuth(async (_req, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const lists = await prisma.shoppingList.findMany({
    where: shoppingListVisibleWhere(familyId, ctx.userId),
    include: {
      items: {
        where: shoppingItemsVisibleWhere(ctx.userId),
        include: {
          addedBy: { select: { id: true, name: true, image: true, color: true, emoji: true } },
        },
        orderBy: [{ checked: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ items: lists });
});

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (body.type === "list") {
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "LIST_NAME_REQUIRED" }, { status: 400 });
    const isPrivate = Boolean(body.isPrivate);
    const list = await prisma.$transaction(async (tx) => {
      await tx.shoppingList.updateMany({
        where: { familyId },
        data: { sortOrder: { increment: 1 } },
      });
      return tx.shoppingList.create({
        data: {
          name,
          emoji: String(body.emoji || "🛒"),
          familyId,
          sortOrder: 0,
          isPrivate,
          ownerUserId: isPrivate ? ctx.userId : null,
        },
        include: { items: true },
      });
    });
    return NextResponse.json(list, { status: 201 });
  }

  const listId = String(body.listId || "").trim();
  const name = String(body.name || "").trim();
  if (!listId || !name) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, ...shoppingListVisibleWhere(familyId, ctx.userId) },
    select: { id: true },
  });
  if (!list) return NextResponse.json({ error: "LIST_NOT_FOUND" }, { status: 404 });

  const item = await prisma.shoppingItem.create({
    data: {
      name,
      quantity: body.quantity ? String(body.quantity) : null,
      unit: body.unit ? String(body.unit) : null,
      category: body.category ? String(body.category) : null,
      listId,
      addedById: ctx.userId,
      isPrivate: Boolean(body.isPrivate),
    },
    include: {
      addedBy: { select: { id: true, name: true, image: true, color: true, emoji: true } },
    },
  });

  return NextResponse.json(item, { status: 201 });
});
