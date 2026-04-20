import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isUserAdmin(session.user.id))) return forbidden();

  const { id } = await ctx.params;
  const existing = await prisma.language.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    name?: string;
    isActive?: boolean;
    sortOrder?: number;
    isDefault?: boolean;
  } = {};
  if (typeof body.name === "string") data.name = body.name.trim().slice(0, 80);
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) data.sortOrder = Math.floor(body.sortOrder);
  if (typeof body.isDefault === "boolean") data.isDefault = body.isDefault;

  if (data.isDefault === true) {
    await prisma.$transaction([
      prisma.language.updateMany({ data: { isDefault: false } }),
      prisma.language.update({ where: { id }, data: { ...data, isActive: true, isDefault: true } }),
    ]);
    const updated = await prisma.language.findUnique({ where: { id } });
    return NextResponse.json(updated);
  }

  if (existing.isDefault && data.isDefault === false) {
    return NextResponse.json({ error: "Default language required" }, { status: 400 });
  }

  if (existing.isDefault && data.isActive === false) {
    return NextResponse.json({ error: "Default language must be active" }, { status: 400 });
  }

  const updated = await prisma.language.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isUserAdmin(session.user.id))) return forbidden();
  const { id } = await ctx.params;
  const existing = await prisma.language.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.isDefault) {
    return NextResponse.json({ error: "Default language cannot be deleted" }, { status: 400 });
  }
  await prisma.language.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
