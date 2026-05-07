import { prisma } from "@/lib/prisma";

export type AnnouncementExtraTranslationPayload = {
  languageId: string;
  title: string;
  body: string;
};

export function parseAnnouncementExtraTranslationsBody(raw: unknown): AnnouncementExtraTranslationPayload[] {
  if (!Array.isArray(raw)) return [];
  const out: AnnouncementExtraTranslationPayload[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const languageId = typeof o.languageId === "string" ? o.languageId.trim() : "";
    if (!languageId) continue;
    out.push({
      languageId,
      title: typeof o.title === "string" ? o.title : "",
      body: typeof o.body === "string" ? o.body : "",
    });
  }
  return out;
}

export async function syncExtraAnnouncementTranslations(
  announcementId: string,
  items: AnnouncementExtraTranslationPayload[]
) {
  const extra = await prisma.language.findMany({
    where: { isActive: true, code: { notIn: ["uk", "en"] } },
    select: { id: true },
  });
  const allowed = new Set(extra.map((x) => x.id));

  await prisma.$transaction(async (tx) => {
    for (const langId of allowed) {
      const item = items.find((i) => i.languageId === langId);
      const title = (item?.title ?? "").trim();
      const body = (item?.body ?? "").trim();
      if (!title || !body) {
        await tx.announcementTranslation.deleteMany({
          where: { announcementId, languageId: langId },
        });
        continue;
      }
      await tx.announcementTranslation.upsert({
        where: {
          announcementId_languageId: {
            announcementId,
            languageId: langId,
          },
        },
        create: { announcementId, languageId: langId, title, body },
        update: { title, body },
      });
    }
  });
}

type AnnouncementTranslationItem = {
  code: string;
  title: string;
  body: string;
};

export function pickAnnouncementTranslation(
  row: {
    titleUk: string;
    titleEn: string;
    bodyUk: string;
    bodyEn: string;
    translations?: Array<{
      title: string;
      body: string;
      language: { code: string };
    }>;
  },
  preferredCode: string
) {
  const byCode = new Map<string, AnnouncementTranslationItem>();
  byCode.set("uk", { code: "uk", title: row.titleUk, body: row.bodyUk });
  byCode.set("en", { code: "en", title: row.titleEn, body: row.bodyEn });
  for (const tr of row.translations ?? []) {
    const code = tr.language.code.trim().toLowerCase();
    byCode.set(code, { code, title: tr.title, body: tr.body });
  }
  const code = preferredCode.trim().toLowerCase();
  const direct = byCode.get(code);
  if (direct?.title && direct?.body) return direct;
  const uk = byCode.get("uk");
  if (uk?.title && uk?.body) return uk;
  const en = byCode.get("en");
  if (en?.title && en?.body) return en;
  for (const item of byCode.values()) {
    if (item.title && item.body) return item;
  }
  return { code: "en", title: "", body: "" };
}
