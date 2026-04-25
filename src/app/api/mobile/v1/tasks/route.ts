import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { mobileTaskCreateRequestSchema, taskScopeSchema } from "@/lib/contracts/mobile/tasks";
import { createTask, listTasks, TasksServiceError, type TaskScope } from "@/lib/services/tasks";

function parseScope(value: string | null): TaskScope {
  const parsed = taskScopeSchema.safeParse(value ?? "all");
  return parsed.success ? parsed.data : "all";
}

function parseIncludeCompleted(value: string | null) {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

export const GET = withMobileAuth(async (req, ctx) => {
  try {
    const scope = parseScope(req.nextUrl.searchParams.get("scope"));
    const includeCompleted = parseIncludeCompleted(req.nextUrl.searchParams.get("includeCompleted"));
    const items = await listTasks(ctx.userId, { scope, includeCompleted });
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof TasksServiceError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
});

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = mobileTaskCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const task = await createTask(ctx.userId, parsed.data);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof TasksServiceError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
});
