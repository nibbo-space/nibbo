import { isUserAdmin } from "@/lib/admin";
import {
  parseAnnouncementExtraTranslationsBody,
  syncExtraAnnouncementTranslations,
} from "@/lib/announcement-translations";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isUserAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.announcement.findUnique({
    where: { id },
    select: { id: true, publishedAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!bodyRaw || typeof bodyRaw !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const body = bodyRaw as Record<string, unknown>;
  const titleUk = typeof body.titleUk === "string" ? body.titleUk.trim() : "";
  const titleEn = typeof body.titleEn === "string" ? body.titleEn.trim() : "";
  const bodyUk = typeof body.bodyUk === "string" ? body.bodyUk.trim() : "";
  const bodyEn = typeof body.bodyEn === "string" ? body.bodyEn.trim() : "";
  const published = Boolean(body.published);
  if (!titleUk || !titleEn || !bodyUk || !bodyEn) {
    return NextResponse.json({ error: "UK and EN title/body required" }, { status: 400 });
  }
  const extraTranslations = parseAnnouncementExtraTranslationsBody(body.translations);

  await prisma.announcement.update({
    where: { id },
    data: {
      titleUk,
      titleEn,
      bodyUk,
      bodyEn,
      published,
      publishedAt: published ? existing.publishedAt ?? new Date() : null,
    },
  });
  await syncExtraAnnouncementTranslations(id, extraTranslations);
  const updated = await prisma.announcement.findUnique({
    where: { id },
    select: {
      id: true,
      titleUk: true,
      titleEn: true,
      bodyUk: true,
      bodyEn: true,
      published: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      translations: {
        select: {
          title: true,
          body: true,
          languageId: true,
          language: { select: { code: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isUserAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  try {
    await prisma.announcement.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
