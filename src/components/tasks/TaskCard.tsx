"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlarmClock, Calendar, Lock, Trash2, GripVertical, Pencil, Check } from "lucide-react";
import { cn, formatDate, PRIORITY_CONFIG } from "@/lib/utils";
import { useUserPreferences } from "@/components/shared/UserPreferencesProvider";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { intlLocaleForUi, messageLocale, I18N } from "@/lib/i18n";

interface User { id: string; name: string | null; image: string | null; color: string; emoji: string; }
interface Task {
  id: string; title: string; description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null; completed: boolean; order: number;
  columnId: string; isPrivate?: boolean;
  assignee: User | null; creator: User; labels: string[];
  reminderCadenceDays?: number | null;
}

interface TaskCardProps {
  task: Task;
  users: User[];
  onDelete?: () => void;
  onAssigneeChange?: (assigneeId: string | null) => void;
  onPriorityChange?: (priority: Task["priority"]) => void;
  onCompletedChange?: (completed: boolean) => void;
  onEdit?: () => void;
  isDragging?: boolean;
}

const CARD_PRIORITIES: Task["priority"][] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export default function TaskCard({
  task,
  users,
  onDelete,
  onAssigneeChange,
  onPriorityChange,
  onCompletedChange,
  onEdit,
  isDragging,
}: TaskCardProps) {
  const { language } = useAppLanguage();
  const { timeZone } = useUserPreferences();
  const dtOpts = { timeZone, locale: intlLocaleForUi(language) } as const;
  const taskMessages = I18N[messageLocale(language)].task;
  const t = taskMessages.card;
  const tp = taskMessages.priority;
  const userFallback = taskMessages.userFallback;
  const [showActions, setShowActions] = useState(false);
  const priority = PRIORITY_CONFIG[task.priority];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color]",
        "hover:border-slate-300/80 hover:shadow-[0_6px_16px_rgba(15,23,42,0.1)]",
        isDragging && "scale-[1.01]"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 shrink-0 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
          aria-label="Drag task"
        >
          <GripVertical size={14} />
        </button>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            {!isDragging && onPriorityChange ? (
              <select
                value={task.priority}
                onChange={(e) => onPriorityChange(e.target.value as Task["priority"])}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  "rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold outline-none max-w-[120px]",
                  priority.color
                )}
              >
                {CARD_PRIORITIES.map((p) => {
                  const c = PRIORITY_CONFIG[p];
                  return (
                    <option key={p} value={p}>
                      {c.emoji} {tp[p]}
                    </option>
                  );
                })}
              </select>
            ) : (
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", priority.color)}>
                {priority.emoji} {tp[task.priority]}
              </span>
            )}

            <div className="flex items-center gap-1 shrink-0">
              {onEdit ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className={cn(
                    "h-6 w-6 rounded-md bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 flex items-center justify-center transition-[opacity,color,background-color]",
                    showActions ? "opacity-100" : "opacity-100 md:opacity-70"
                  )}
                >
                  <Pencil size={11} />
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className={cn(
                    "h-6 w-6 rounded-md bg-rose-50 text-rose-300 hover:bg-rose-100 hover:text-rose-500 flex items-center justify-center transition-[opacity,color,background-color]",
                    showActions ? "opacity-100" : "opacity-100 md:opacity-70"
                  )}
                >
                  <Trash2 size={11} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <h4
              className={cn(
                "text-[15px] font-semibold leading-snug text-slate-800 break-words",
                task.completed && "line-through text-slate-400"
              )}
            >
              {task.title}
            </h4>

            {task.description ? (
              <p className="text-sm leading-relaxed text-slate-500 line-clamp-2 break-words">{task.description}</p>
            ) : null}
          </div>

          {!isDragging && onAssigneeChange && users.length > 0 && !task.isPrivate ? (
            <select
              value={task.assignee?.id ?? ""}
              onChange={(e) => onAssigneeChange(e.target.value || null)}
              onPointerDown={(e) => e.stopPropagation()}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-rose-300"
            >
              <option value="">{t.unassigned}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.emoji} {u.name ?? userFallback}
                </option>
              ))}
            </select>
          ) : null}

          <div className="flex items-start justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              {task.dueDate ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={11} />
                  <span>{formatDate(task.dueDate, dtOpts)}</span>
                </span>
              ) : null}
              {task.isPrivate ? <Lock size={12} aria-hidden /> : null}
              {task.reminderCadenceDays != null && task.reminderCadenceDays > 0 ? <AlarmClock size={12} aria-hidden /> : null}
              {!onAssigneeChange && task.assignee ? (
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center text-xs text-white font-medium shrink-0"
                  style={{ backgroundColor: task.assignee.color }}
                  title={task.assignee.name || ""}
                >
                  {task.assignee.emoji || task.assignee.name?.[0]}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!isDragging && onCompletedChange && !task.completed ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompletedChange(true);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  aria-label={t.markCompletedAria}
                  title={t.markCompletedAria}
                >
                  <Check size={13} />
                </button>
              ) : task.completed ? (
                <span className="text-[11px] font-medium text-emerald-600">{taskMessages.editModal.completed}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
