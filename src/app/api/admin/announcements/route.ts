import { getAdminIdByUser, isUserAdmin } from "@/lib/admin";
import {
  parseAnnouncementExtraTranslationsBody,
  syncExtraAnnouncementTranslations,
} from "@/lib/announcement-translations";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isUserAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.announcement.findMany({
    orderBy: [{ updatedAt: "desc" }],
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

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isUserAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = await getAdminIdByUser(session.user.id);
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const created = await prisma.announcement.create({
    data: {
      titleUk,
      titleEn,
      bodyUk,
      bodyEn,
      published,
      publishedAt: published ? new Date() : null,
      authorAdminId: adminId,
    },
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
  await syncExtraAnnouncementTranslations(created.id, extraTranslations);
  const full = await prisma.announcement.findUnique({
    where: { id: created.id },
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

  return NextResponse.json(full);
}
