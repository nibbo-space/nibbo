/** Shared recipe ingredient shape (API / Prisma) */

export type RecipeIngredientRecord = {
  id: string;
  name: string;
  amount: string;
  unit: string | null;
  referenceAmount: string | null;
  referenceUnit: string | null;
  protein: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbs: number | null;
  sugar: number | null;
  salt: number | null;
  kcal: number | null;
};

export type IngredientFormRow = {
  name: string;
  amount: string;
  unit: string;
  referenceAmount: string;
  referenceUnit: string;
  kcal: string;
  protein: string;
  fat: string;
  saturatedFat: string;
  carbs: string;
  sugar: string;
  salt: string;
};

export function emptyIngredientFormRow(): IngredientFormRow {
  return {
    name: "",
    amount: "",
    unit: "",
    referenceAmount: "",
    referenceUnit: "",
    kcal: "",
    protein: "",
    fat: "",
    saturatedFat: "",
    carbs: "",
    sugar: "",
    salt: "",
  };
}

function numToForm(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return String(n);
}

export function recipeIngredientToFormRow(i: RecipeIngredientRecord): IngredientFormRow {
  return {
    name: i.name,
    amount: i.amount,
    unit: i.unit ?? "",
    referenceAmount: i.referenceAmount ?? "",
    referenceUnit: i.referenceUnit ?? "",
    kcal: numToForm(i.kcal),
    protein: numToForm(i.protein),
    fat: numToForm(i.fat),
    saturatedFat: numToForm(i.saturatedFat),
    carbs: numToForm(i.carbs),
    sugar: numToForm(i.sugar),
    salt: numToForm(i.salt),
  };
}

export function parseOptionalMacro(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Payload for Prisma nested create / API body */
export type RecipeIngredientCreatePayload = {
  name: string;
  amount: string;
  unit: string | null;
  referenceAmount: string | null;
  referenceUnit: string | null;
  protein: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbs: number | null;
  sugar: number | null;
  salt: number | null;
  kcal: number | null;
};

export function formRowToApiPayload(row: IngredientFormRow): RecipeIngredientCreatePayload {
  return {
    name: row.name.trim(),
    amount: row.amount.trim(),
    unit: row.unit.trim() ? row.unit.trim() : null,
    referenceAmount: row.referenceAmount.trim() ? row.referenceAmount.trim() : null,
    referenceUnit: row.referenceUnit.trim() ? row.referenceUnit.trim() : null,
    protein: parseOptionalMacro(row.protein),
    fat: parseOptionalMacro(row.fat),
    saturatedFat: parseOptionalMacro(row.saturatedFat),
    carbs: parseOptionalMacro(row.carbs),
    sugar: parseOptionalMacro(row.sugar),
    salt: parseOptionalMacro(row.salt),
    kcal: parseOptionalMacro(row.kcal),
  };
}

/** Parse one ingredient from PATCH/POST JSON (tolerates missing new fields). */
export function nutritionFillScore(i: RecipeIngredientRecord): number {
  let s = 0;
  if ((i.referenceAmount ?? "").trim() || (i.referenceUnit ?? "").trim()) s += 2;
  if (i.kcal != null && Number.isFinite(i.kcal)) s += 2;
  for (const k of ["protein", "fat", "saturatedFat", "carbs", "sugar", "salt"] as const) {
    const v = i[k];
    if (v != null && Number.isFinite(v)) s += 2;
  }
  return s;
}

/** One entry per ingredient name (best-effort: row with most nutrition fields filled). */
export function collectCatalogIngredientsByName(
  recipes: { ingredients: RecipeIngredientRecord[] }[],
): RecipeIngredientRecord[] {
  const map = new Map<string, RecipeIngredientRecord>();
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      const k = ing.name.trim().toLowerCase();
      if (!k) continue;
      const prev = map.get(k);
      if (!prev || nutritionFillScore(ing) > nutritionFillScore(prev)) map.set(k, ing);
    }
  }
  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/** Merge family pantry catalog rows with recipe ingredients (per nameKey, richer nutrition wins). */
export function mergeRecipeAndFamilyCatalog(
  recipes: { ingredients: RecipeIngredientRecord[] }[],
  familyCatalog: RecipeIngredientRecord[],
): RecipeIngredientRecord[] {
  const map = new Map<string, RecipeIngredientRecord>();
  for (const ing of familyCatalog) {
    const k = ing.name.trim().toLowerCase();
    if (!k) continue;
    map.set(k, ing);
  }
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      const k = ing.name.trim().toLowerCase();
      if (!k) continue;
      const prev = map.get(k);
      if (!prev || nutritionFillScore(ing) > nutritionFillScore(prev)) map.set(k, ing);
    }
  }
  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function formatCatalogIngredientCopyLine(i: RecipeIngredientRecord): string {
  const base = `${i.name.trim()} — ${i.amount}${i.unit ? ` ${i.unit}` : ""}`.trim();
  const refParts = [i.referenceAmount?.trim(), i.referenceUnit?.trim()].filter(Boolean);
  const ref = refParts.length ? `\n  ref: ${refParts.join(" ")}` : "";
  const macros: string[] = [];
  const push = (label: string, v: number | null | undefined) => {
    if (v != null && Number.isFinite(v)) macros.push(`${label}: ${v}`);
  };
  push("kcal", i.kcal);
  push("P", i.protein);
  push("F", i.fat);
  push("SatF", i.saturatedFat);
  push("C", i.carbs);
  push("Sug", i.sugar);
  push("Salt", i.salt);
  const m = macros.length ? `\n  ${macros.join(", ")}` : "";
  return base + ref + m;
}

export function parseIngredientFromClient(raw: unknown): RecipeIngredientCreatePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = String(r.name ?? "").trim();
  const amount = String(r.amount ?? "").trim();
  if (!name) return null;
  const unit = r.unit == null || String(r.unit).trim() === "" ? null : String(r.unit).trim();
  const referenceAmount =
    r.referenceAmount == null || String(r.referenceAmount).trim() === ""
      ? null
      : String(r.referenceAmount).trim();
  const referenceUnit =
    r.referenceUnit == null || String(r.referenceUnit).trim() === ""
      ? null
      : String(r.referenceUnit).trim();
  const num = (k: string) => {
    const v = r[k];
    if (v == null || v === "") return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") return parseOptionalMacro(v);
    return null;
  };
  return {
    name,
    amount,
    unit,
    referenceAmount,
    referenceUnit,
    protein: num("protein"),
    fat: num("fat"),
    saturatedFat: num("saturatedFat"),
    carbs: num("carbs"),
    sugar: num("sugar"),
    salt: num("salt"),
    kcal: num("kcal"),
  };
}
