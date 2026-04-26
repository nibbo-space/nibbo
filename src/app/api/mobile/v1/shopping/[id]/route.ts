import { NextRequest, NextResponse } from "next/server";
import { withMobileAuthParams } from "@/lib/auth-mobile/middleware";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { shoppingListVisibleWhere } from "@/lib/family-private-scope";
import { awardXp, syncFamilyXpUnlocksFromLedger } from "@/lib/xp-ledger";

type Params = { id: string };

export const PATCH = withMobileAuthParams<Params>(async (req: NextRequest, params, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const type = req.nextUrl.searchParams.get("type");

  if (type === "item") {
    const existing = await prisma.shoppingItem.findFirst({
      where: {
        id: params.id,
        list: shoppingListVisibleWhere(familyId, ctx.userId),
        OR: [{ isPrivate: false }, { isPrivate: true, addedById: ctx.userId }],
      },
      select: { id: true, addedById: true, checked: true },
    });
    if (!existing) return NextResponse.json({ error: "ITEM_NOT_FOUND" }, { status: 404 });

    const data: Parameters<typeof prisma.shoppingItem.update>[0]["data"] = {};
    if (body.checked !== undefined) data.checked = Boolean(body.checked);
    if (body.name !== undefined) data.name = String(body.name);
    if (body.quantity !== undefined) data.quantity = body.quantity ? String(body.quantity) : null;
    if (body.unit !== undefined) data.unit = body.unit ? String(body.unit) : null;
    if (body.isPrivate !== undefined) {
      if (existing.addedById !== ctx.userId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      data.isPrivate = Boolean(body.isPrivate);
    }

    const updated = await prisma.shoppingItem.update({
      where: { id: params.id },
      data,
      include: {
        addedBy: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      },
    });

    let awardedPoints = 0;
    let newAchievementIds: string[] = [];
    if (body.checked === true && existing.checked === false) {
      awardedPoints = await awardXp({
        familyId,
        userId: ctx.userId,
        eventType: "shopping_item_closed",
        sourceType: "shopping_item",
        sourceId: updated.id,
        dedupeKey: `shopping_item_closed:item:${updated.id}`,
      });
      if (awardedPoints > 0) {
        newAchievementIds = await syncFamilyXpUnlocksFromLedger(familyId);
      }
    }

    return NextResponse.json({ ...updated, awardedPoints, newAchievementIds });
  }

  if (type === "list") {
    const list = await prisma.shoppingList.findFirst({
      where: { id: params.id, ...shoppingListVisibleWhere(familyId, ctx.userId) },
      select: { id: true },
    });
    if (!list) return NextResponse.json({ error: "LIST_NOT_FOUND" }, { status: 404 });

    if (!Array.isArray(body.categoryOrder) || body.categoryOrder.some((x) => typeof x !== "string")) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const categoryOrder = body.categoryOrder.map((x) => String(x));
    const updated = await prisma.shoppingList.update({
      where: { id: params.id },
      data: { categoryOrder },
      select: { id: true, categoryOrder: true },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
});

export const DELETE = withMobileAuthParams<Params>(async (req: NextRequest, params, ctx) => {
  const familyId = await ensureUserFamily(ctx.userId);
  if (!familyId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const type = req.nextUrl.searchParams.get("type");

  if (type === "list") {
    const exists = await prisma.shoppingList.findFirst({
      where: { id: params.id, ...shoppingListVisibleWhere(familyId, ctx.userId) },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: "LIST_NOT_FOUND" }, { status: 404 });
    await prisma.shoppingList.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  }

  const exists = await prisma.shoppingItem.findFirst({
    where: {
      id: params.id,
      list: shoppingListVisibleWhere(familyId, ctx.userId),
      OR: [{ isPrivate: false }, { isPrivate: true, addedById: ctx.userId }],
    },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "ITEM_NOT_FOUND" }, { status: 404 });
  await prisma.shoppingItem.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
