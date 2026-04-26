import { auth } from "@/lib/auth";
import { shoppingItemsVisibleWhere, shoppingListVisibleWhere } from "@/lib/family-private-scope";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { awardXp, syncFamilyXpUnlocksFromLedger } from "@/lib/xp-ledger";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const body = await req.json();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "item") {
    const row = await prisma.shoppingItem.findFirst({
      where: {
        id,
        list: shoppingListVisibleWhere(familyId, userId),
        OR: [{ isPrivate: false }, { isPrivate: true, addedById: userId }],
      },
      select: { id: true, addedById: true, isPrivate: true, checked: true },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data: Parameters<typeof prisma.shoppingItem.update>[0]["data"] = {};
    if (body.checked !== undefined) data.checked = body.checked;
    if (body.name !== undefined) data.name = body.name;
    if (body.quantity !== undefined) data.quantity = body.quantity;
    if (body.unit !== undefined) data.unit = body.unit;
    if (body.isPrivate !== undefined) {
      if (row.addedById !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      data.isPrivate = Boolean(body.isPrivate);
    }
    const item = await prisma.shoppingItem.update({
      where: { id },
      data,
      include: {
        addedBy: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      },
    });
    let awardedPoints = 0;
    let newAchievementIds: string[] = [];
    if (body.checked === true && row.checked === false) {
      awardedPoints = await awardXp({
        familyId,
        userId,
        eventType: "shopping_item_closed",
        sourceType: "shopping_item",
        sourceId: item.id,
        dedupeKey: `shopping_item_closed:item:${item.id}`,
      });
      if (awardedPoints > 0) {
        newAchievementIds = await syncFamilyXpUnlocksFromLedger(familyId);
      }
    }
    return NextResponse.json({ ...item, awardedPoints, newAchievementIds });
  }

  if (type === "list") {
    const listRow = await prisma.shoppingList.findFirst({
      where: { id, ...shoppingListVisibleWhere(familyId, userId) },
      select: { id: true },
    });
    if (!listRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.categoryOrder !== undefined) {
      if (!Array.isArray(body.categoryOrder) || body.categoryOrder.some((x: unknown) => typeof x !== "string")) {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
      }
      const norm = (c: string | null) => (c ?? "").trim();
      const items = await prisma.shoppingItem.findMany({
        where: {
          listId: id,
          list: shoppingListVisibleWhere(familyId, userId),
          OR: [{ isPrivate: false }, { isPrivate: true, addedById: userId }],
        },
        select: { category: true },
      });
      const present = new Set(items.map((i) => norm(i.category)));
      const co = body.categoryOrder as string[];
      if (co.length !== present.size) {
        return NextResponse.json({ error: "Invalid order" }, { status: 400 });
      }
      const coSet = new Set(co);
      if (coSet.size !== co.length) {
        return NextResponse.json({ error: "Invalid order" }, { status: 400 });
      }
      for (const p of present) {
        if (!coSet.has(p)) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
      }
      for (const c of co) {
        if (!present.has(c)) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
      }
      const updated = await prisma.shoppingList.update({
        where: { id },
        data: { categoryOrder: co },
        select: { categoryOrder: true },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "list") {
    const exists = await prisma.shoppingList.findFirst({
      where: { id, ...shoppingListVisibleWhere(familyId, userId) },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.shoppingList.delete({ where: { id } });
  } else {
    const exists = await prisma.shoppingItem.findFirst({
      where: {
        id,
        list: shoppingListVisibleWhere(familyId, userId),
        OR: [{ isPrivate: false }, { isPrivate: true, addedById: userId }],
      },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.shoppingItem.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
