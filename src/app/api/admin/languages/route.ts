import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { normalizeLanguageCode } from "@/lib/languages";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isUserAdmin(session.user.id))) return forbidden();
  const items = await prisma.language.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isUserAdmin(session.user.id))) return forbidden();
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const code = normalizeLanguageCode(typeof body.code === "string" ? body.code : "");
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);
  if (!/^[a-z]{2,10}$/.test(code)) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const maxSort = await prisma.language.aggregate({ _max: { sortOrder: true } });
  const created = await prisma.language.create({
    data: {
      code,
      name,
      isActive,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      isDefault: false,
    },
  });
  return NextResponse.json(created);
}
