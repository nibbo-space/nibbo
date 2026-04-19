import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.noteCategory.findMany({
    where: { familyId },
    orderBy: [{ parentId: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const category = await prisma.noteCategory.create({
    data: {
      name: String(body.name || "").trim() || "Категорія",
      emoji: body.emoji || "category",
      color: body.color || "#f5f3ff",
      parentId: body.parentId || null,
      familyId,
    },
  });
  return NextResponse.json(category);
}
