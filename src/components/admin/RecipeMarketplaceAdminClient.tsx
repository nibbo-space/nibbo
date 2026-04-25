"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, Flame, Trash2, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { DEFAULT_RECIPE_EMOJI, displayEmojiToken } from "@/lib/utils";
import { recipeCaloriesPerServing } from "@/lib/meal-plan-calories";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";

type Ingredient = { id: string; name: string; amount: string; unit: string | null };
type MarketRow = {
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
};

function isLocalUpload(src: string | null | undefined) {
  return Boolean(
    src?.startsWith("/uploads/") ||
      src?.startsWith("/api/recipes/image/") ||
      (typeof src === "string" && src.includes(".blob.vercel-storage.com"))
  );
}

export default function RecipeMarketplaceAdminClient() {
  const { language } = useAppLanguage();
  const ml = messageLocale(language);
  const t = I18N[ml].adminRecipeMarket;
  const tm = I18N[ml].mealPlanner;
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewRecipe, setViewRecipe] = useState<MarketRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recipe-market");
      if (!res.ok) {
        toast.error(t.loadFailed);
        setRows([]);
        return;
      }
      const data = (await res.json()) as MarketRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t.loadFailed);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (recipe: MarketRow) => {
    if (!confirm(t.removeConfirm.replace("{name}", recipe.name))) return;
    setDeleteId(recipe.id);
    try {
      const res = await fetch(`/api/recipe-market/${recipe.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error(t.removeFailedToast);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== recipe.id));
      if (viewRecipe?.id === recipe.id) setViewRecipe(null);
      toast.success(t.removedToast);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-warm-500 hover:text-peach-600"
          >
            <ArrowLeft size={16} aria-hidden />
            {t.backToAdmin}
          </Link>
          <h1 className="text-2xl font-bold text-warm-900 sm:text-3xl">{t.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-warm-600 sm:text-base">{t.subtitle}</p>
          <p className="mt-2 text-xs font-medium text-warm-500">{t.countLabel.replace("{count}", String(rows.length))}</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-warm-100 bg-white/70 py-16 text-center text-warm-500">{t.loading}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-warm-100 bg-white/70 py-16 text-center text-warm-500">{t.empty}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((recipe) => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl border border-sage-200/80 bg-white/90 p-5 shadow-cozy"
            >
              <div className="absolute right-3 top-3 z-10 flex gap-1">
                <button
                  type="button"
                  onClick={() => setViewRecipe(recipe)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-warm-200 bg-white/95 text-warm-600 shadow-md hover:text-sky-600"
                  title={tm.view}
                >
                  <Eye size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(recipe)}
                  disabled={deleteId === recipe.id}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-warm-200 bg-white/95 text-warm-500 shadow-md hover:text-rose-600 disabled:opacity-60"
                  title={t.removeAria}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="relative mb-3 mt-2 aspect-[4/3] overflow-hidden rounded-2xl bg-warm-100">
                {recipe.imageUrl ? (
                  <Image
                    src={recipe.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized={isLocalUpload(recipe.imageUrl)}
                  />
                ) : (
                  <div className="flex h-full min-h-[140px] items-center justify-center text-5xl">
                    {displayEmojiToken(recipe.emoji) || DEFAULT_RECIPE_EMOJI}
                  </div>
                )}
              </div>
              <h3 className="mb-1 font-bold text-warm-800">{recipe.name}</h3>
              <p className="mb-3 line-clamp-2 text-xs text-warm-400">{recipe.description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-peach-50 px-2 py-1 text-xs text-peach-600">{recipe.category}</span>
                {recipe.prepTime != null ? (
                  <span className="rounded-full bg-sage-50 px-2 py-1 text-xs text-sage-600">⏱ {recipe.prepTime}m</span>
                ) : null}
                {recipe.calories != null ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">
                    <Flame size={12} /> {recipe.calories} kcal
                    {recipeCaloriesPerServing(recipe.calories, recipe.servings) != null ? (
                      <span className="opacity-80">
                        {" "}
                        · {Math.round(recipeCaloriesPerServing(recipe.calories, recipe.servings)!)} {tm.kcalPerPortionRecipe}
                      </span>
                    ) : null}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-xs text-sky-600">
                  <Users size={12} /> {recipe.servings}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {viewRecipe ? (
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
                  className="relative z-10 flex max-h-[min(92dvh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-warm-100 bg-white shadow-cozy-lg"
                >
                  <div className="flex shrink-0 items-start justify-between gap-3 border-b border-warm-100 px-5 py-4">
                    <div className="min-w-0">
                      <p className="mb-1 text-2xl leading-none">
                        {displayEmojiToken(viewRecipe.emoji) || DEFAULT_RECIPE_EMOJI}
                      </p>
                      <h2 className="text-lg font-bold leading-tight text-warm-800">{viewRecipe.name}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewRecipe(null)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warm-100 text-warm-500 hover:bg-warm-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
                    {viewRecipe.imageUrl ? (
                      <div className="relative aspect-[4/3] max-h-56 w-full overflow-hidden rounded-2xl bg-warm-100">
                        <Image
                          src={viewRecipe.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 32rem"
                          unoptimized={isLocalUpload(viewRecipe.imageUrl)}
                        />
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-peach-50 px-2.5 py-1 text-xs font-medium text-peach-600">
                        {viewRecipe.category}
                      </span>
                      {viewRecipe.prepTime != null ? (
                        <span className="rounded-full bg-sage-50 px-2.5 py-1 text-xs text-sage-600">
                          {tm.prep} {viewRecipe.prepTime} m
                        </span>
                      ) : null}
                      {viewRecipe.cookTime != null ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                          {tm.cooking} {viewRecipe.cookTime} m
                        </span>
                      ) : null}
                      {viewRecipe.calories != null ? (
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs text-rose-700">
                          {tm.calories} {viewRecipe.calories} kcal
                        </span>
                      ) : null}
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs text-sky-600">
                        {tm.servings}: {viewRecipe.servings}
                      </span>
                    </div>
                    {viewRecipe.description?.trim() ? (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-warm-500">
                          {tm.descriptionTitle}
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-warm-800">{viewRecipe.description}</p>
                      </div>
                    ) : (
                      <p className="text-sm italic text-warm-400">{tm.descriptionEmpty}</p>
                    )}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-warm-500">{tm.ingredientsTitle}</p>
                      {viewRecipe.ingredients.length > 0 ? (
                        <ul className="space-y-2">
                          {viewRecipe.ingredients.map((ing) => (
                            <li
                              key={ing.id}
                              className="rounded-xl border border-warm-100 bg-warm-50 px-3 py-2 text-sm text-warm-700"
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
                        <p className="text-sm text-warm-400">{tm.noIngredients}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-warm-100 bg-cream-50/50 p-4 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setViewRecipe(null)}
                      className="flex-1 rounded-2xl border border-warm-200 bg-white py-3 text-sm font-medium text-warm-800"
                    >
                      {tm.close}
                    </button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => void handleDelete(viewRecipe)}
                      disabled={deleteId === viewRecipe.id}
                      className="flex-1 rounded-2xl bg-rose-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {t.removeFromCatalog}
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            ) : null}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
