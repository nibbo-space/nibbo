import { auth } from "@/lib/auth";
import {
  catalogDbUpsertDataFromRecord,
  prismaFamilyCatalogToRecord,
} from "@/lib/family-ingredient-catalog";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import {
  nutritionFillScore,
  parseIngredientFromClient,
  type RecipeIngredientRecord,
} from "@/lib/recipe-ingredients";
import { NextRequest, NextResponse } from "next/server";

function pickRichestRecord(candidates: RecipeIngredientRecord[]): RecipeIngredientRecord {
  return candidates.reduce((a, b) => (nutritionFillScore(b) > nutritionFillScore(a) ? b : a));
}

export async function GET() {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.familyIngredientCatalog.findMany({
    where: { familyId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(rows.map(prismaFamilyCatalogToRecord));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json();
  const payload = parseIngredientFromClient(raw);
  if (!payload) return NextResponse.json({ error: "Invalid ingredient" }, { status: 400 });

  const newKey = payload.name.trim().toLowerCase();
  if (!newKey) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const incoming: RecipeIngredientRecord = {
    id: "",
    name: payload.name,
    amount: payload.amount,
    unit: payload.unit,
    referenceAmount: payload.referenceAmount,
    referenceUnit: payload.referenceUnit,
    protein: payload.protein,
    fat: payload.fat,
    saturatedFat: payload.saturatedFat,
    carbs: payload.carbs,
    sugar: payload.sugar,
    salt: payload.salt,
    kcal: payload.kcal,
  };

  const existing = await prisma.familyIngredientCatalog.findUnique({
    where: { familyId_nameKey: { familyId, nameKey: newKey } },
  });

  const winner = existing
    ? pickRichestRecord([incoming, prismaFamilyCatalogToRecord(existing)])
    : incoming;

  const data = catalogDbUpsertDataFromRecord(newKey, winner);

  const row = await prisma.familyIngredientCatalog.upsert({
    where: { familyId_nameKey: { familyId, nameKey: newKey } },
    create: { familyId, ...data },
    update: {
      name: data.name,
      amount: data.amount,
      unit: data.unit,
      referenceAmount: data.referenceAmount,
      referenceUnit: data.referenceUnit,
      protein: data.protein,
      fat: data.fat,
      saturatedFat: data.saturatedFat,
      carbs: data.carbs,
      sugar: data.sugar,
      salt: data.salt,
      kcal: data.kcal,
    },
  });

  return NextResponse.json(prismaFamilyCatalogToRecord(row));
}

/** Sync family pantry row after catalog edit (recipes may also have been updated). */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    previousNameKey?: string | null;
    ingredient?: unknown;
  };
  const payload = parseIngredientFromClient(body.ingredient);
  if (!payload) return NextResponse.json({ error: "Invalid ingredient" }, { status: 400 });

  const newKey = payload.name.trim().toLowerCase();
  if (!newKey) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const incoming: RecipeIngredientRecord = {
    id: "",
    name: payload.name,
    amount: payload.amount,
    unit: payload.unit,
    referenceAmount: payload.referenceAmount,
    referenceUnit: payload.referenceUnit,
    protein: payload.protein,
    fat: payload.fat,
    saturatedFat: payload.saturatedFat,
    carbs: payload.carbs,
    sugar: payload.sugar,
    salt: payload.salt,
    kcal: payload.kcal,
  };

  const prevKey = (body.previousNameKey ?? "").trim().toLowerCase() || null;

  const keysToLoad = new Set<string>([newKey]);
  if (prevKey && prevKey !== newKey) keysToLoad.add(prevKey);

  const existingRows = await prisma.familyIngredientCatalog.findMany({
    where: { familyId, nameKey: { in: [...keysToLoad] } },
  });

  const candidates: RecipeIngredientRecord[] = [incoming];
  for (const row of existingRows) {
    candidates.push(prismaFamilyCatalogToRecord(row));
  }

  const winner = pickRichestRecord(candidates);
  const data = catalogDbUpsertDataFromRecord(newKey, winner);

  await prisma.$transaction(async (tx) => {
    const clearKeys = [...keysToLoad];
    await tx.familyIngredientCatalog.deleteMany({
      where: { familyId, nameKey: { in: clearKeys } },
    });
    await tx.familyIngredientCatalog.create({
      data: { familyId, ...data },
    });
  });

  const created = await prisma.familyIngredientCatalog.findUniqueOrThrow({
    where: { familyId_nameKey: { familyId, nameKey: newKey } },
  });

  return NextResponse.json(prismaFamilyCatalogToRecord(created));
}
