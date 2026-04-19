"use client";

import dynamic from "next/dynamic";
import type { TaskBoardBoard, TaskBoardUser } from "@/lib/task-board";

const TaskBoard = dynamic(() => import("./TaskBoard"), { ssr: false });

interface TaskBoardClientProps {
  initialBoards: TaskBoardBoard[];
  users: TaskBoardUser[];
  currentUserId: string;
}

export default function TaskBoardClient({ initialBoards, users, currentUserId }: TaskBoardClientProps) {
  return <TaskBoard initialBoards={initialBoards} users={users} currentUserId={currentUserId} />;
}
