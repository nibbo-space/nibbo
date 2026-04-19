"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Lock, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { I18N } from "@/lib/i18n";

interface User {
  id: string;
  name: string | null;
  image: string | null;
  color: string;
  emoji: string;
}
interface ShoppingItem {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  checked: boolean;
  category: string | null;
  isPrivate?: boolean;
  createdAt: string | Date;
  addedBy: User;
}
interface ShoppingList {
  id: string;
  name: string;
  emoji: string;
  sortOrder: number;
  categoryOrder: string[];
  isPrivate?: boolean;
  items: ShoppingItem[];
}

function normShoppingCat(c: string | null) {
  return (c ?? "").trim();
}

function orderedKeysForList(list: { items: { category: string | null }[]; categoryOrder: string[] }) {
  const present = new Set<string>();
  for (const it of list.items) {
    present.add(normShoppingCat(it.category));
  }
  const base = list.categoryOrder ?? [];
  const ordered = base.filter((k) => present.has(k));
  const rest = [...present].filter((k) => !ordered.includes(k)).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
  return [...ordered, ...rest];
}

function sortItemsByCreated(a: ShoppingItem, b: ShoppingItem) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export default function ShoppingView({
  initialLists,
  currentUserId,
}: {
  initialLists: ShoppingList[];
  currentUserId: string;
}) {
  const { language } = useAppLanguage();
  const t = I18N[language].shopping;
  const [lists, setLists] = useState(initialLists);
  const sortedLists = useMemo(
    () => [...lists].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [lists]
  );
  const [activeList, setActiveList] = useState(() => {
    const s = [...initialLists].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return s[0]?.id || "";
  });
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListEmoji, setNewListEmoji] = useState("🛒");
  const [newListPrivate, setNewListPrivate] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", quantity: "", unit: "", category: "" });
  const [newItemPrivate, setNewItemPrivate] = useState(false);

  const currentList = lists.find((l) => l.id === activeList);
  const checkedItems = currentList?.items.filter((i) => i.checked) || [];

  const listDerived = useMemo(() => {
    if (!currentList) return null;
    const allKeys = orderedKeysForList(currentList);
    const uncheckedByCat: Record<string, ShoppingItem[]> = {};
    const checkedByCat: Record<string, ShoppingItem[]> = {};
    for (const it of currentList.items) {
      const k = normShoppingCat(it.category);
      if (it.checked) {
        (checkedByCat[k] ??= []).push(it);
      } else {
        (uncheckedByCat[k] ??= []).push(it);
      }
    }
    for (const k of Object.keys(uncheckedByCat)) {
      uncheckedByCat[k]!.sort(sortItemsByCreated);
    }
    for (const k of Object.keys(checkedByCat)) {
      checkedByCat[k]!.sort(sortItemsByCreated);
    }
    const keysUnchecked = allKeys.filter((k) => (uncheckedByCat[k]?.length ?? 0) > 0);
    const keysChecked = allKeys.filter((k) => (checkedByCat[k]?.length ?? 0) > 0);
    return { allKeys, uncheckedByCat, checkedByCat, keysUnchecked, keysChecked };
  }, [currentList]);

  const handleAddList = async () => {
    if (!newListName.trim()) return;
    const res = await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "list", name: newListName, emoji: newListEmoji, isPrivate: newListPrivate }),
    });
    const list = await res.json();
    setLists((prev) => [
      { ...list, items: [], categoryOrder: list.categoryOrder ?? [], sortOrder: list.sortOrder ?? 0 },
      ...prev.map((l) => ({ ...l, sortOrder: l.sortOrder + 1 })),
    ]);
    setActiveList(list.id);
    setShowAddList(false);
    setNewListName("");
    setNewListPrivate(false);
    toast.success(t.toastListCreated);
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim() || !activeList) return;
    const catTrim = newItem.category.trim();
    const res = await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newItem.name,
        quantity: newItem.quantity || undefined,
        unit: newItem.unit || undefined,
        category: catTrim || undefined,
        listId: activeList,
        isPrivate: newItemPrivate,
      }),
    });
    const item = await res.json();
    setLists((prev) => prev.map((l) => (l.id === activeList ? { ...l, items: [...l.items, item] } : l)));
    setNewItem({ name: "", quantity: "", unit: "", category: "" });
    setNewItemPrivate(false);
    toast.success(t.toastItemAdded);
  };

  const handleToggle = async (item: ShoppingItem) => {
    const res = await fetch(`/api/shopping/${item.id}?type=item`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !item.checked }),
    });
    const updated = await res.json();
    setLists((prev) =>
      prev.map((l) =>
        l.id === activeList
          ? {
              ...l,
              items: l.items
                .map((i) => (i.id === item.id ? updated : i))
                .sort((a, b) => (a.checked ? 1 : 0) - (b.checked ? 1 : 0)),
            }
          : l
      )
    );
  };

  const handleDeleteItem = async (itemId: string) => {
    await fetch(`/api/shopping/${itemId}`, { method: "DELETE" });
    setLists((prev) =>
      prev.map((l) => (l.id === activeList ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l))
    );
  };

  const handleReorderListCategory = async (categoryKey: string, delta: number) => {
    if (!currentList) return;
    const allKeys = orderedKeysForList(currentList);
    const idx = allKeys.indexOf(categoryKey);
    const j = idx + delta;
    if (idx < 0 || j < 0 || j >= allKeys.length) return;
    const next = [...allKeys];
    const a = next[idx]!;
    const b = next[j]!;
    next[idx] = b;
    next[j] = a;
    const listsSnapshot = lists.map((l) => ({
      ...l,
      categoryOrder: [...(l.categoryOrder ?? [])],
      items: l.items.map((i) => ({ ...i })),
    }));
    setLists((prev) => prev.map((l) => (l.id === currentList.id ? { ...l, categoryOrder: next } : l)));
    try {
      const res = await fetch(`/api/shopping/${currentList.id}?type=list`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryOrder: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLists(listsSnapshot);
      toast.error(t.toastCategoryReorderError);
    }
  };

  const handleReorderShoppingList = async (listId: string, delta: number) => {
    const sorted = [...lists].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const idx = sorted.findIndex((l) => l.id === listId);
    const j = idx + delta;
    if (idx < 0 || j < 0 || j >= sorted.length) return;
    const swapped = [...sorted];
    const a = swapped[idx]!;
    const b = swapped[j]!;
    swapped[idx] = b;
    swapped[j] = a;
    const reordered = swapped.map((l, i) => ({ ...l, sortOrder: i }));
    const orderedIds = reordered.map((l) => l.id);
    const listsSnapshot = lists.map((l) => ({
      ...l,
      sortOrder: l.sortOrder,
      categoryOrder: [...(l.categoryOrder ?? [])],
      items: l.items.map((i) => ({ ...i })),
    }));
    setLists(reordered);
    try {
      const res = await fetch("/api/shopping/lists/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLists(listsSnapshot);
      toast.error(t.toastListReorderError);
    }
  };

  const progress =
    currentList && currentList.items.length > 0
      ? Math.round((checkedItems.length / currentList.items.length) * 100)
      : 0;

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 md:gap-6">
      <div className="w-full md:w-56">
        <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          {sortedLists.map((list, listIndex) => (
            <div
              key={list.id}
              className={cn(
                "shrink-0 min-w-[180px] md:min-w-0 flex items-stretch rounded-2xl transition-all",
                activeList === list.id ? "bg-white shadow-cozy text-warm-800" : "text-warm-500 hover:bg-white/50"
              )}
            >
              <motion.button
                type="button"
                whileHover={{ x: 2 }}
                onClick={() => setActiveList(list.id)}
                className="flex-1 min-w-0 flex items-center gap-3 p-3 text-left rounded-2xl"
              >
                <ShoppingCart size={18} className="text-warm-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                    {list.isPrivate && <Lock size={12} className="text-warm-400 shrink-0" aria-hidden />}
                    <span className="truncate">{list.name}</span>
                  </p>
                  <p className="text-xs text-warm-400">
                    {list.items.length} {t.listItemsCount}
                  </p>
                </div>
              </motion.button>
              {sortedLists.length > 1 && (
                <div className="flex flex-col justify-center gap-0.5 py-2 pr-2 shrink-0 border-l border-warm-100/80">
                  <button
                    type="button"
                    aria-label={t.listMoveUp}
                    disabled={listIndex === 0}
                    onClick={() => void handleReorderShoppingList(list.id, -1)}
                    className="p-1 rounded-lg text-warm-300 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={t.listMoveDown}
                    disabled={listIndex === sortedLists.length - 1}
                    onClick={() => void handleReorderShoppingList(list.id, 1)}
                    className="p-1 rounded-lg text-warm-300 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          <motion.button
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddList(true)}
            className="shrink-0 min-w-[180px] md:min-w-0 flex items-center gap-2 p-3 rounded-2xl text-warm-400 hover:text-rose-500 border-2 border-dashed border-warm-200 hover:border-rose-300 transition-all"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">{t.newList}</span>
          </motion.button>
        </div>
      </div>

      {currentList ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white/80 rounded-3xl p-5 shadow-cozy border border-warm-100 mb-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-warm-800">{currentList.name}</h2>
                <p className="text-sm text-warm-400">
                  {checkedItems.length} {t.boughtProgressLabel} {currentList.items.length} {t.boughtProgressDone}
                </p>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-rose-500">{progress}%</div>
            </div>
            <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="bg-white/70 rounded-3xl p-4 shadow-cozy border border-warm-100 mb-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={newItem.name}
                  onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  placeholder={t.addItemPlaceholder}
                  className="flex-1 bg-warm-50 rounded-xl px-4 py-2.5 text-sm outline-none border border-warm-200 focus:border-rose-300"
                />
                <input
                  value={newItem.quantity}
                  onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                  placeholder={t.quantityShort}
                  className="w-full sm:w-20 bg-warm-50 rounded-xl px-3 py-2.5 text-sm outline-none border border-warm-200 focus:border-rose-300"
                />
                <input
                  value={newItem.unit}
                  onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))}
                  placeholder={t.unitShort}
                  className="w-full sm:w-16 bg-warm-50 rounded-xl px-3 py-2.5 text-sm outline-none border border-warm-200 focus:border-rose-300"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddItem}
                  className="w-full sm:w-auto px-4 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors"
                >
                  <Plus size={18} />
                </motion.button>
              </div>
              <input
                value={newItem.category}
                onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                placeholder={t.categoryPlaceholder}
                className="w-full bg-warm-50 rounded-xl px-4 py-2.5 text-sm outline-none border border-warm-200 focus:border-rose-300"
              />
              <label className="flex items-center gap-2 text-xs text-warm-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newItemPrivate}
                  onChange={(e) => setNewItemPrivate(e.target.checked)}
                  className="rounded border-warm-300"
                />
                {t.privateItem}
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {listDerived &&
              listDerived.keysUnchecked.map((catKey) => {
                const items = listDerived.uncheckedByCat[catKey] ?? [];
                const allKeys = listDerived.allKeys;
                const catIdx = allKeys.indexOf(catKey);
                return (
                  <div key={`u-${catKey || "_"}`} className="space-y-2">
                    <div className="flex items-center justify-between gap-2 px-1 pt-1">
                      <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide">
                        {catKey === "" ? t.uncategorized : catKey}
                      </p>
                      {allKeys.length > 1 && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            aria-label={t.categoryMoveUp}
                            disabled={catIdx <= 0}
                            onClick={() => void handleReorderListCategory(catKey, -1)}
                            className="p-1 rounded-lg text-warm-300 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label={t.categoryMoveDown}
                            disabled={catIdx >= allKeys.length - 1}
                            onClick={() => void handleReorderListCategory(catKey, 1)}
                            className="p-1 rounded-lg text-warm-300 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-white/80 rounded-2xl px-4 py-3 shadow-sm border border-warm-100 group hover:shadow-cozy transition-[box-shadow,border-color]"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggle(item)}
                          className="w-6 h-6 rounded-full border-2 border-warm-300 hover:border-rose-400 flex items-center justify-center transition-colors flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-warm-800 text-sm flex items-center gap-1.5">
                            {item.isPrivate && item.addedBy.id === currentUserId && (
                              <Lock size={12} className="text-warm-400 shrink-0" aria-hidden />
                            )}
                            <span>{item.name}</span>
                          </p>
                          {(item.quantity || item.unit) && (
                            <span className="text-xs text-warm-400">
                              {item.quantity} {item.unit}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                            style={{ backgroundColor: item.addedBy.color }}
                          >
                            {item.addedBy.name?.[0]}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-warm-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

            {checkedItems.length > 0 && listDerived && (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-semibold text-warm-400 mb-2 px-1">
                  {t.boughtSection} ({checkedItems.length})
                </p>
                {listDerived.keysChecked.map((catKey) => {
                  const items = listDerived.checkedByCat[catKey] ?? [];
                  const allKeys = listDerived.allKeys;
                  const catIdx = allKeys.indexOf(catKey);
                  return (
                    <div key={`c-${catKey || "_"}`} className="space-y-2">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <p className="text-[11px] font-semibold text-warm-400 uppercase tracking-wide">
                          {catKey === "" ? t.uncategorized : catKey}
                        </p>
                        {allKeys.length > 1 && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              aria-label={t.categoryMoveUp}
                              disabled={catIdx <= 0}
                              onClick={() => void handleReorderListCategory(catKey, -1)}
                              className="p-1 rounded-lg text-warm-300 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label={t.categoryMoveDown}
                              disabled={catIdx >= allKeys.length - 1}
                              onClick={() => void handleReorderListCategory(catKey, 1)}
                              className="p-1 rounded-lg text-warm-300 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 bg-warm-50/80 rounded-2xl px-4 py-3 border border-warm-100 group opacity-60"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggle(item)}
                            className="w-6 h-6 rounded-full bg-sage-400 border-2 border-sage-400 flex items-center justify-center flex-shrink-0"
                          >
                            <Check size={12} className="text-white" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-warm-500 text-sm line-through flex items-center gap-1.5">
                              {item.isPrivate && item.addedBy.id === currentUserId && (
                                <Lock size={12} className="text-warm-400 shrink-0" aria-hidden />
                              )}
                              <span>{item.name}</span>
                            </p>
                            {(item.quantity || item.unit) && (
                              <span className="text-xs text-warm-400">
                                {item.quantity} {item.unit}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-warm-300 hover:text-rose-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {currentList.items.length === 0 && (
              <div className="text-center py-12 text-warm-400">
                <div className="mb-3 flex justify-center">
                  <ShoppingCart className="h-12 w-12 text-warm-400" />
                </div>
                <p className="font-semibold mb-1">{t.emptyListTitle}</p>
                <p className="text-sm">{t.emptyListHint}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-warm-400">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <ShoppingCart className="h-12 w-12 text-warm-400" />
            </div>
            <p className="font-semibold mb-4">{t.noListsTitle}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddList(true)}
              className="px-6 py-3 bg-rose-500 text-white rounded-2xl font-medium hover:bg-rose-600 transition-colors"
            >
              {t.createListCta}
            </motion.button>
          </div>
        </div>
      )}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showAddList && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAddList(false)}
                  className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 16 }}
                  className="relative z-10 w-full max-w-sm"
                >
                  <div className="bg-white rounded-3xl shadow-cozy-lg p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-lg font-bold text-warm-800">{t.addListModalTitle}</h2>
                      <button
                        onClick={() => setShowAddList(false)}
                        className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="w-10 h-10 rounded-xl bg-warm-50 border border-warm-200 flex items-center justify-center">
                        <ShoppingCart size={18} className="text-warm-600" />
                      </div>
                      <input
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddList()}
                        placeholder={t.addListPlaceholder}
                        className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm outline-none border border-warm-200 focus:border-rose-300"
                      />
                      <label className="flex items-center gap-2 text-sm text-warm-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newListPrivate}
                          onChange={(e) => setNewListPrivate(e.target.checked)}
                          className="rounded border-warm-300"
                        />
                        {t.privateList}
                      </label>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAddList}
                        className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-400 text-white rounded-2xl font-semibold"
                      >
                        {t.create}
                      </motion.button>
                    </div>
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
