import { z } from "zod";

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const taskScopeSchema = z.enum(["all", "mine", "today", "overdue"]);

export const mobileTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priority: taskPrioritySchema,
  dueDate: z.string().datetime().nullable(),
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  isPrivate: z.boolean(),
  labels: z.array(z.string()),
  assigneeId: z.string().nullable(),
  creatorId: z.string(),
  columnId: z.string(),
  boardId: z.string(),
  boardName: z.string(),
  columnName: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const mobileTaskListResponseSchema = z.object({
  items: z.array(mobileTaskSchema),
});

export const mobileTaskCreateRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  columnId: z.string().nullable().optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  isPrivate: z.boolean().optional(),
  assigneeId: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
});

export const mobileTaskPatchRequestSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    priority: taskPrioritySchema.optional(),
    dueDate: z.string().datetime().nullable().optional(),
    completed: z.boolean().optional(),
    isPrivate: z.boolean().optional(),
    assigneeId: z.string().nullable().optional(),
    labels: z.array(z.string()).optional(),
    columnId: z.string().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });

export type MobileTask = z.infer<typeof mobileTaskSchema>;
export type MobileTaskListResponse = z.infer<typeof mobileTaskListResponseSchema>;
export type MobileTaskCreateRequest = z.infer<typeof mobileTaskCreateRequestSchema>;
export type MobileTaskPatchRequest = z.infer<typeof mobileTaskPatchRequestSchema>;
export type TaskScope = z.infer<typeof taskScopeSchema>;
