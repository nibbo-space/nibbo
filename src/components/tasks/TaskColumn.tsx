"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Pencil, Trash2, GripHorizontal } from "lucide-react";
import TaskCard from "./TaskCard";
import type { TaskBoardColumn, TaskBoardTask, TaskBoardUser } from "@/lib/task-board";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";

interface TaskColumnProps {
  column: TaskBoardColumn;
  users: TaskBoardUser[];
  onRequestCreateTask: (columnId: string) => void;
  onDeleteTask: (taskId: string, columnId: string) => void;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
  onPriorityChange: (taskId: string, priority: TaskBoardTask["priority"]) => void;
  onCompletedChange: (taskId: string, completed: boolean) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onEditTask: (task: TaskBoardTask) => void;
}

export default function TaskColumn({
  column,
  users,
  onRequestCreateTask,
  onDeleteTask,
  onAssigneeChange,
  onPriorityChange,
  onCompletedChange,
  onRenameColumn,
  onDeleteColumn,
  onEditTask,
}: TaskColumnProps) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].task.column;
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: column.id });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setSortableRef(node);
      setDroppableRef(node);
    },
    [setSortableRef, setDroppableRef]
  );

  const columnEmoji = column.emoji === "column" ? "📋" : column.emoji;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const startRename = () => {
    setRenameValue(column.name);
    setRenaming(true);
  };

  const commitRename = () => {
    if (renameValue.trim() && renameValue.trim() !== column.name) {
      void onRenameColumn(column.id, renameValue.trim());
    }
    setRenaming(false);
  };

  return (
    <div
      ref={setRefs}
      style={style}
      className={`w-[calc(100vw-2.5rem)] sm:w-72 flex-shrink-0 snap-start bg-white/60 backdrop-blur-sm rounded-3xl border transition-[border-color,box-shadow,background-color] flex flex-col min-h-0 ${
        isOver ? "border-rose-300 shadow-cozy-hover bg-rose-50/50" : "border-warm-100 shadow-cozy"
      }`}
    >
      <div className="p-4 border-b border-warm-100">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <button
              type="button"
              className="p-1 text-warm-300 hover:text-warm-500 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
              aria-label={t.dragAria}
              {...attributes}
              {...listeners}
            >
              <GripHorizontal size={16} />
            </button>
            {renaming ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="flex-1 min-w-0 bg-warm-50 rounded-lg px-2 py-1 text-sm font-semibold text-warm-800 border border-warm-200 outline-none focus:border-rose-300"
              />
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg flex-shrink-0 leading-none" aria-hidden>
                  {columnEmoji}
                </span>
                <h3 className="font-semibold text-warm-800 text-sm truncate">{column.name}</h3>
                <span className="bg-warm-100 text-warm-500 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                  {column.tasks.length}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={startRename}
              className="w-7 h-7 rounded-lg bg-warm-100 hover:bg-warm-200 text-warm-500 flex items-center justify-center transition-colors"
              aria-label={t.renameAria}
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => onDeleteColumn(column.id)}
              className="w-7 h-7 rounded-lg bg-warm-100 hover:bg-rose-100 text-warm-500 hover:text-rose-500 flex items-center justify-center transition-colors"
              aria-label={t.deleteAria}
            >
              <Trash2 size={12} />
            </button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onRequestCreateTask(column.id)}
              className="w-7 h-7 rounded-lg bg-warm-100 hover:bg-rose-100 text-warm-500 hover:text-rose-500 flex items-center justify-center transition-colors"
              aria-label={t.addTask}
            >
              <Plus size={14} />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2 min-h-[100px] max-h-[60dvh] sm:max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-hide flex-1">
        <SortableContext items={column.tasks.map((tk) => tk.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              users={users}
              onDelete={() => onDeleteTask(task.id, column.id)}
              onAssigneeChange={(assigneeId) => onAssigneeChange(task.id, assigneeId)}
              onPriorityChange={(priority) => onPriorityChange(task.id, priority)}
              onCompletedChange={(completed) => onCompletedChange(task.id, completed)}
              onEdit={() => onEditTask(task)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
