import type { FamilyIngredientCatalog, Ingredient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nutritionFillScore, type RecipeIngredientRecord } from "@/lib/recipe-ingredients";

export function prismaRecipeIngredientToRecord(ing: Ingredient): RecipeIngredientRecord {
  return {
    id: ing.id,
    name: ing.name,
    amount: ing.amount,
    unit: ing.unit,
    referenceAmount: ing.referenceAmount,
    referenceUnit: ing.referenceUnit,
    protein: ing.protein,
    fat: ing.fat,
    saturatedFat: ing.saturatedFat,
    carbs: ing.carbs,
    sugar: ing.sugar,
    salt: ing.salt,
    kcal: ing.kcal,
  };
}

export function prismaFamilyCatalogToRecord(row: FamilyIngredientCatalog): RecipeIngredientRecord {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    unit: row.unit,
    referenceAmount: row.referenceAmount,
    referenceUnit: row.referenceUnit,
    protein: row.protein,
    fat: row.fat,
    saturatedFat: row.saturatedFat,
    carbs: row.carbs,
    sugar: row.sugar,
    salt: row.salt,
    kcal: row.kcal,
  };
}

function pickRicher(a: RecipeIngredientRecord, b: RecipeIngredientRecord): RecipeIngredientRecord {
  return nutritionFillScore(b) > nutritionFillScore(a) ? b : a;
}

export function catalogDbUpsertDataFromRecord(
  nameKey: string,
  winner: RecipeIngredientRecord,
): Omit<FamilyIngredientCatalog, "id" | "createdAt" | "updatedAt" | "familyId"> {
  return {
    nameKey,
    name: winner.name.trim() || winner.name,
    amount: winner.amount.trim(),
    unit: winner.unit,
    referenceAmount: winner.referenceAmount,
    referenceUnit: winner.referenceUnit,
    protein: winner.protein,
    fat: winner.fat,
    saturatedFat: winner.saturatedFat,
    carbs: winner.carbs,
    sugar: winner.sugar,
    salt: winner.salt,
    kcal: winner.kcal,
  };
}

/** Upsert family catalog row from a recipe ingredient (used before recipe delete). */
export async function upsertFamilyCatalogFromRecipeIngredient(
  familyId: string,
  ing: Ingredient,
): Promise<void> {
  const incoming = prismaRecipeIngredientToRecord(ing);
  const nameKey = incoming.name.trim().toLowerCase();
  if (!nameKey) return;

  const existing = await prisma.familyIngredientCatalog.findUnique({
    where: { familyId_nameKey: { familyId, nameKey } },
  });

  const winner = existing
    ? pickRicher(prismaFamilyCatalogToRecord(existing), incoming)
    : incoming;

  const data = catalogDbUpsertDataFromRecord(nameKey, winner);

  await prisma.familyIngredientCatalog.upsert({
    where: { familyId_nameKey: { familyId, nameKey } },
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
}
