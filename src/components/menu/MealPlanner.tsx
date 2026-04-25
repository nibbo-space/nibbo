"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfWeek } from "date-fns";
import { uk, enUS } from "date-fns/locale";
import Link from "next/link";
import { Plus, X, Copy, ClipboardList, ImagePlus, Pencil, Trash2, Eye, UtensilsCrossed, CalendarDays, BookOpen, Flame, Users, ChefHat } from "lucide-react";
import { DEFAULT_RECIPE_EMOJI, MEAL_TYPE_CONFIG, displayEmojiToken, normalizeProfileEmoji } from "@/lib/utils";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import {
  mealLineKcalPerEater,
  mealLineTotalKcal,
  recipeCaloriesPerServing,
} from "@/lib/meal-plan-calories";

function isLocalUpload(src: string | null | undefined) {
  return Boolean(
    src?.startsWith("/uploads/") ||
      src?.startsWith("/api/recipes/image/") ||
      (typeof src === "string" && src.includes(".blob.vercel-storage.com"))
  );
}

interface User { id: string; name: string | null; image: string | null; color: string; emoji: string; }
interface Ingredient { id: string; name: string; amount: string; unit: string | null; }
interface Recipe {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  imageUrl: string | null;
  prepTime: number | null;
  cookTime: number | null;
  calories: number | null;
  servings: number;
  category: string;
  ingredients: Ingredient[];
}
interface MealPlan {
  id: string;
  date: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  recipe: Recipe | null;
  cook: User | null;
  note: string | null;
  portionCount: number;
  eaterIds: string[];
}

interface MealPlannerProps {
  initialRecipes: Recipe[];
  initialMealPlans: MealPlan[];
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
}

type Tab = "planner" | "recipes";
type RecipeForm = {
  name: string;
  description: string;
  emoji: string;
  category: string;
  prepTime: string;
  cookTime: string;
  calories: string;
  servings: string;
  ingredients: Array<{ name: string; amount: string; unit: string }>;
};

function AnimatedRecipeImage({
  src,
  alt = "",
  sizes,
  unoptimized,
}: {
  src: string;
  alt?: string;
  sizes: string;
  unoptimized: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 1.03 }}
        animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 1.03 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="absolute inset-0"
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes={sizes}
          unoptimized={unoptimized}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      </motion.div>
      {!loaded && (
        <motion.div
          initial={{ opacity: 0.45 }}
          animate={{ opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-gradient-to-r from-warm-100 via-cream-50 to-warm-100"
        />
      )}
    </>
  );
}

export default function MealPlanner({ initialRecipes, initialMealPlans, users, currentUserId, isAdmin }: MealPlannerProps) {
  const { language } = useAppLanguage();
  const ml = messageLocale(language);
  const t = I18N[ml].mealPlanner;
  const dateLocale = ml === "uk" ? uk : enUS;
  const [tab, setTab] = useState<Tab>("planner");
  const [recipes, setRecipes] = useState(initialRecipes);
  const [mealPlans, setMealPlans] = useState(initialMealPlans);
  const [weekStart, setWeekStart] = useState(() => {
    const d = startOfWeek(new Date(), { weekStartsOn: 1 });
    return d;
  });
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [shopLines, setShopLines] = useState<string[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [mealModal, setMealModal] = useState<
    { date: string; mealType: string; mealId?: string } | null
  >(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [selectedCookId, setSelectedCookId] = useState("");
  const [portionInput, setPortionInput] = useState("1");
  const [eaterIds, setEaterIds] = useState<string[]>([]);
  const recipeFileRef = useRef<HTMLInputElement>(null);
  const [recipeImageFile, setRecipeImageFile] = useState<File | null>(null);
  const [recipeImagePreview, setRecipeImagePreview] = useState<string | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editInitialImageUrl, setEditInitialImageUrl] = useState<string | null>(null);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  const [publishMarketLoadingId, setPublishMarketLoadingId] = useState<string | null>(null);
  const [newRecipe, setNewRecipe] = useState<RecipeForm>({
    name: "", description: "", emoji: DEFAULT_RECIPE_EMOJI, category: t.categories[1] ?? "",
    prepTime: "", cookTime: "", calories: "", servings: "4",
    ingredients: [{ name: "", amount: "", unit: "" }],
  });

  const clearBlobOnly = () => {
    if (recipeImagePreview) URL.revokeObjectURL(recipeImagePreview);
    setRecipeImagePreview(null);
    setRecipeImageFile(null);
    if (recipeFileRef.current) recipeFileRef.current.value = "";
  };

  const removeRecipePhoto = () => {
    clearBlobOnly();
    setEditInitialImageUrl(null);
  };

  const openNewRecipeModal = () => {
    setEditingRecipeId(null);
    setEditInitialImageUrl(null);
    clearBlobOnly();
    setNewRecipe({
      name: "",
      description: "",
      emoji: DEFAULT_RECIPE_EMOJI,
      category: t.categories[1] ?? "",
      prepTime: "",
      cookTime: "",
      calories: "",
      servings: "4",
      ingredients: [{ name: "", amount: "", unit: "" }],
    });
    setShowAddRecipe(true);
  };

  const openEditRecipe = (recipe: Recipe) => {
    clearBlobOnly();
    setEditingRecipeId(recipe.id);
    setEditInitialImageUrl(recipe.imageUrl);
    setNewRecipe({
      name: recipe.name,
      description: recipe.description ?? "",
      emoji: displayEmojiToken(recipe.emoji) || DEFAULT_RECIPE_EMOJI,
      category: recipe.category,
      prepTime: recipe.prepTime != null ? String(recipe.prepTime) : "",
      cookTime: recipe.cookTime != null ? String(recipe.cookTime) : "",
      calories: recipe.calories != null ? String(recipe.calories) : "",
      servings: String(recipe.servings),
      ingredients:
        recipe.ingredients.length > 0
          ? recipe.ingredients.map((i) => ({
              name: i.name,
              amount: i.amount,
              unit: i.unit ?? "",
            }))
          : [{ name: "", amount: "", unit: "" }],
    });
    setShowAddRecipe(true);
  };

  const openEditFromView = () => {
    if (!viewRecipe) return;
    const r = viewRecipe;
    setViewRecipe(null);
    openEditRecipe(r);
  };

  const closeAddRecipeModal = () => {
    clearBlobOnly();
    setEditInitialImageUrl(null);
    setEditingRecipeId(null);
    setShowAddRecipe(false);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const mealTypes: ("BREAKFAST" | "LUNCH" | "DINNER" | "SNACK")[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
  const mealTypeLabels: Record<(typeof mealTypes)[number], string> = {
    BREAKFAST: t.mealTypes.breakfast,
    LUNCH: t.mealTypes.lunch,
    DINNER: t.mealTypes.dinner,
    SNACK: t.mealTypes.snack,
  };

  const getMealsForSlot = (date: Date, mealType: string) =>
    mealPlans.filter(
      (p) => format(new Date(p.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd") && p.mealType === mealType
    );

  useEffect(() => {
    if (!mealModal) return;
    if (mealModal.mealId) {
      const m = mealPlans.find((p) => p.id === mealModal.mealId);
      if (m) {
        setSelectedRecipeId(m.recipe?.id ?? "");
        setSelectedCookId(m.cook?.id ?? "");
        setPortionInput(String(m.portionCount ?? 1));
        setEaterIds([...(m.eaterIds ?? [])]);
      }
    } else {
      setSelectedRecipeId("");
      setSelectedCookId("");
      setPortionInput("1");
      setEaterIds([]);
    }
  }, [mealModal, mealPlans]);

  const handleSaveMeal = async () => {
    if (!mealModal) return;
    const pc = Math.max(0.25, Number(portionInput) || 1);
    const payload = {
      recipeId: selectedRecipeId || undefined,
      cookId: selectedCookId || undefined,
      portionCount: pc,
      eaterIds,
    };
    if (mealModal.mealId) {
      const res = await fetch(`/api/meals/${mealModal.mealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error(t.mealSaveFailed);
        return;
      }
      const plan = await res.json();
      setMealPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
    } else {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "plan",
          date: new Date(mealModal.date).toISOString(),
          mealType: mealModal.mealType,
          ...payload,
        }),
      });
      if (!res.ok) {
        toast.error(t.mealSaveFailed);
        return;
      }
      const plan = await res.json();
      setMealPlans((prev) => [...prev, plan]);
    }
    setMealModal(null);
    setSelectedRecipeId("");
    setSelectedCookId("");
    setPortionInput("1");
    setEaterIds([]);
    toast.success(mealModal.mealId ? t.mealUpdated : t.mealAdded);
  };

  const toggleEater = (id: string) => {
    setEaterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDeleteMeal = async (id: string) => {
    await fetch(`/api/meals/${id}`, { method: "DELETE" });
    setMealPlans((prev) => prev.filter((p) => p.id !== id));
    toast.success(t.deleted);
  };

  const handleSaveRecipe = async () => {
    if (!newRecipe.name) return;
    const ingredientsPayload = newRecipe.ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({ name: i.name.trim(), amount: i.amount.trim(), unit: i.unit.trim() || null }));

    let uploadedUrl: string | undefined;
    if (recipeImageFile) {
      const fd = new FormData();
      fd.append("file", recipeImageFile);
      const up = await fetch("/api/recipes/upload", { method: "POST", body: fd });
      if (!up.ok) {
        const err = await up.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || t.uploadImageFailed);
        return;
      }
      uploadedUrl = ((await up.json()) as { url: string }).url;
    }

    if (editingRecipeId) {
      const imageUrl = uploadedUrl ?? editInitialImageUrl;
      const res = await fetch(`/api/meals/${editingRecipeId}?type=recipe`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRecipe.name,
          description: newRecipe.description || null,
          emoji: newRecipe.emoji,
          category: newRecipe.category,
          prepTime: newRecipe.prepTime ? Number(newRecipe.prepTime) : null,
          cookTime: newRecipe.cookTime ? Number(newRecipe.cookTime) : null,
          calories: newRecipe.calories ? Number(newRecipe.calories) : null,
          servings: Number(newRecipe.servings) || 4,
          imageUrl,
          ingredients: ingredientsPayload,
        }),
      });
      if (!res.ok) {
        toast.error(t.recipeUpdateFailed);
        return;
      }
      const updated = await res.json();
      setRecipes((prev) => prev.map((r) => (r.id === editingRecipeId ? updated : r)));
      setMealPlans((prev) =>
        prev.map((p) =>
          p.recipe?.id === editingRecipeId ? { ...p, recipe: updated } : p
        )
      );
      closeAddRecipeModal();
      toast.success(t.recipeUpdated);
      return;
    }

    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "recipe",
        name: newRecipe.name,
        description: newRecipe.description,
        emoji: newRecipe.emoji,
        category: newRecipe.category,
        prepTime: newRecipe.prepTime ? Number(newRecipe.prepTime) : null,
        cookTime: newRecipe.cookTime ? Number(newRecipe.cookTime) : null,
        calories: newRecipe.calories ? Number(newRecipe.calories) : null,
        servings: Number(newRecipe.servings),
        ingredients: ingredientsPayload,
        imageUrl: uploadedUrl,
      }),
    });
    if (!res.ok) {
      toast.error(t.recipeSaveFailed);
      return;
    }
    const recipe = await res.json();
    setRecipes((prev) => [...prev, recipe]);
    closeAddRecipeModal();
    toast.success(t.recipeAdded);
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (
      !confirm(
        t.deleteRecipeConfirm.replace("{name}", recipe.name)
      )
    ) {
      return;
    }
    const res = await fetch(`/api/meals/${recipe.id}?type=recipe`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t.deleteFailed);
      return;
    }
    setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
    setMealPlans((prev) =>
      prev.map((p) => (p.recipe?.id === recipe.id ? { ...p, recipe: null } : p))
    );
    toast.success(t.recipeDeleted);
  };

  const handlePublishToMarket = async (recipe: Recipe) => {
    setPublishMarketLoadingId(recipe.id);
    try {
      const res = await fetch("/api/recipe-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "publish", recipeId: recipe.id }),
      });
      if (!res.ok) {
        toast.error(t.marketAddFailed);
        return;
      }
      toast.success(t.marketAdded);
    } finally {
      setPublishMarketLoadingId(null);
    }
  };

  const openShopFromMenu = () => {
    const raw = mealPlans
      .filter((p) => p.recipe)
      .flatMap((p) =>
        p.recipe!.ingredients.map(
          (i) => `${i.name.trim()} — ${i.amount}${i.unit ? " " + i.unit : ""}`.trim()
        )
      );
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const line of raw) {
      const key = line.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(line);
      }
    }
    if (!unique.length) {
      toast.error(t.noMenuRecipes);
      return;
    }
    setShopLines(unique);
    setShowShopModal(true);
  };

  const copyShopLines = async () => {
    try {
      await navigator.clipboard.writeText(shopLines.join("\n"));
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  const addShopToShoppingLists = async () => {
    setShopLoading(true);
    try {
      const listsRes = await fetch("/api/shopping");
      if (!listsRes.ok) throw new Error();
      let lists: { id: string }[] = await listsRes.json();
      let listId = lists[0]?.id;
      if (!listId) {
        const create = await fetch("/api/shopping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "list", name: t.fromMenuListName, emoji: "🛒" }),
        });
        if (!create.ok) throw new Error();
        const list = await create.json();
        listId = list.id;
      }
      for (const line of shopLines) {
        const res = await fetch("/api/shopping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: line,
            listId,
            category: t.categoryOther,
          }),
        });
        if (!res.ok) throw new Error();
      }
      toast.success(t.addedToShopping.replace("{count}", String(shopLines.length)));
      setShowShopModal(false);
    } catch {
      toast.error(t.addToListFailed);
    } finally {
      setShopLoading(false);
    }
  };

  const FOOD_EMOJIS = [DEFAULT_RECIPE_EMOJI, "🥗", "🍝", "🥘"];
  const CATEGORIES = t.categories;
  const getDayCalories = (day: Date) =>
    mealPlans.reduce((sum, p) => {
      if (format(new Date(p.date), "yyyy-MM-dd") !== format(day, "yyyy-MM-dd")) return sum;
      const line = mealLineTotalKcal(
        p.recipe?.calories ?? null,
        p.recipe?.servings ?? null,
        p.portionCount ?? 1
      );
      return sum + (line ?? 0);
    }, 0);

  const renderMealSlot = (day: Date, mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK") => {
    const config = MEAL_TYPE_CONFIG[mealType];
    const meals = getMealsForSlot(day, mealType);
    const dateStr = format(day, "yyyy-MM-dd");

    const renderMealCard = (meal: MealPlan) => {
      const lineKcal = meal.recipe
        ? mealLineTotalKcal(meal.recipe.calories, meal.recipe.servings, meal.portionCount ?? 1)
        : null;
      const perPerson =
        meal.recipe && meal.eaterIds?.length
          ? mealLineKcalPerEater(
              meal.recipe.calories,
              meal.recipe.servings,
              meal.portionCount ?? 1,
              meal.eaterIds
            )
          : null;
      const perServing =
        meal.recipe && meal.recipe.calories != null
          ? recipeCaloriesPerServing(meal.recipe.calories, meal.recipe.servings)
          : null;

      return (
        <motion.div
          key={meal.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${config.color} rounded-2xl p-2.5 relative group border border-warm-100`}
        >
          <div className="absolute top-1.5 right-1 flex gap-0.5 z-20">
            <button
              type="button"
              onClick={() =>
                setMealModal({ date: dateStr, mealType, mealId: meal.id })
              }
              className="w-6 h-6 rounded-full bg-white/90 text-warm-400 hover:text-sky-600 flex items-center justify-center shadow-sm"
            >
              <Pencil size={11} />
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteMeal(meal.id)}
              className="w-6 h-6 rounded-full bg-white/90 text-warm-400 hover:text-rose-500 flex items-center justify-center shadow-sm"
            >
              <X size={11} />
            </button>
          </div>
          <div
            role={meal.recipe ? "button" : undefined}
            tabIndex={meal.recipe ? 0 : undefined}
            onClick={() => {
              if (!meal.recipe) return;
              setViewRecipe(meal.recipe);
            }}
            onKeyDown={(e) => {
              if (!meal.recipe) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setViewRecipe(meal.recipe);
              }
            }}
            className={
              meal.recipe
                ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-peach-400 rounded-xl"
                : ""
            }
          >
            {meal.recipe?.imageUrl ? (
              <div className="relative w-full h-10 rounded-lg overflow-hidden mb-1 bg-warm-100">
                <AnimatedRecipeImage
                  src={meal.recipe.imageUrl}
                  alt=""
                  sizes="120px"
                  unoptimized={isLocalUpload(meal.recipe.imageUrl)}
                />
              </div>
            ) : (
              <div className="mb-0.5">
                <UtensilsCrossed size={14} className="text-warm-600" />
              </div>
            )}
            <p className="text-[11px] font-semibold text-warm-800 leading-tight line-clamp-2 pr-6">
              {meal.recipe?.name || meal.note || "—"}
            </p>
            {meal.recipe && lineKcal != null && (
              <p className="text-[10px] text-warm-500 mt-1 leading-snug">
                {Math.round(lineKcal)} kcal
                {meal.portionCount && meal.portionCount !== 1 ? (
                  <span className="text-warm-400"> · {t.portionsInPlan}: {meal.portionCount}</span>
                ) : null}
                {perServing != null && (
                  <span className="text-warm-400">
                    {" "}
                    · {Math.round(perServing)} {t.kcalPerPortionRecipe}
                  </span>
                )}
                {perPerson != null && meal.eaterIds.length > 0 ? (
                  <span className="block text-warm-600 font-medium mt-0.5">
                    {Math.round(perPerson)} {t.kcalPerPerson}
                  </span>
                ) : null}
              </p>
            )}
          </div>
          {meal.cook && (
            <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-warm-200/40">
              <ChefHat size={10} className="text-warm-400 shrink-0" />
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white shrink-0"
                style={{ backgroundColor: meal.cook.color }}
              >
                {normalizeProfileEmoji(meal.cook.emoji) || meal.cook.name?.[0]}
              </div>
              <span className="text-[10px] text-warm-500 truncate">{meal.cook.name}</span>
            </div>
          )}
          {meal.eaterIds.length > 0 && (
            <div className="flex items-center gap-0.5 mt-1 flex-wrap">
              <Users size={10} className="text-warm-400 shrink-0" />
              {meal.eaterIds.map((eid) => {
                const u = users.find((x) => x.id === eid);
                if (!u) return null;
                return (
                  <div
                    key={eid}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white border border-white/80"
                    style={{ backgroundColor: u.color }}
                    title={u.name ?? ""}
                  >
                    {normalizeProfileEmoji(u.emoji) || u.name?.[0]}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      );
    };

    if (meals.length > 0) {
      return (
        <div className="flex flex-col gap-1.5 min-h-[80px] max-h-[min(280px,50vh)] overflow-y-auto pr-0.5">
          {meals.map(renderMealCard)}
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setMealModal({ date: dateStr, mealType })}
            className="w-full shrink-0 rounded-xl border border-dashed border-warm-300/80 bg-white/40 py-1.5 text-warm-400 hover:text-peach-500 hover:border-peach-300 flex items-center justify-center gap-1 text-[11px] font-medium transition-colors"
          >
            <Plus size={12} /> {t.addAnotherDish}
          </motion.button>
        </div>
      );
    }

    return (
      <motion.button
        whileHover={{ scale: 1.02, y: -1 }}
        onClick={() => setMealModal({ date: dateStr, mealType })}
        className="w-full h-full min-h-[80px] rounded-2xl border-2 border-dashed border-warm-200 hover:border-peach-300 hover:bg-peach-50/50 text-warm-300 hover:text-peach-400 flex items-center justify-center transition-all"
      >
        <Plus size={18} />
      </motion.button>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 md:mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: "planner", label: t.tabPlanner, Icon: CalendarDays }, { id: "recipes", label: t.tabRecipes, Icon: BookOpen }].map((tabItem) => (
            <motion.button key={tabItem.id} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
              onClick={() => setTab(tabItem.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                tab === tabItem.id ? "bg-white shadow-cozy text-warm-800" : "text-warm-500 hover:bg-white/50"
              }`}>
              <tabItem.Icon size={15} /> {tabItem.label}
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:flex gap-2">
          {tab === "planner" && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openShopFromMenu}
              title={t.collectIngredientsTitle}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sage-100 hover:bg-sage-200 text-sage-800 rounded-2xl text-sm font-medium transition-all border border-sage-200/60 w-full sm:w-auto"
            >
              <ClipboardList size={16} />
              <span className="hidden sm:inline">{t.ingredientsFromPlan}</span>
              <span className="sm:hidden">{t.toShopping}</span>
            </motion.button>
          )}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openNewRecipeModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-peach-500 to-peach-400 text-white rounded-2xl text-sm font-medium shadow-cozy w-full sm:w-auto"
          >
            <Plus size={16} /> {t.newRecipe}
          </motion.button>
        </div>
      </div>

      {tab === "planner" ? (
        <div className="flex-1 min-h-0">
          <div className="md:hidden space-y-3 overflow-y-auto pb-2">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="bg-white/70 rounded-3xl border border-warm-100 p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-warm-800 capitalize">
                    {format(day, "EEEE, d MMMM", { locale: dateLocale })}
                  </p>
                </div>
                <div className="space-y-2">
                  {mealTypes.map((mealType) => {
                    const config = MEAL_TYPE_CONFIG[mealType];
                    return (
                      <div key={mealType} className="grid grid-cols-[84px_1fr] gap-2 items-stretch">
                        <div className={`rounded-2xl px-2 py-3 text-center ${config.color} flex flex-col items-center justify-center`}>
                          <span className="text-lg">{config.emoji}</span>
                          <span className="text-[11px] font-semibold text-warm-600">{mealTypeLabels[mealType]}</span>
                        </div>
                        {renderMealSlot(day, mealType)}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-2xl bg-white border border-warm-100 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-warm-500">{t.caloriesLabel}</span>
                  <span className="text-sm font-bold text-peach-600">{Math.round(getDayCalories(day))} kcal</span>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-auto h-full">
            <div className="min-w-[720px] md:min-w-[800px]">
              <div className="grid grid-cols-8 gap-2 mb-3">
                <div className="text-xs font-semibold text-warm-400 pt-2 pl-2">{t.mealTypeTitle}</div>
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="text-center">
                    <div className="text-xs text-warm-400 font-medium capitalize">
                      {format(day, "EEE", { locale: dateLocale })}
                    </div>
                    <div className={`text-lg font-bold mt-0.5 ${
                      format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                        ? "text-peach-500" : "text-warm-700"
                    }`}>
                      {format(day, "d")}
                    </div>
                  </div>
                ))}
              </div>
              {mealTypes.map((mealType) => {
                const config = MEAL_TYPE_CONFIG[mealType];
                return (
                  <div key={mealType} className="grid grid-cols-8 gap-2 mb-3">
                    <div className={`rounded-2xl p-3 text-center ${config.color} flex flex-col items-center justify-center`}>
                      <span className="text-xl mb-1">{config.emoji}</span>
                      <span className="text-xs font-semibold text-warm-600">{mealTypeLabels[mealType]}</span>
                    </div>
                    {weekDays.map((day) => (
                      <div key={`${mealType}-${format(day, "yyyy-MM-dd")}`}>
                        {renderMealSlot(day, mealType)}
                      </div>
                    ))}
                  </div>
                );
              })}
              <div className="grid grid-cols-8 gap-2">
                <div className="rounded-2xl bg-white border border-warm-100 px-3 py-3 flex items-center justify-center text-xs font-semibold text-warm-500">
                  {t.caloriesPerDay}
                </div>
                {weekDays.map((day) => (
                  <div key={`calories-${format(day, "yyyy-MM-dd")}`} className="rounded-2xl bg-white border border-warm-100 px-3 py-3 text-center">
                    <span className="text-sm font-bold text-peach-600">{Math.round(getDayCalories(day))} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto overflow-x-visible p-1 -m-1">
          {recipes.map((recipe) => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              className="bg-white/80 rounded-3xl p-5 shadow-cozy border border-warm-100 relative"
            >
              <div className="absolute top-3 right-3 z-10 flex gap-1">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handlePublishToMarket(recipe)}
                    disabled={publishMarketLoadingId === recipe.id}
                    className="w-9 h-9 rounded-xl bg-white/95 shadow-md border border-warm-200 text-warm-600 hover:text-sage-600 flex items-center justify-center disabled:opacity-60"
                    title={t.publishToMarket}
                  >
                    <ClipboardList size={15} />
                  </button>
                )}
                <button
                  type="button"
                    onClick={() => setViewRecipe(recipe)}
                  className="w-9 h-9 rounded-xl bg-white/95 shadow-md border border-warm-200 text-warm-600 hover:text-sky-600 flex items-center justify-center"
                  title={t.view}
                >
                  <Eye size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => openEditRecipe(recipe)}
                  className="w-9 h-9 rounded-xl bg-white/95 shadow-md border border-warm-200 text-warm-600 hover:text-peach-600 flex items-center justify-center"
                  title={t.edit}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRecipe(recipe)}
                  className="w-9 h-9 rounded-xl bg-white/95 shadow-md border border-warm-200 text-warm-500 hover:text-rose-600 flex items-center justify-center"
                  title={t.delete}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-warm-100 mb-3">
                {recipe.imageUrl ? (
                  <AnimatedRecipeImage
                    src={recipe.imageUrl}
                    alt=""
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized={isLocalUpload(recipe.imageUrl)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-5xl">
                    {displayEmojiToken(recipe.emoji) || DEFAULT_RECIPE_EMOJI}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-warm-800 mb-1">{recipe.name}</h3>
              <p className="text-xs text-warm-400 mb-3 line-clamp-2">{recipe.description}</p>
              <div className="flex gap-2 flex-wrap mb-3">
                <span className="text-xs bg-peach-50 text-peach-600 px-2 py-1 rounded-full">{recipe.category}</span>
                {recipe.prepTime && <span className="text-xs bg-sage-50 text-sage-600 px-2 py-1 rounded-full">⏱ {recipe.prepTime}m</span>}
                {recipe.calories != null && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full inline-flex items-center gap-1">
                    <Flame size={12} /> {recipe.calories} kcal
                    {recipeCaloriesPerServing(recipe.calories, recipe.servings) != null && (
                      <span className="opacity-80">
                        {" "}
                        · {Math.round(recipeCaloriesPerServing(recipe.calories, recipe.servings)!)} {t.kcalPerPortionRecipe}
                      </span>
                    )}
                  </span>
                )}
                <span className="text-xs bg-sky-50 text-sky-600 px-2 py-1 rounded-full inline-flex items-center gap-1"><Users size={12} /> {recipe.servings}</span>
              </div>
              {recipe.ingredients.length > 0 && (
                <div className="border-t border-warm-100 pt-3">
                  <p className="text-xs font-semibold text-warm-600 mb-2">{t.ingredientsLabel}</p>
                  <div className="space-y-1">
                    {recipe.ingredients.slice(0, 3).map((ing) => (
                      <p key={ing.id} className="text-xs text-warm-500">
                        • {ing.name} — {ing.amount}{ing.unit ? " " + ing.unit : ""}
                      </p>
                    ))}
                    {recipe.ingredients.length > 3 && (
                      <p className="text-xs text-warm-400">+{recipe.ingredients.length - 3} {t.more}</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* Add recipe card */}
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={openNewRecipeModal}
            className="bg-white/40 rounded-3xl p-5 border-2 border-dashed border-warm-200 hover:border-peach-300 text-warm-300 hover:text-peach-400 flex flex-col items-center justify-center gap-2 min-h-[180px] transition-all"
          >
            <Plus size={24} />
            <span className="text-sm font-medium">{t.addRecipe}</span>
          </motion.button>

        </div>
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {mealModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMealModal(null)}
              className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-md max-h-[min(90dvh,640px)] flex flex-col rounded-3xl bg-white shadow-cozy-lg overflow-hidden"
            >
              <div className="overflow-y-auto overscroll-contain p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-warm-800">
                    {MEAL_TYPE_CONFIG[mealModal.mealType as keyof typeof MEAL_TYPE_CONFIG]?.emoji}{" "}
                    {mealModal.mealId ? t.editDish : t.addDish}
                  </h2>
                  <button onClick={() => setMealModal(null)} className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  <select value={selectedRecipeId} onChange={(e) => setSelectedRecipeId(e.target.value)}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-peach-400">
                    <option value="">{t.chooseRecipe}</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {displayEmojiToken(r.emoji) || DEFAULT_RECIPE_EMOJI} {r.name}
                      </option>
                    ))}
                  </select>
                  <div>
                    <label className="block text-xs font-semibold text-warm-500 mb-1.5">{t.portionsLabel}</label>
                    <input
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={portionInput}
                      onChange={(e) => setPortionInput(e.target.value)}
                      className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-peach-400"
                    />
                    <p className="text-[11px] text-warm-400 mt-1">{t.portionsHint}</p>
                  </div>
                  <select value={selectedCookId} onChange={(e) => setSelectedCookId(e.target.value)}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-peach-400">
                    <option value="">{t.whoCooks}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {normalizeProfileEmoji(u.emoji)} {u.name}
                      </option>
                    ))}
                  </select>
                  <div>
                    <p className="text-xs font-semibold text-warm-500 mb-2">{t.eatersLabel}</p>
                    <div className="flex flex-wrap gap-2">
                      {users.map((u) => (
                        <label
                          key={u.id}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors ${
                            eaterIds.includes(u.id)
                              ? "border-peach-400 bg-peach-50 text-warm-800"
                              : "border-warm-200 bg-warm-50/80 text-warm-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={eaterIds.includes(u.id)}
                            onChange={() => toggleEater(u.id)}
                          />
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white"
                            style={{ backgroundColor: u.color }}
                          >
                            {normalizeProfileEmoji(u.emoji) || u.name?.[0]}
                          </span>
                          <span className="truncate max-w-[9rem]">{u.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[11px] text-warm-400 mt-1.5">{t.eatersHint}</p>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => void handleSaveMeal()}
                    className="w-full py-3 bg-gradient-to-r from-peach-500 to-peach-400 text-white rounded-2xl font-semibold">
                    {mealModal.mealId ? t.saveChanges : t.add}
                  </motion.button>
                </div>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {viewRecipe && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewRecipe(null)}
              className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-lg max-h-[min(92dvh,820px)] flex flex-col rounded-3xl bg-white shadow-cozy-lg overflow-hidden border border-warm-100"
            >
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-warm-100 shrink-0">
                <div className="min-w-0">
                  <p className="text-2xl leading-none mb-1">
                    {displayEmojiToken(viewRecipe.emoji) || DEFAULT_RECIPE_EMOJI}
                  </p>
                  <h2 className="text-lg font-bold text-warm-800 leading-tight">{viewRecipe.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setViewRecipe(null)}
                  className="shrink-0 w-9 h-9 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto overscroll-contain px-5 py-4 flex-1 min-h-0 space-y-4">
                {viewRecipe.imageUrl ? (
                  <div className="relative w-full aspect-[4/3] max-h-56 rounded-2xl overflow-hidden bg-warm-100">
                    <AnimatedRecipeImage
                      src={viewRecipe.imageUrl}
                      alt=""
                      sizes="(max-width: 768px) 100vw, 32rem"
                      unoptimized={isLocalUpload(viewRecipe.imageUrl)}
                    />
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-peach-50 text-peach-600 px-2.5 py-1 rounded-full font-medium">{viewRecipe.category}</span>
                  {viewRecipe.prepTime != null && (
                    <span className="text-xs bg-sage-50 text-sage-600 px-2.5 py-1 rounded-full">{t.prep} {viewRecipe.prepTime} m</span>
                  )}
                  {viewRecipe.cookTime != null && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">{t.cooking} {viewRecipe.cookTime} m</span>
                  )}
                  {viewRecipe.calories != null && (
                    <span className="text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full">{t.calories} {viewRecipe.calories} kcal</span>
                  )}
                  <span className="text-xs bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full">{t.servings}: {viewRecipe.servings}</span>
                  {viewRecipe.calories != null &&
                    recipeCaloriesPerServing(viewRecipe.calories, viewRecipe.servings) != null && (
                      <span className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full">
                        {Math.round(recipeCaloriesPerServing(viewRecipe.calories, viewRecipe.servings)!)} {t.kcalPerPortionRecipe}
                      </span>
                    )}
                </div>
                {viewRecipe.description?.trim() ? (
                  <div>
                    <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">{t.descriptionTitle}</p>
                    <p className="text-sm text-warm-800 whitespace-pre-wrap leading-relaxed">{viewRecipe.description}</p>
                  </div>
                ) : (
                  <p className="text-sm text-warm-400 italic">{t.descriptionEmpty}</p>
                )}
                <div>
                  <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-2">{t.ingredientsTitle}</p>
                  {viewRecipe.ingredients.length > 0 ? (
                    <ul className="space-y-2">
                      {viewRecipe.ingredients.map((ing) => (
                        <li
                          key={ing.id}
                          className="text-sm text-warm-700 py-2 px-3 rounded-xl bg-warm-50 border border-warm-100"
                        >
                          <span className="font-medium text-warm-800">{ing.name}</span>
                          <span className="text-warm-500">
                            {" "}
                            — {ing.amount}
                            {ing.unit ? ` ${ing.unit}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-warm-400">{t.noIngredients}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 p-4 border-t border-warm-100 shrink-0 bg-cream-50/50">
                <button
                  type="button"
                  onClick={() => setViewRecipe(null)}
                  className="flex-1 py-3 rounded-2xl bg-white border border-warm-200 text-warm-800 font-medium text-sm"
                >
                  {t.close}
                </button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={openEditFromView}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-peach-500 to-peach-400 text-white font-semibold text-sm"
                >
                  {t.edit}
                </motion.button>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showAddRecipe && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAddRecipeModal}
              className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-lg max-h-[min(92dvh,800px)] flex flex-col rounded-3xl bg-white shadow-cozy-lg overflow-hidden"
            >
              <div className="overflow-y-auto overscroll-contain p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-warm-800">
                    {editingRecipeId ? t.editRecipeTitle : t.newRecipeTitle} <ChefHat size={16} className="inline ml-1" />
                  </h2>
                  <button type="button" onClick={closeAddRecipeModal} className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  <input
                    ref={recipeFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 5 * 1024 * 1024) {
                        toast.error(t.max5mb);
                        e.target.value = "";
                        return;
                      }
                      setRecipeImagePreview((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return URL.createObjectURL(f);
                      });
                      setRecipeImageFile(f);
                    }}
                  />
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <button
                      type="button"
                      onClick={() => recipeFileRef.current?.click()}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-warm-200 hover:border-peach-300 text-warm-600 text-sm font-medium bg-warm-50/80"
                    >
                      <ImagePlus size={18} />
                      {t.dishPhoto}
                    </button>
                    {(recipeImagePreview || editInitialImageUrl) && (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-warm-100 shrink-0 border border-warm-200">
                          <AnimatedRecipeImage
                            src={recipeImagePreview || editInitialImageUrl!}
                            alt=""
                            sizes="80px"
                            unoptimized={!!recipeImagePreview || isLocalUpload(editInitialImageUrl)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={removeRecipePhoto}
                          className="text-xs text-rose-500 font-medium hover:text-rose-600 shrink-0"
                        >
                          {t.removePhoto}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {FOOD_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setNewRecipe((p) => ({ ...p, emoji: e }))}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg leading-none transition-all ${newRecipe.emoji === e ? "bg-peach-100 ring-2 ring-peach-400" : "hover:bg-warm-50"}`}
                        aria-label={e}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <input value={newRecipe.name} onChange={(e) => setNewRecipe((p) => ({ ...p, name: e.target.value }))}
                    placeholder={t.dishNamePlaceholder} className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-peach-400" />
                  <textarea value={newRecipe.description} onChange={(e) => setNewRecipe((p) => ({ ...p, description: e.target.value }))}
                    placeholder={t.descriptionPlaceholder} rows={2}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-peach-400 resize-none" />
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <select value={newRecipe.category} onChange={(e) => setNewRecipe((p) => ({ ...p, category: e.target.value }))}
                      className="bg-warm-50 rounded-xl px-3 py-3 text-sm outline-none border border-warm-200 focus:border-peach-400">
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <input type="number" value={newRecipe.prepTime} onChange={(e) => setNewRecipe((p) => ({ ...p, prepTime: e.target.value }))}
                      placeholder={t.prepPlaceholder} className="bg-warm-50 rounded-xl px-3 py-3 text-sm outline-none border border-warm-200 focus:border-peach-400" />
                    <input type="number" value={newRecipe.cookTime} onChange={(e) => setNewRecipe((p) => ({ ...p, cookTime: e.target.value }))}
                      placeholder={t.cookPlaceholder} className="bg-warm-50 rounded-xl px-3 py-3 text-sm outline-none border border-warm-200 focus:border-peach-400" />
                    <input type="number" value={newRecipe.calories} onChange={(e) => setNewRecipe((p) => ({ ...p, calories: e.target.value }))}
                      placeholder={t.caloriesPlaceholder} className="bg-warm-50 rounded-xl px-3 py-3 text-sm outline-none border border-warm-200 focus:border-peach-400" />
                    <input type="number" value={newRecipe.servings} onChange={(e) => setNewRecipe((p) => ({ ...p, servings: e.target.value }))}
                      placeholder={t.servingsPlaceholder} className="bg-warm-50 rounded-xl px-3 py-3 text-sm outline-none border border-warm-200 focus:border-peach-400" />
                  </div>
                  <p className="text-[11px] text-warm-400 -mt-1">{t.caloriesTotalHint}</p>

                  {/* Ingredients */}
                  <div>
                    <p className="text-sm font-semibold text-warm-700 mb-2">{t.ingredientsTitle}</p>
                    {newRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input value={ing.name} onChange={(e) => setNewRecipe((p) => ({ ...p, ingredients: p.ingredients.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))}
                          placeholder={t.ingredientName} className="flex-1 bg-warm-50 rounded-xl px-3 py-2 text-sm outline-none border border-warm-200 focus:border-peach-400" />
                        <input value={ing.amount} onChange={(e) => setNewRecipe((p) => ({ ...p, ingredients: p.ingredients.map((x, j) => j === i ? { ...x, amount: e.target.value } : x) }))}
                          placeholder={t.ingredientAmount} className="w-24 bg-warm-50 rounded-xl px-3 py-2 text-sm outline-none border border-warm-200 focus:border-peach-400" />
                        <input value={ing.unit} onChange={(e) => setNewRecipe((p) => ({ ...p, ingredients: p.ingredients.map((x, j) => j === i ? { ...x, unit: e.target.value } : x) }))}
                          placeholder={t.unitShort} className="w-16 bg-warm-50 rounded-xl px-3 py-2 text-sm outline-none border border-warm-200 focus:border-peach-400" />
                      </div>
                    ))}
                    <button onClick={() => setNewRecipe((p) => ({ ...p, ingredients: [...p.ingredients, { name: "", amount: "", unit: "" }] }))}
                      className="text-xs text-peach-500 hover:text-peach-600 font-medium">
                      {t.addIngredient}
                    </button>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveRecipe}
                    className="w-full py-3 bg-gradient-to-r from-peach-500 to-peach-400 text-white rounded-2xl font-semibold"
                  >
                    {editingRecipeId ? t.saveChanges : t.saveRecipe}
                  </motion.button>
                </div>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showShopModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShopModal(false)}
              className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-md max-h-[min(90dvh,720px)] flex flex-col rounded-3xl bg-white shadow-cozy-lg overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 border-b border-warm-100 px-5 py-4 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-warm-800">{t.menuIngredientsTitle}</h2>
                  <p className="text-xs text-warm-500 mt-0.5">
                    {t.menuIngredientsHint}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShopModal(false)}
                  className="shrink-0 w-9 h-9 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
              <ul className="overflow-y-auto overscroll-contain px-5 py-3 space-y-2 flex-1 min-h-0 max-h-[50vh]">
                {shopLines.map((line) => (
                  <li
                    key={line}
                    className="text-sm text-warm-700 py-2 px-3 rounded-xl bg-warm-50 border border-warm-100"
                  >
                    {line}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-2 p-4 border-t border-warm-100 shrink-0 bg-cream-50/50">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={copyShopLines}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-warm-200 text-warm-800 font-medium text-sm"
                >
                  <Copy size={16} /> {t.copyText}
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  disabled={shopLoading}
                  onClick={addShopToShoppingLists}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-sage-500 text-white font-medium text-sm disabled:opacity-60"
                >
                  {shopLoading ? "…" : t.toShoppingList}
                </motion.button>
              </div>
              <div className="px-4 pb-4 text-center">
                <Link
                  href="/shopping"
                  className="text-xs text-peach-600 hover:text-peach-700 font-medium"
                  onClick={() => setShowShopModal(false)}
                >
                  {t.openShopping}
                </Link>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
