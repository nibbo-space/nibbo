"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlarmClock, Calendar, Lock, Trash2, GripVertical, Pencil } from "lucide-react";
import { cn, formatDate, PRIORITY_CONFIG } from "@/lib/utils";
import { useUserPreferences } from "@/components/shared/UserPreferencesProvider";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { I18N } from "@/lib/i18n";

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
  const dtOpts = { timeZone, locale: language === "en" ? "en-US" : "uk-UA" } as const;
  const t = I18N[language].task.card;
  const tp = I18N[language].task.priority;
  const userFallback = I18N[language].task.userFallback;
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
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-2xl p-3 shadow-sm border border-warm-100 cursor-pointer group",
        "hover:shadow-cozy hover:border-rose-100 transition-[box-shadow,border-color]",
        isDragging && "rotate-2 scale-105 shadow-cozy-hover"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 text-warm-300 hover:text-warm-500 cursor-grab active:cursor-grabbing opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <GripVertical size={14} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            {!isDragging && onCompletedChange && (
              <input
                type="checkbox"
                checked={task.completed}
                onChange={(e) => onCompletedChange(e.target.checked)}
                onPointerDown={(e) => e.stopPropagation()}
                className="mt-0.5 w-4 h-4 rounded border-warm-300 text-rose-500 focus:ring-rose-400 cursor-pointer flex-shrink-0"
                aria-label={t.markCompletedAria}
              />
            )}
            <div className="flex items-start gap-1 flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium text-warm-800 leading-snug flex-1 min-w-0",
                  task.completed && "line-through text-warm-400"
                )}
              >
                {task.title}
              </p>
              {task.isPrivate && (
                <Lock size={12} className="text-warm-400 shrink-0 mt-0.5" aria-hidden />
              )}
              {task.reminderCadenceDays != null && task.reminderCadenceDays > 0 && (
                <AlarmClock size={12} className="text-amber-600 shrink-0 mt-0.5" aria-hidden />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            {!isDragging && onPriorityChange ? (
              <select
                value={task.priority}
                onChange={(e) => onPriorityChange(e.target.value as Task["priority"])}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer outline-none max-w-full",
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
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priority.color)}>
                {priority.emoji} {tp[task.priority]}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-warm-400 mb-2 line-clamp-2">{task.description}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {task.dueDate && (
                <div className="flex items-center gap-1 text-xs text-warm-400">
                  <Calendar size={11} />
                  <span>{formatDate(task.dueDate, dtOpts)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 min-w-[58px] justify-end">
              {!onAssigneeChange && task.assignee && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-medium ring-2 ring-white"
                  style={{ backgroundColor: task.assignee.color }}
                  title={task.assignee.name || ""}
                >
                  {task.assignee.emoji || task.assignee.name?.[0]}
                </div>
              )}

              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className={cn(
                    "w-6 h-6 rounded-lg bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center transition-[opacity,transform,background-color] ml-1",
                    showActions ? "opacity-100 scale-100 pointer-events-auto" : "opacity-100 md:opacity-0 scale-100 md:scale-95 md:pointer-events-none"
                  )}
                >
                  <Pencil size={11} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className={cn(
                    "w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 flex items-center justify-center transition-[opacity,transform,background-color] ml-1",
                    showActions ? "opacity-100 scale-100 pointer-events-auto" : "opacity-100 md:opacity-0 scale-100 md:scale-95 md:pointer-events-none"
                  )}
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </div>

          {!isDragging && onAssigneeChange && users.length > 0 && !task.isPrivate && (
            <select
              value={task.assignee?.id ?? ""}
              onChange={(e) => onAssigneeChange(e.target.value || null)}
              onPointerDown={(e) => e.stopPropagation()}
              className="mt-2 w-full bg-warm-50 rounded-xl px-2 py-1.5 text-xs text-warm-800 border border-warm-200 focus:border-rose-300 outline-none"
            >
              <option value="">{t.unassigned}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.emoji} {u.name ?? userFallback}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
