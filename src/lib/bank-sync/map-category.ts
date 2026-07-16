import { MCC_BUCKET_NAMES, mccToBucket } from "@/lib/bank-sync/defaults/mcc-taxonomy";
import type { BankProvider } from "@prisma/client";

export type CategoryCandidate = { id: string; name: string };

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['ʼ`]/g, "'")
    .replace(/\s+/g, " ");
}

export function matchCategoryByName(
  categories: CategoryCandidate[],
  aliases: string[],
): string | null {
  const normalizedCats = categories.map((c) => ({ id: c.id, name: normalizeName(c.name) }));
  for (const alias of aliases) {
    const a = normalizeName(alias);
    const exact = normalizedCats.find((c) => c.name === a);
    if (exact) return exact.id;
  }
  for (const alias of aliases) {
    const a = normalizeName(alias);
    const partial = normalizedCats.find((c) => c.name.includes(a) || a.includes(c.name));
    if (partial) return partial.id;
  }
  return null;
}

export function resolveCategoryId(params: {
  mcc: number | null;
  learnedByMcc: Map<number, string>;
  categories: CategoryCandidate[];
}): string | null {
  const { mcc, learnedByMcc, categories } = params;
  if (mcc != null && learnedByMcc.has(mcc)) {
    return learnedByMcc.get(mcc) ?? null;
  }
  const bucket = mccToBucket(mcc);
  if (!bucket) return null;
  return matchCategoryByName(categories, MCC_BUCKET_NAMES[bucket]);
}

export function mappingKey(provider: BankProvider, mcc: number): string {
  return `${provider}:${mcc}`;
}
