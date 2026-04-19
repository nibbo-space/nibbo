import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "recipe") {
    const exists = await prisma.recipe.findFirst({
      where: { id, familyId },
      select: { id: true },
    });
    if (!exists)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data: {
      name?: string;
      description?: string | null;
      emoji?: string;
      prepTime?: number | null;
      cookTime?: number | null;
      calories?: number | null;
      servings?: number;
      category?: string;
      imageUrl?: string | null;
      ingredients?: {
        deleteMany: Record<string, never>;
        create: { name: string; amount: string; unit?: string | null }[];
      };
    } = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.emoji !== undefined) data.emoji = body.emoji;
    if (body.prepTime !== undefined) data.prepTime = body.prepTime;
    if (body.cookTime !== undefined) data.cookTime = body.cookTime;
    if (body.calories !== undefined) data.calories = body.calories;
    if (body.servings !== undefined) data.servings = body.servings;
    if (body.category !== undefined) data.category = body.category;
    if (body.imageUrl !== undefined) {
      data.imageUrl =
        body.imageUrl === null || body.imageUrl === ""
          ? null
          : String(body.imageUrl);
    }
    if (Array.isArray(body.ingredients)) {
      data.ingredients = {
        deleteMany: {},
        create: body.ingredients.map(
          (i: { name: string; amount: string; unit?: string | null }) => ({
            name: i.name,
            amount: i.amount,
            unit: i.unit ?? null,
          }),
        ),
      };
    }

    const recipe = await prisma.recipe.update({
      where: { id },
      data,
      include: { ingredients: true },
    });
    return NextResponse.json(recipe);
  }

  const planExists = await prisma.mealPlan.findFirst({
    where: { id, familyId },
    select: { id: true },
  });
  if (!planExists)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.recipeId) {
    const recipeExists = await prisma.recipe.findFirst({
      where: { id: body.recipeId, familyId },
      select: { id: true },
    });
    if (!recipeExists)
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }
  if (body.cookId) {
    const cookExists = await prisma.user.findFirst({
      where: { id: body.cookId, familyId },
      select: { id: true },
    });
    if (!cookExists)
      return NextResponse.json({ error: "Cook not found" }, { status: 404 });
  }
  if (Array.isArray(body.eaterIds)) {
    const eaterIds = body.eaterIds.filter((x: unknown) => typeof x === "string");
    for (const uid of eaterIds) {
      const m = await prisma.user.findFirst({
        where: { id: uid, familyId },
        select: { id: true },
      });
      if (!m) return NextResponse.json({ error: "Eater not found" }, { status: 404 });
    }
  }
  const portionRaw = body.portionCount;
  const portionCount =
    typeof portionRaw === "number" && Number.isFinite(portionRaw) && portionRaw > 0
      ? portionRaw
      : undefined;

  const plan = await prisma.mealPlan.update({
    where: { id },
    data: {
      recipeId: body.recipeId || undefined,
      cookId: body.cookId || undefined,
      note: body.note,
      ...(portionCount !== undefined ? { portionCount } : {}),
      ...(Array.isArray(body.eaterIds)
        ? {
            eaterIds: body.eaterIds.filter((x: unknown) => typeof x === "string"),
          }
        : {}),
    },
    include: {
      recipe: { include: { ingredients: true } },
      cook: {
        select: { id: true, name: true, image: true, color: true, emoji: true },
      },
    },
  });

  return NextResponse.json(plan);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "recipe") {
    await prisma.mealPlan.updateMany({
      where: { familyId, recipeId: id },
      data: { recipeId: null },
    });
    const exists = await prisma.recipe.findFirst({
      where: { id, familyId },
      select: { id: true },
    });
    if (!exists)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.recipe.delete({ where: { id } });
  } else {
    const exists = await prisma.mealPlan.findFirst({
      where: { id, familyId },
      select: { id: true },
    });
    if (!exists)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.mealPlan.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
