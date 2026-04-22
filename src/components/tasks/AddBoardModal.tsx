"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { USER_EMOJIS, displayEmojiToken, cn } from "@/lib/utils";

const BOARD_ICON_EMOJIS = [
  "📋",
  "📌",
  "✅",
  "🎯",
  "📁",
  "💼",
  "📝",
  "📅",
  "🛒",
  "⏰",
  "🔔",
  "⚡",
  "🚀",
  "💡",
];

const COLORS = ["#f43f5e", "#fb923c", "#facc15", "#4ade80", "#38bdf8", "#818cf8", "#c084fc", "#f472b6"];

interface AddBoardModalProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (name: string, emoji: string, color: string, isPrivate: boolean) => void;
  editBoard?: { id: string; name: string; emoji: string; color: string; isPrivate: boolean } | null;
  onUpdate?: (id: string, name: string, emoji: string, color: string, isPrivate: boolean) => void;
  onDeleteBoard?: (id: string) => void;
}

export default function AddBoardModal({
  open,
  onClose,
  onAdd,
  editBoard,
  onUpdate,
  onDeleteBoard,
}: AddBoardModalProps) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].task.addBoardModal;
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("📋");
  const [selectedColor, setSelectedColor] = useState("#f43f5e");
  const [isPrivate, setIsPrivate] = useState(false);

  const isEdit = Boolean(editBoard);

  useEffect(() => {
    if (!open) return;
    if (editBoard) {
      setName(editBoard.name);
      setSelectedEmoji(displayEmojiToken(editBoard.emoji) || "📋");
      setSelectedColor(editBoard.color);
      setIsPrivate(editBoard.isPrivate);
    } else {
      setName("");
      setSelectedEmoji("📋");
      setSelectedColor("#f43f5e");
      setIsPrivate(false);
    }
  }, [open, editBoard]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (isEdit && editBoard && onUpdate) {
      onUpdate(editBoard.id, name.trim(), selectedEmoji, selectedColor, isPrivate);
    } else if (onAdd) {
      onAdd(name.trim(), selectedEmoji, selectedColor, isPrivate);
    }
    if (!isEdit) {
      setName("");
      setSelectedEmoji("📋");
      setSelectedColor("#f43f5e");
      setIsPrivate(false);
    }
  };

  const emojiPicker = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (e: string) => {
      const v = e.trim();
      if (!v || seen.has(v)) return;
      seen.add(v);
      out.push(v);
    };
    add(selectedEmoji);
    BOARD_ICON_EMOJIS.forEach(add);
    USER_EMOJIS.forEach(add);
    return out;
  }, [selectedEmoji]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="relative z-10 w-full max-w-md"
          >
            <div className="bg-white rounded-3xl shadow-cozy-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-warm-800">
                  {isEdit ? t.editTitle : t.newTitle}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-warm-600 mb-2 block">{t.boardNameLabel}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.boardNamePlaceholder}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder:text-warm-400 outline-none border border-warm-200 focus:border-rose-300"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-warm-600 mb-2">{t.iconLabel}</p>
                  <div className="mb-2 flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-warm-200 bg-warm-50 text-2xl leading-none"
                      aria-hidden
                    >
                      {displayEmojiToken(selectedEmoji) || selectedEmoji}
                    </div>
                    <p className="text-xs text-warm-500">{t.iconHint}</p>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-2xl border border-warm-200 bg-warm-50 p-2">
                    <div className="flex flex-wrap gap-1.5">
                      {emojiPicker.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setSelectedEmoji(e)}
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg leading-none transition-colors",
                            selectedEmoji === e
                              ? "bg-white ring-2 ring-rose-400"
                              : "bg-white/70 hover:bg-white"
                          )}
                        >
                          <span className="select-none">{e}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-warm-600 mb-2 block">{t.colorLabel}</label>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          selectedColor === c ? "ring-2 ring-offset-2 ring-warm-400 scale-110" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-warm-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="rounded border-warm-300"
                  />
                  {t.privateBoard}
                </label>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-400 text-white rounded-2xl font-semibold hover:shadow-cozy transition-all mt-2"
                >
                  {isEdit ? t.save : t.createBoard}
                </motion.button>
                {isEdit && editBoard && onDeleteBoard && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t.deleteBoardConfirm)) {
                        onDeleteBoard(editBoard.id);
                        onClose();
                      }
                    }}
                    className="w-full py-2.5 text-sm text-rose-600 hover:bg-rose-50 rounded-xl mt-2"
                  >
                    {t.deleteBoard}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
