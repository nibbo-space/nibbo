"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { PRIORITY_CONFIG } from "@/lib/utils";
import type { TaskBoardTask, TaskBoardUser } from "@/lib/task-board";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";

const PRIOS: TaskBoardTask["priority"][] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function minToHm(m: number | null | undefined): string {
  if (m == null || Number.isNaN(m)) return "09:00";
  const h = Math.floor(m / 60);
  const mi = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

function parseHmToMin(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number.parseInt(m[1], 10);
  const mi = Number.parseInt(m[2], 10);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

interface TaskEditModalProps {
  open: boolean;
  task: TaskBoardTask | null;
  users: TaskBoardUser[];
  boardIsPrivate: boolean;
  currentUserId: string;
  onClose: () => void;
  onSave: (taskId: string, payload: Record<string, unknown>) => Promise<void>;
}

export default function TaskEditModal({
  open,
  task,
  users,
  boardIsPrivate,
  currentUserId,
  onClose,
  onSave,
}: TaskEditModalProps) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].task.editModal;
  const tp = I18N[messageLocale(language)].task.priority;
  const userFallback = I18N[messageLocale(language)].task.userFallback;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [completed, setCompleted] = useState(false);
  const [priority, setPriority] = useState<TaskBoardTask["priority"]>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderCadence, setReminderCadence] = useState("7");
  const [reminderStart, setReminderStart] = useState("09:00");
  const [reminderEnd, setReminderEnd] = useState("12:00");

  const syncReminderFromTask = useCallback((tk: TaskBoardTask) => {
    const cad = tk.reminderCadenceDays;
    setReminderEnabled(Boolean(cad != null && cad > 0));
    setReminderCadence(String(cad && cad > 0 ? cad : 7));
    setReminderStart(minToHm(tk.reminderWindowStartMin));
    setReminderEnd(minToHm(tk.reminderWindowEndMin));
  }, []);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setCompleted(task.completed);
    setPriority(task.priority);
    setAssigneeId(task.assignee?.id ?? "");
    setIsPrivate(task.isPrivate);
    syncReminderFromTask(task);
  }, [task, syncReminderFromTask]);

  const handleSave = async () => {
    if (!task?.id || !title.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        completed,
        priority,
        assigneeId: boardIsPrivate || isPrivate ? currentUserId : assigneeId || null,
        isPrivate,
      };
      if (reminderEnabled) {
        let sm = parseHmToMin(reminderStart) ?? 9 * 60;
        let em = parseHmToMin(reminderEnd) ?? 12 * 60;
        if (sm >= em) em = Math.min(24 * 60 - 1, sm + 60);
        const n = Math.max(1, Math.min(365, Number.parseInt(reminderCadence, 10) || 7));
        payload.reminderCadenceDays = n;
        payload.reminderWindowStartMin = sm;
        payload.reminderWindowEndMin = em;
      } else {
        payload.reminderCadenceDays = null;
      }
      await onSave(task.id, payload);
      onClose();
    } catch {
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  if (!task || typeof document === "undefined") return null;

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
            className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-white rounded-3xl shadow-cozy-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-warm-800">{t.title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.titlePlaceholder}
                  className="w-full bg-warm-50 rounded-xl px-3 py-2 text-sm text-warm-800 border border-warm-200 focus:border-rose-300 outline-none"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.descriptionPlaceholder}
                  rows={3}
                  className="w-full bg-warm-50 rounded-xl px-3 py-2 text-sm text-warm-800 border border-warm-200 focus:border-rose-300 outline-none resize-none"
                />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-warm-50 rounded-xl px-3 py-2 text-sm text-warm-800 border border-warm-200 focus:border-rose-300 outline-none"
                />
                <label className="flex items-center gap-2 text-sm text-warm-700">
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={(e) => setCompleted(e.target.checked)}
                    className="rounded border-warm-300"
                  />
                  {t.completed}
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskBoardTask["priority"])}
                  className="w-full bg-warm-50 rounded-xl px-3 py-2 text-sm text-warm-800 border border-warm-200 outline-none"
                >
                  {PRIOS.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_CONFIG[p].emoji} {tp[p]}
                    </option>
                  ))}
                </select>
                {users.length > 0 && !boardIsPrivate && !isPrivate && (
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full bg-warm-50 rounded-xl px-3 py-2 text-sm text-warm-800 border border-warm-200 outline-none"
                  >
                    <option value="">{t.noAssignee}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.emoji} {u.name ?? userFallback}
                      </option>
                    ))}
                  </select>
                )}
                {!boardIsPrivate && (
                  <label className="flex items-center gap-2 text-sm text-warm-700">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="rounded border-warm-300"
                    />
                    {t.privateTask}
                  </label>
                )}
                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-900/90">{t.reminderSection}</p>
                  <label className="flex items-center gap-2 text-sm text-warm-800">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                      className="rounded border-warm-300"
                    />
                    {t.reminderEnable}
                  </label>
                  {reminderEnabled && (
                    <>
                      <label className="block text-xs text-warm-600">
                        <span className="block mb-1">{t.reminderCadenceLabel}</span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={reminderCadence}
                          onChange={(e) => setReminderCadence(e.target.value)}
                          className="w-full bg-white rounded-xl px-3 py-2 text-sm border border-warm-200 outline-none focus:border-rose-300"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs text-warm-600">
                          <span className="block mb-1">{t.reminderFrom}</span>
                          <input
                            type="time"
                            value={reminderStart}
                            onChange={(e) => setReminderStart(e.target.value)}
                            className="w-full bg-white rounded-xl px-2 py-2 text-sm border border-warm-200 outline-none focus:border-rose-300"
                          />
                        </label>
                        <label className="text-xs text-warm-600">
                          <span className="block mb-1">{t.reminderTo}</span>
                          <input
                            type="time"
                            value={reminderEnd}
                            onChange={(e) => setReminderEnd(e.target.value)}
                            className="w-full bg-white rounded-xl px-2 py-2 text-sm border border-warm-200 outline-none focus:border-rose-300"
                          />
                        </label>
                      </div>
                      <p className="text-[11px] text-warm-600 leading-snug">{t.reminderHint}</p>
                    </>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !title.trim()}
                    className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 disabled:opacity-50"
                  >
                    {t.save}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-warm-100 text-warm-600 rounded-xl text-sm"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
