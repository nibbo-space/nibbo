import type { Prisma } from "@prisma/client";
import { userCreditedTaskWhere } from "@/lib/task-xp";

export function taskBoardVisibleWhere(familyId: string, userId: string): Prisma.TaskBoardWhereInput {
  return {
    familyId,
    OR: [{ isPrivate: false }, { isPrivate: true, ownerUserId: userId }],
  };
}

export function visibleOpenTasksWhereClause(userId: string): Prisma.TaskWhereInput {
  return {
    completed: false,
    OR: [{ isPrivate: false }, { isPrivate: true, creatorId: userId }],
  };
}

export function taskAccessibleWhere(familyId: string, userId: string): Prisma.TaskWhereInput {
  return {
    column: {
      board: taskBoardVisibleWhere(familyId, userId),
    },
    OR: [{ isPrivate: false }, { isPrivate: true, creatorId: userId }],
  };
}

export function completedTaskHistoryWhere(familyId: string, userId: string): Prisma.TaskWhereInput {
  return {
    completed: true,
    column: {
      board: taskBoardVisibleWhere(familyId, userId),
    },
    OR: [{ isPrivate: false }, { isPrivate: true, creatorId: userId }],
  };
}

export function shoppingListVisibleWhere(familyId: string, userId: string): Prisma.ShoppingListWhereInput {
  return {
    familyId,
    OR: [{ isPrivate: false }, { isPrivate: true, ownerUserId: userId }],
  };
}

export function shoppingItemsVisibleWhere(userId: string): Prisma.ShoppingItemWhereInput {
  return {
    OR: [{ isPrivate: false }, { isPrivate: true, addedById: userId }],
  };
}

export function familyXpCompletedTasksWhere(familyId: string): Prisma.TaskWhereInput {
  return {
    completed: true,
    isPrivate: false,
    column: { board: { familyId, isPrivate: false } },
  };
}

export function userCreditedOpenTasksWhere(userId: string, familyId: string): Prisma.TaskWhereInput {
  return {
    AND: [
      userCreditedTaskWhere(userId),
      { completed: false },
      { column: { board: taskBoardVisibleWhere(familyId, userId) } },
      { OR: [{ isPrivate: false }, { isPrivate: true, creatorId: userId }] },
    ],
  };
}

export function userCreditedCompletedTasksWhere(
  userId: string,
  familyId: string,
  completedAt?: Prisma.DateTimeFilter
): Prisma.TaskWhereInput {
  return {
    AND: [
      userCreditedTaskWhere(userId),
      { completed: true, ...(completedAt ? { completedAt } : {}) },
      { column: { board: taskBoardVisibleWhere(familyId, userId) } },
      { OR: [{ isPrivate: false }, { isPrivate: true, creatorId: userId }] },
    ],
  };
}
