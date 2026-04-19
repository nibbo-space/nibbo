export function recipeCaloriesPerServing(calories: number | null | undefined, servings: number | null | undefined) {
  if (calories == null || servings == null || servings <= 0) return null;
  return calories / servings;
}

export function mealLineTotalKcal(
  calories: number | null | undefined,
  servings: number | null | undefined,
  portionCount: number
) {
  const per = recipeCaloriesPerServing(calories, servings);
  if (per == null) return null;
  const portions = Number.isFinite(portionCount) && portionCount > 0 ? portionCount : 1;
  return per * portions;
}

export function mealLineKcalPerEater(
  calories: number | null | undefined,
  servings: number | null | undefined,
  portionCount: number,
  eaterIds: string[]
) {
  const total = mealLineTotalKcal(calories, servings, portionCount);
  if (total == null || eaterIds.length === 0) return null;
  return total / eaterIds.length;
}
