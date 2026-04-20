"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import toast from "react-hot-toast";
import { Columns3, GripVertical, Lock, Plus, Settings2, SquareKanban, X } from "lucide-react";
import {
  normalizeBoardsPayload,
  type TaskBoardBoard,
  type TaskBoardColumn,
  type TaskBoardTask,
  type TaskBoardUser,
} from "@/lib/task-board";
import {
  TASK_POINTS_AWARDED_EVENT,
} from "@/lib/task-points";
import TaskColumn from "./TaskColumn";
import TaskCard from "./TaskCard";
import AddBoardModal from "./AddBoardModal";
import TaskEditModal from "./TaskEditModal";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";

interface TaskBoardProps {
  initialBoards: TaskBoardBoard[];
  users: TaskBoardUser[];
  currentUserId: string;
}

type TaskPatchResponse = TaskBoardTask & { awardedPoints?: number };
type AssigneeFilter = "ALL" | "ME" | "UNASSIGNED" | `USER:${string}`;

async function fetchBoards(): Promise<TaskBoardBoard[]> {
  const res = await fetch("/api/tasks");
  if (!res.ok) return [];
  const data = await res.json();
  return normalizeBoardsPayload(data);
}

function withAlpha(hex: string, alpha: string) {
  return `${hex}${alpha}`;
}

function matchesAssigneeFilter(task: TaskBoardTask, filter: AssigneeFilter, currentUserId: string) {
  if (filter === "ALL") return true;
  if (filter === "ME") return task.assignee?.id === currentUserId;
  if (filter === "UNASSIGNED") return !task.assignee;
  if (filter.startsWith("USER:")) return task.assignee?.id === filter.slice(5);
  return true;
}

function mergeTaskIntoBoards(prev: TaskBoardBoard[], task: TaskBoardTask): TaskBoardBoard[] {
  if (task.completed) {
    return prev.map((b) => ({
      ...b,
      columns: b.columns.map((c) => ({
        ...c,
        tasks: c.tasks.filter((t) => t.id !== task.id),
      })),
    }));
  }
  return prev.map((b) => ({
    ...b,
    columns: b.columns.map((c) => {
      const rest = c.tasks.filter((t) => t.id !== task.id);
      if (c.id !== task.columnId) return { ...c, tasks: rest };
      const nextTasks = [...rest, task].sort((a, b) => a.order - b.order);
      return { ...c, tasks: nextTasks };
    }),
  }));
}

function SortableBoardTab({
  board,
  active,
  onSelect,
  onEditSettings,
  dragAriaLabel,
  settingsAriaLabel,
}: {
  board: TaskBoardBoard;
  active: boolean;
  onSelect: () => void;
  onEditSettings: () => void;
  dragAriaLabel: string;
  settingsAriaLabel: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    ...(active
      ? {
          backgroundColor: withAlpha(board.color, "1F"),
          borderColor: withAlpha(board.color, "66"),
        }
      : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center rounded-xl flex-shrink-0 border transition-all ${
        active
          ? "shadow-cozy text-warm-800"
          : "border-transparent text-warm-500 hover:text-warm-700 hover:bg-white/50"
      }`}
    >
      <button
        type="button"
        className="hidden md:block px-1.5 py-2 text-warm-300 hover:text-warm-500 cursor-grab active:cursor-grabbing touch-none"
        aria-label={dragAriaLabel}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex items-center gap-2 px-2 py-2 text-sm font-medium whitespace-nowrap"
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: board.color }}
        />
        <span className="flex items-center gap-1.5">
          {board.isPrivate && <Lock size={12} className="text-warm-400 shrink-0" aria-hidden />}
          <span>{board.name}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEditSettings();
        }}
        className="p-2 text-warm-400 hover:text-rose-500 rounded-lg hover:bg-rose-50/80"
        aria-label={settingsAriaLabel}
      >
        <Settings2 size={14} />
      </button>
    </div>
  );
}

export default function TaskBoard({ initialBoards, users, currentUserId }: TaskBoardProps) {
  const { language } = useAppLanguage();
  const taskI18n = I18N[messageLocale(language)].task;
  const t = taskI18n.board;
  const [boards, setBoards] = useState<TaskBoardBoard[]>(initialBoards);
  const [activeBoard, setActiveBoard] = useState(initialBoards[0]?.id ?? "");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("ALL");
  const [activeMobileColumn, setActiveMobileColumn] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskBoardTask | null>(null);
  const [activeColumn, setActiveColumn] = useState<TaskBoardColumn | null>(null);
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [editBoard, setEditBoard] = useState<TaskBoardBoard | null>(null);
  const [editTask, setEditTask] = useState<TaskBoardTask | null>(null);
  const prevActiveBoardRef = useRef<string | undefined>(undefined);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const isFilterAll = assigneeFilter === "ALL";
  const currentBoard = boards.find((b) => b.id === activeBoard);
  const boardForView = useMemo(() => {
    if (!currentBoard) return null;
    const columns = currentBoard.columns.map((column) => ({
      ...column,
      tasks: column.tasks.filter((task) => matchesAssigneeFilter(task, assigneeFilter, currentUserId)),
    }));
    return { ...currentBoard, columns };
  }, [assigneeFilter, currentBoard, currentUserId]);
  const mobileColumn = boardForView?.columns.find((c) => c.id === activeMobileColumn) ?? boardForView?.columns[0];
  const visibleTasksCount = boardForView?.columns.reduce((sum, column) => sum + column.tasks.length, 0) ?? 0;

  const reloadBoards = useCallback(async () => {
    const next = await fetchBoards();
    setBoards(next);
    setActiveBoard((prev) => {
      if (next.some((b) => b.id === prev)) return prev;
      return next[0]?.id ?? "";
    });
  }, []);

  useEffect(() => {
    if (prevActiveBoardRef.current === undefined) {
      prevActiveBoardRef.current = activeBoard;
      return;
    }
    if (prevActiveBoardRef.current === activeBoard) return;
    prevActiveBoardRef.current = activeBoard;
    void reloadBoards();
  }, [activeBoard, reloadBoards]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!currentBoard) {
      setActiveMobileColumn("");
      return;
    }
    setActiveMobileColumn((prev) => {
      if (currentBoard.columns.some((c) => c.id === prev)) return prev;
      return currentBoard.columns[0]?.id ?? "";
    });
  }, [currentBoard]);

  const handleDragStart = (event: DragStartEvent) => {
    if (!isFilterAll) return;
    const id = String(event.active.id);
    if (!currentBoard) return;
    if (boards.some((b) => b.id === id)) return;
    if (currentBoard.columns.some((c) => c.id === id)) {
      const col = currentBoard.columns.find((c) => c.id === id);
      if (col) setActiveColumn(col);
      return;
    }
    const task = currentBoard.columns.flatMap((c) => c.tasks).find((t) => t.id === id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isFilterAll) return;
    const { active, over } = event;
    setActiveTask(null);
    setActiveColumn(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (boards.some((b) => b.id === activeId)) {
      const oldIndex = boards.findIndex((b) => b.id === activeId);
      const newIndex = boards.findIndex((b) => b.id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const next = arrayMove(boards, oldIndex, newIndex);
      setBoards(next);
      await fetch("/api/tasks/boards/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedBoardIds: next.map((b) => b.id) }),
      });
      return;
    }

    if (!currentBoard) return;

    if (currentBoard.columns.some((c) => c.id === activeId)) {
      const cols = currentBoard.columns;
      const oldIndex = cols.findIndex((c) => c.id === activeId);
      const overColumnId =
        cols.find((c) => c.id === overId)?.id ??
        cols.find((c) => c.tasks.some((t) => t.id === overId))?.id;
      if (!overColumnId) return;
      const newIndex = cols.findIndex((c) => c.id === overColumnId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const nextCols = arrayMove(cols, oldIndex, newIndex);
      setBoards((prev) =>
        prev.map((b) => (b.id === currentBoard.id ? { ...b, columns: nextCols } : b))
      );
      await fetch("/api/tasks/columns/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: currentBoard.id,
          orderedColumnIds: nextCols.map((c) => c.id),
        }),
      });
      return;
    }

    const sourceColumn = currentBoard.columns.find((c) => c.tasks.some((t) => t.id === activeId));
    const targetColumn =
      currentBoard.columns.find((c) => c.tasks.some((t) => t.id === overId)) ||
      currentBoard.columns.find((c) => c.id === overId);

    if (!sourceColumn || !targetColumn) return;

    if (sourceColumn.id === targetColumn.id) {
      const oldIndex = sourceColumn.tasks.findIndex((t) => t.id === activeId);
      const newIndex = sourceColumn.tasks.findIndex((t) => t.id === overId);
      if (oldIndex === newIndex) return;

      const newTasks = arrayMove(sourceColumn.tasks, oldIndex, newIndex);

      setBoards((prev) =>
        prev.map((b) =>
          b.id === currentBoard.id
            ? {
                ...b,
                columns: b.columns.map((c) =>
                  c.id === sourceColumn.id ? { ...c, tasks: newTasks } : c
                ),
              }
            : b
        )
      );

      await fetch(`/api/tasks/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newIndex }),
      });
    } else {
      const task = sourceColumn.tasks.find((t) => t.id === activeId)!;
      const newSourceTasks = sourceColumn.tasks.filter((t) => t.id !== activeId);
      const newTargetTasks = [...targetColumn.tasks, { ...task, columnId: targetColumn.id }];

      setBoards((prev) =>
        prev.map((b) =>
          b.id === currentBoard.id
            ? {
                ...b,
                columns: b.columns.map((c) => {
                  if (c.id === sourceColumn.id) return { ...c, tasks: newSourceTasks };
                  if (c.id === targetColumn.id) return { ...c, tasks: newTargetTasks };
                  return c;
                }),
              }
            : b
        )
      );

      await fetch(`/api/tasks/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: targetColumn.id, order: newTargetTasks.length - 1 }),
      });
    }
  };

  const addColumn = async (boardId: string, name: string, emoji: string, color: string) => {
    const board = boards.find((b) => b.id === boardId);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "column",
        name,
        emoji,
        color,
        boardId,
        order: board?.columns.length ?? 0,
      }),
    });
    const col = await res.json();
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, columns: [...b.columns, col] } : b))
    );
    toast.success(t.toastColumnAdded);
  };

  const addTask = async (
    boardId: string,
    columnId: string,
    title: string,
    assigneeId?: string,
    priority: TaskBoardTask["priority"] = "MEDIUM",
    isPrivate?: boolean
  ) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "task",
        title,
        columnId,
        assigneeId,
        creatorId: currentUserId,
        priority,
        isPrivate: Boolean(isPrivate),
      }),
    });
    const task = await res.json();
    setBoards((prev) =>
      prev.map((b) =>
        b.id === boardId
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId ? { ...c, tasks: [...c.tasks, task] } : c
              ),
            }
          : b
      )
    );
    toast.success(t.toastTaskAdded);
  };

  const updateTaskAssignee = async (taskId: string, assigneeId: string | null) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId }),
      });
      if (!res.ok) throw new Error("fail");
      const task = await res.json();
      setBoards((prev) =>
        prev.map((b) => ({
          ...b,
          columns: b.columns.map((c) => ({
            ...c,
            tasks: c.tasks.map((t) => (t.id === taskId ? task : t)),
          })),
        }))
      );
    } catch {
      toast.error(t.toastAssigneeUpdateError);
    }
  };

  const updateTaskPriority = async (taskId: string, priority: TaskBoardTask["priority"]) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      if (!res.ok) throw new Error("fail");
      const task = await res.json();
      setBoards((prev) =>
        prev.map((b) => ({
          ...b,
          columns: b.columns.map((c) => ({
            ...c,
            tasks: c.tasks.map((t) => (t.id === taskId ? task : t)),
          })),
        }))
      );
    } catch {
      toast.error(t.toastPriorityUpdateError);
    }
  };

  const updateTaskCompleted = async (taskId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("fail");
      const task = (await res.json()) as TaskPatchResponse;
      setBoards((prev) => mergeTaskIntoBoards(prev, task));
      if (task.awardedPoints && task.awardedPoints > 0) {
        window.dispatchEvent(
          new CustomEvent(TASK_POINTS_AWARDED_EVENT, { detail: { points: task.awardedPoints } })
        );
        toast.custom(
          (toastState) => (
            <div
              className={`${
                toastState.visible ? "animate-enter" : "animate-leave"
              } bg-white border border-lavender-200 shadow-cozy rounded-2xl px-4 py-3`}
            >
              <p className="text-sm font-semibold text-warm-800">
                {t.xpTitlePrefix}
                {task.awardedPoints} XP
              </p>
              <p className="text-xs text-warm-500 mt-1">
                {t.xpSubtitleProgress}
              </p>
            </div>
          ),
          { duration: 2200 }
        );
      }
    } catch {
      toast.error(t.toastStatusUpdateError);
    }
  };

  const saveTaskFull = async (taskId: string, payload: Record<string, unknown>) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error("fail");
    }
    const task = (await res.json()) as TaskPatchResponse;
    setBoards((prev) => mergeTaskIntoBoards(prev, task));
    if (task.awardedPoints && task.awardedPoints > 0) {
      window.dispatchEvent(
        new CustomEvent(TASK_POINTS_AWARDED_EVENT, { detail: { points: task.awardedPoints } })
      );
      toast.custom(
        (toastState) => (
          <div
            className={`${
              toastState.visible ? "animate-enter" : "animate-leave"
            } bg-white border border-lavender-200 shadow-cozy rounded-2xl px-4 py-3`}
          >
            <p className="text-sm font-semibold text-warm-800">
              {t.xpTitlePrefix}
              {task.awardedPoints} XP
            </p>
            <p className="text-xs text-warm-500 mt-1">
              {t.xpSubtitleNibbo}
            </p>
          </div>
        ),
        { duration: 2200 }
      );
    }
    toast.success(t.toastSaved);
  };

  const deleteTask = async (taskId: string, columnId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setBoards((prev) =>
      prev.map((b) => ({
        ...b,
        columns: b.columns.map((c) =>
          c.id === columnId ? { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) } : c
        ),
      }))
    );
    toast.success(t.toastTaskDeleted);
  };

  const renameColumn = async (columnId: string, name: string) => {
    const res = await fetch(`/api/tasks/columns/${columnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) {
      toast.error(t.toastRenameError);
      return;
    }
    const column = await res.json();
    setBoards((prev) =>
      prev.map((b) => ({
        ...b,
        columns: b.columns.map((c) => (c.id === columnId ? { ...c, ...column } : c)),
      }))
    );
    toast.success(t.toastColumnUpdated);
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm(t.deleteColumnConfirm)) return;
    await fetch(`/api/tasks/columns/${columnId}`, { method: "DELETE" });
    setBoards((prev) =>
      prev.map((b) => ({
        ...b,
        columns: b.columns.filter((c) => c.id !== columnId),
      }))
    );
    toast.success(t.toastColumnDeleted);
  };

  const addBoard = async (name: string, emoji: string, color: string, isPrivate: boolean) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "board", name, emoji, color, isPrivate }),
    });
    const board = await res.json();
    setBoards((prev) => [...prev, board]);
    setActiveBoard(board.id);
    setShowAddBoard(false);
    toast.success(t.toastBoardCreated);
  };

  const updateBoard = async (id: string, name: string, emoji: string, color: string, isPrivate: boolean) => {
    const res = await fetch(`/api/tasks/boards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, emoji, color, isPrivate }),
    });
    if (!res.ok) {
      toast.error(t.toastBoardUpdateError);
      return;
    }
    const board = await res.json();
    setBoards((prev) => prev.map((b) => (b.id === id ? board : b)));
    setEditBoard(null);
    toast.success(t.toastBoardUpdated);
  };

  const deleteBoard = async (id: string) => {
    await fetch(`/api/tasks/boards/${id}`, { method: "DELETE" });
    setBoards((prev) => {
      const next = prev.filter((b) => b.id !== id);
      setActiveBoard((cur) => {
        if (cur !== id) return cur;
        return next[0]?.id ?? "";
      });
      return next;
    });
    setEditBoard(null);
    toast.success(t.toastBoardDeleted);
  };

  return (
    <div className="h-full flex flex-col min-w-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
          <SortableContext items={boards.map((b) => b.id)} strategy={horizontalListSortingStrategy}>
            {boards.map((board) => (
              <SortableBoardTab
                key={board.id}
                board={board}
                active={activeBoard === board.id}
                onSelect={() => setActiveBoard(board.id)}
                onEditSettings={() => setEditBoard(board)}
                dragAriaLabel={t.dragBoardAria}
                settingsAriaLabel={t.boardSettingsAria}
              />
            ))}
          </SortableContext>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddBoard(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-warm-400 hover:text-rose-500 hover:bg-rose-50 border-2 border-dashed border-warm-200 hover:border-rose-300 transition-all flex-shrink-0"
          >
            <Plus size={14} /> {t.newBoard}
          </motion.button>
        </div>
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value as AssigneeFilter)}
              className="bg-white border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-700 outline-none w-full sm:w-auto"
            >
              <option value="ALL">{t.filterAll}</option>
              <option value="ME">{t.filterMine}</option>
              <option value="UNASSIGNED">{t.filterUnassigned}</option>
              {users.map((user) => (
                <option key={user.id} value={`USER:${user.id}`}>
                  {user.name ?? taskI18n.userFallback}
                </option>
              ))}
            </select>
            <Link
              href="/tasks/history"
              className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-warm-200 text-warm-700 hover:bg-warm-50 text-center"
            >
              {t.completedHistory}
            </Link>
          </div>
        </div>

        {boardForView && currentBoard ? (
          <>
            {!isFilterAll && visibleTasksCount === 0 && (
              <div className="mb-3 rounded-2xl bg-warm-50 border border-warm-100 px-4 py-3 text-sm text-warm-500">
                {t.filteredEmpty}
              </div>
            )}
            {isMobile ? (
              <div className="flex flex-col gap-3 pb-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {boardForView.columns.map((column) => (
                    <button
                      key={column.id}
                      type="button"
                      onClick={() => setActiveMobileColumn(column.id)}
                      className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        mobileColumn?.id === column.id
                          ? "bg-rose-100 text-rose-700"
                          : "bg-white text-warm-600 border border-warm-200"
                      }`}
                    >
                      {column.name} ({column.tasks.length})
                    </button>
                  ))}
                </div>
                {mobileColumn && (
                  <SortableContext items={[mobileColumn.id]} strategy={horizontalListSortingStrategy}>
                    <TaskColumn
                      column={mobileColumn}
                      users={users}
                      boardIsPrivate={currentBoard.isPrivate}
                      onAddTask={(columnId, title, assigneeId, priority, isPrivate) =>
                        addTask(currentBoard.id, columnId, title, assigneeId, priority, isPrivate)
                      }
                      onDeleteTask={deleteTask}
                      onAssigneeChange={updateTaskAssignee}
                      onPriorityChange={updateTaskPriority}
                      onCompletedChange={(taskId, completed) => updateTaskCompleted(taskId, completed)}
                      onRenameColumn={renameColumn}
                      onDeleteColumn={deleteColumn}
                      onEditTask={setEditTask}
                    />
                  </SortableContext>
                )}
                <AddColumnButton
                  onAdd={(name, emoji, color) => addColumn(currentBoard.id, name, emoji, color)}
                />
              </div>
            ) : (
              <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 flex-1 scrollbar-hide snap-x snap-mandatory">
                <SortableContext
                  items={boardForView.columns.map((c) => c.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {boardForView.columns.map((column) => (
                    <TaskColumn
                      key={column.id}
                      column={column}
                      users={users}
                      boardIsPrivate={currentBoard.isPrivate}
                      onAddTask={(columnId, title, assigneeId, priority, isPrivate) =>
                        addTask(currentBoard.id, columnId, title, assigneeId, priority, isPrivate)
                      }
                      onDeleteTask={deleteTask}
                      onAssigneeChange={updateTaskAssignee}
                      onPriorityChange={updateTaskPriority}
                      onCompletedChange={(taskId, completed) => updateTaskCompleted(taskId, completed)}
                      onRenameColumn={renameColumn}
                      onDeleteColumn={deleteColumn}
                      onEditTask={setEditTask}
                    />
                  ))}
                </SortableContext>
                <AddColumnButton
                  onAdd={(name, emoji, color) => addColumn(currentBoard.id, name, emoji, color)}
                />
              </div>
            )}

            <DragOverlay>
              {activeTask && (
                <div className="rotate-2 opacity-90 w-[calc(100vw-2.5rem)] sm:w-72">
                  <TaskCard task={activeTask} users={users} isDragging />
                </div>
              )}
              {activeColumn && (
                <div className="w-[calc(100vw-2.5rem)] sm:w-72 opacity-90 rotate-1">
                  <div className="bg-white/90 rounded-3xl border border-rose-200 shadow-cozy p-4">
                    <Columns3 size={16} className="inline mr-2 text-warm-500" />
                    <span className="font-semibold text-warm-800">{activeColumn.name}</span>
                  </div>
                </div>
              )}
            </DragOverlay>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <SquareKanban className="h-11 w-11 text-warm-400" />
              </div>
              <h3 className="text-lg font-semibold text-warm-700 mb-2">{t.noBoardsTitle}</h3>
              <p className="text-warm-400 text-sm mb-4">{t.noBoardsHint}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddBoard(true)}
                className="px-6 py-3 bg-rose-500 text-white rounded-2xl font-medium hover:bg-rose-600 transition-colors w-full sm:w-auto"
              >
                {t.createBoardCta}
              </motion.button>
            </div>
          </div>
        )}
      </DndContext>

      <AddBoardModal
        open={showAddBoard}
        onClose={() => setShowAddBoard(false)}
        onAdd={addBoard}
      />
      <AddBoardModal
        open={Boolean(editBoard)}
        onClose={() => setEditBoard(null)}
        editBoard={
          editBoard
            ? {
                id: editBoard.id,
                name: editBoard.name,
                emoji: editBoard.emoji,
                color: editBoard.color,
                isPrivate: editBoard.isPrivate,
              }
            : null
        }
        onUpdate={updateBoard}
        onDeleteBoard={deleteBoard}
      />
      <TaskEditModal
        open={Boolean(editTask)}
        task={editTask}
        users={users}
        boardIsPrivate={Boolean(currentBoard?.isPrivate)}
        currentUserId={currentUserId}
        onClose={() => setEditTask(null)}
        onSave={saveTaskFull}
      />
    </div>
  );
}

function AddColumnButton({ onAdd }: { onAdd: (name: string, emoji: string, color: string) => void }) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].task.board;
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), "📋", "#e7e5e4");
    setName("");
    setIsAdding(false);
  };

  return (
    <div className="w-[calc(100vw-2.5rem)] sm:w-72 flex-shrink-0 snap-start">
      {isAdding ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 rounded-3xl p-4 shadow-cozy border border-warm-100"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={t.addColumnPlaceholder}
            className="w-full bg-warm-50 rounded-xl px-3 py-2 text-sm text-warm-800 placeholder:text-warm-400 outline-none border border-warm-200 focus:border-rose-300 mb-3"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 bg-rose-500 text-white rounded-xl py-2 text-sm font-medium hover:bg-rose-600 transition-colors"
            >
              {t.addColumn}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 bg-warm-100 text-warm-600 rounded-xl py-2 text-sm hover:bg-warm-200 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl text-sm text-warm-400 hover:text-rose-500 hover:bg-white/50 border-2 border-dashed border-warm-200 hover:border-rose-300 transition-all"
        >
          <Plus size={16} /> {t.newColumn}
        </motion.button>
      )}
    </div>
  );
}
