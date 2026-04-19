import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const body = await req.json();

  if (type === "expense") {
    const ex = await prisma.expense.findFirst({ where: { id, familyId }, select: { id: true } });
    if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data: Parameters<typeof prisma.expense.update>[0]["data"] = {};
    if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 500);
    if (body.amount !== undefined) {
      const amt = Number(body.amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      data.amount = amt;
    }
    if ("date" in body && body.date !== undefined) {
      const d = new Date(String(body.date));
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      data.date = d;
    }
    if ("categoryId" in body) {
      if (body.categoryId === null || body.categoryId === "") data.categoryId = null;
      else {
        const cid = String(body.categoryId);
        const c = await prisma.expenseCategory.findFirst({ where: { id: cid, familyId }, select: { id: true } });
        if (!c) return NextResponse.json({ error: "Category not found" }, { status: 404 });
        data.categoryId = cid;
      }
    }
    if (body.note !== undefined) data.note = body.note === null ? null : String(body.note).slice(0, 2000);
    const updated = await prisma.expense.update({
      where: { id },
      data,
      include: {
        category: true,
        user: { select: { id: true, name: true, image: true, color: true, emoji: true } },
      },
    });
    return NextResponse.json(updated);
  }

  if (type !== "category") {
    return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
  }

  const exists = await prisma.expenseCategory.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const category = await prisma.expenseCategory.update({
    where: { id },
    data: {
      name: body.name,
      emoji: body.emoji,
      color: body.color,
      budget: body.budget ?? null,
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "category") {
    const exists = await prisma.expenseCategory.findFirst({ where: { id, familyId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.expenseCategory.delete({ where: { id } });
  } else if (type === "income") {
    const exists = await prisma.income.findFirst({ where: { id, familyId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.income.delete({ where: { id } });
  } else {
    const exists = await prisma.expense.findFirst({ where: { id, familyId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.expense.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
