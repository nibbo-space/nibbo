import MealPlanner from "@/components/menu/MealPlanner";
import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function MenuPage() {
  const session = await auth();
  if (!session) return null;
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return null;

  const [recipes, users, admin] = await Promise.all([
    prisma.recipe.findMany({
      where: { familyId },
      include: { ingredients: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { familyId },
      select: { id: true, name: true, image: true, color: true, emoji: true },
    }),
    isUserAdmin(session.user.id),
  ]);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const mealPlans = await prisma.mealPlan.findMany({
    where: { familyId, date: { gte: weekStart, lte: weekEnd } },
    include: {
      recipe: { include: { ingredients: true } },
      cook: {
        select: { id: true, name: true, image: true, color: true, emoji: true },
      },
    },
  });

  const initialMealPlans = mealPlans.map((m) => ({
    ...m,
    date: m.date.toISOString(),
    portionCount: m.portionCount ?? 1,
    eaterIds: m.eaterIds ?? [],
  }));

  return (
    <MealPlanner
      initialRecipes={recipes}
      initialMealPlans={initialMealPlans}
      users={users}
      currentUserId={session.user.id}
      isAdmin={admin}
    />
  );
}
