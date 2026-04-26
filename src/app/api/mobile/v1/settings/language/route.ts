import { NextRequest, NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth-mobile/middleware";
import { prisma } from "@/lib/prisma";

export const GET = withMobileAuth(async (_req, ctx) => {
  const [user, languages] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { appLanguage: true },
    }),
    prisma.language.findMany({
      where: { isActive: true },
      select: { code: true, name: true, isDefault: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const defaultCode = languages.find((x) => x.isDefault)?.code ?? "en";
  return NextResponse.json({
    current: user?.appLanguage ?? defaultCode,
    default: defaultCode,
    items: languages.map((x) => ({ code: x.code, name: x.name, isDefault: x.isDefault })),
  });
});

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const nextLanguage = String(body.language || "").trim().toLowerCase();
  if (!nextLanguage) return NextResponse.json({ error: "LANGUAGE_REQUIRED" }, { status: 400 });

  const exists = await prisma.language.findFirst({
    where: { code: nextLanguage, isActive: true },
    select: { code: true },
  });
  if (!exists) return NextResponse.json({ error: "LANGUAGE_NOT_SUPPORTED" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: ctx.userId },
    data: { appLanguage: nextLanguage },
    select: { appLanguage: true },
  });
  return NextResponse.json({ current: user.appLanguage });
});
