import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "recipes") {
    const recipes = await prisma.recipe.findMany({
      where: { familyId },
      include: { ingredients: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(recipes);
  }

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const plans = await prisma.mealPlan.findMany({
    where: {
      familyId,
      date: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    },
    include: {
      recipe: { include: { ingredients: true } },
      cook: {
        select: { id: true, name: true, image: true, color: true, emoji: true },
      },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.type === "recipe") {
    const recipe = await prisma.recipe.create({
      data: {
        name: body.name,
        description: body.description,
        emoji: body.emoji || "🍽️",
        prepTime: body.prepTime,
        cookTime: body.cookTime,
        servings: body.servings || 4,
        category: body.category || "Обід",
        calories: body.calories ?? null,
        familyId,
        imageUrl:
          typeof body.imageUrl === "string" && body.imageUrl.trim()
            ? body.imageUrl.trim()
            : undefined,
        ingredients: {
          create: body.ingredients || [],
        },
      },
      include: { ingredients: true },
    });
    return NextResponse.json(recipe);
  }

  if (body.type === "plan") {
    if (body.recipeId) {
      const recipeExists = await prisma.recipe.findFirst({
        where: { id: body.recipeId, familyId },
        select: { id: true },
      });
      if (!recipeExists)
        return NextResponse.json(
          { error: "Recipe not found" },
          { status: 404 },
        );
    }
    if (body.cookId) {
      const cookExists = await prisma.user.findFirst({
        where: { id: body.cookId, familyId },
        select: { id: true },
      });
      if (!cookExists)
        return NextResponse.json({ error: "Cook not found" }, { status: 404 });
    }
    const eaterIds = Array.isArray(body.eaterIds)
      ? body.eaterIds.filter((x: unknown) => typeof x === "string")
      : [];
    for (const uid of eaterIds) {
      const m = await prisma.user.findFirst({
        where: { id: uid, familyId },
        select: { id: true },
      });
      if (!m) return NextResponse.json({ error: "Eater not found" }, { status: 404 });
    }
    const portionRaw = body.portionCount;
    const portionCount =
      typeof portionRaw === "number" && Number.isFinite(portionRaw) && portionRaw > 0
        ? portionRaw
        : 1;

    const plan = await prisma.mealPlan.create({
      data: {
        date: new Date(body.date),
        mealType: body.mealType,
        recipeId: body.recipeId || undefined,
        cookId: body.cookId || undefined,
        note: body.note,
        portionCount,
        eaterIds,
        familyId,
      },
      include: {
        recipe: { include: { ingredients: true } },
        cook: {
          select: {
            id: true,
            name: true,
            image: true,
            color: true,
            emoji: true,
          },
        },
      },
    });
    return NextResponse.json(plan);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
