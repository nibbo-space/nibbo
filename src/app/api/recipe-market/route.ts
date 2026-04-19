import { getAdminIdByUser, isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const marketRecipes = await prisma.recipeMarket.findMany({
    include: { ingredients: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(marketRecipes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  if (body.type === "import") {
    const familyId = await ensureUserFamily(session.user.id);
    if (!familyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const market = await prisma.recipeMarket.findUnique({
      where: { id: body.marketRecipeId },
      include: { ingredients: true },
    });
    if (!market)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const recipe = await prisma.recipe.create({
      data: {
        name: market.name,
        description: market.description,
        emoji: market.emoji,
        prepTime: market.prepTime,
        cookTime: market.cookTime,
        servings: market.servings,
        category: market.category,
        calories: market.calories,
        imageUrl: market.imageUrl,
        familyId,
        ingredients: {
          create: market.ingredients.map((i) => ({
            name: i.name,
            amount: i.amount,
            unit: i.unit,
          })),
        },
      },
      include: { ingredients: true },
    });

    return NextResponse.json(recipe);
  }

  const isAdmin = await isUserAdmin(session.user.id);
  if (!isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const adminId = await getAdminIdByUser(session.user.id);
  if (!adminId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (body.type === "publish") {
    const familyId = await ensureUserFamily(session.user.id);
    if (!familyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const recipe = await prisma.recipe.findFirst({
      where: { id: body.recipeId, familyId },
      include: { ingredients: true },
    });
    if (!recipe)
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

    const market = await prisma.recipeMarket.create({
      data: {
        name: recipe.name,
        description: recipe.description,
        emoji: recipe.emoji,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        category: recipe.category,
        calories: recipe.calories,
        imageUrl: recipe.imageUrl,
        createdById: adminId,
        ingredients: {
          create: recipe.ingredients.map((i) => ({
            name: i.name,
            amount: i.amount,
            unit: i.unit,
          })),
        },
      },
      include: { ingredients: true },
    });

    return NextResponse.json(market);
  }

  if (body.type === "create") {
    const market = await prisma.recipeMarket.create({
      data: {
        name: body.name,
        description: body.description || null,
        emoji: body.emoji || "🍽️",
        prepTime: body.prepTime ?? null,
        cookTime: body.cookTime ?? null,
        servings: body.servings || 4,
        category: body.category || "Обід",
        calories: body.calories ?? null,
        imageUrl: body.imageUrl || null,
        createdById: adminId,
        ingredients: {
          create: Array.isArray(body.ingredients)
            ? body.ingredients.map(
                (i: {
                  name: string;
                  amount: string;
                  unit?: string | null;
                }) => ({
                  name: i.name,
                  amount: i.amount,
                  unit: i.unit ?? null,
                }),
              )
            : [],
        },
      },
      include: { ingredients: true },
    });
    return NextResponse.json(market);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
