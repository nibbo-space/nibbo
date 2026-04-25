import { NextRequest, NextResponse } from "next/server";
import { withMobileAuthParams } from "@/lib/auth-mobile/middleware";
import { mobileTaskPatchRequestSchema } from "@/lib/contracts/mobile/tasks";
import { deleteTask, getTask, patchTask, TasksServiceError } from "@/lib/services/tasks";

type Params = { id: string };

export const GET = withMobileAuthParams<Params>(async (_req, params, ctx) => {
  try {
    const task = await getTask(ctx.userId, params.id);
    if (!task) return NextResponse.json({ error: "TASK_NOT_FOUND" }, { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof TasksServiceError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
});

export const PATCH = withMobileAuthParams<Params>(async (req: NextRequest, params, ctx) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = mobileTaskPatchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const task = await patchTask(ctx.userId, params.id, parsed.data);
    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof TasksServiceError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
});

export const DELETE = withMobileAuthParams<Params>(async (_req, params, ctx) => {
  try {
    await deleteTask(ctx.userId, params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TasksServiceError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
});
