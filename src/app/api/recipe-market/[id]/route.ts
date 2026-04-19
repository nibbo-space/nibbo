import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await isUserAdmin(session.user.id);
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const exists = await prisma.recipeMarket.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const market = await prisma.recipeMarket.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description ?? null,
      emoji: body.emoji ?? "🍽️",
      prepTime: body.prepTime ?? null,
      cookTime: body.cookTime ?? null,
      servings: body.servings ?? 4,
      category: body.category ?? "Обід",
      calories: body.calories ?? null,
      imageUrl: body.imageUrl ?? null,
      ingredients: Array.isArray(body.ingredients)
        ? {
            deleteMany: {},
            create: body.ingredients.map(
              (i: { name: string; amount: string; unit?: string | null }) => ({
                name: i.name,
                amount: i.amount,
                unit: i.unit ?? null,
              }),
            ),
          }
        : undefined,
    },
    include: { ingredients: true },
  });

  return NextResponse.json(market);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await isUserAdmin(session.user.id);
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const exists = await prisma.recipeMarket.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recipeMarket.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
