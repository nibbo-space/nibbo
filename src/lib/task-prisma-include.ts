import type { Prisma } from "@prisma/client";
import { visibleOpenTasksWhereClause } from "@/lib/family-private-scope";

export const taskRelationInclude = {
  assignee: {
    select: { id: true, name: true, image: true, color: true, emoji: true, timeZone: true } as const,
  },
  creator: { select: { id: true, name: true, image: true, color: true, emoji: true } as const },
};

export function columnWithTasksIncludeFor(userId: string) {
  return {
    tasks: {
      where: visibleOpenTasksWhereClause(userId),
      include: taskRelationInclude,
      orderBy: { order: "asc" as const },
    },
  } as const;
}

export function boardFullIncludeFor(userId: string) {
  return {
    columns: {
      include: columnWithTasksIncludeFor(userId),
      orderBy: { order: "asc" as const },
    },
  } as const;
}

export function boardSelectForPage(userId: string): Prisma.TaskBoardSelect {
  return {
    id: true,
    name: true,
    emoji: true,
    color: true,
    order: true,
    isPrivate: true,
    ownerUserId: true,
    columns: {
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        emoji: true,
        color: true,
        order: true,
        tasks: {
          where: visibleOpenTasksWhereClause(userId),
          select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            dueDate: true,
            completed: true,
            order: true,
            columnId: true,
            isPrivate: true,
            labels: true,
            reminderCadenceDays: true,
            reminderWindowStartMin: true,
            reminderWindowEndMin: true,
            reminderAnchorYmd: true,
            reminderLastFiredYmd: true,
            assignee: {
              select: { id: true, name: true, image: true, color: true, emoji: true, timeZone: true },
            },
            creator: { select: { id: true, name: true, image: true, color: true, emoji: true } },
          },
          orderBy: { order: "asc" },
        },
      },
    },
  };
}
