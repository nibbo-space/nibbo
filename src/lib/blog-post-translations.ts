import { prisma } from "@/lib/prisma";

export type BlogExtraTranslationPayload = {
  languageId: string;
  title: string;
  excerpt: string | null;
  body: string;
};

export async function syncExtraBlogTranslations(postId: string, items: BlogExtraTranslationPayload[]) {
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
        await tx.blogPostTranslation.deleteMany({ where: { postId, languageId: langId } });
        continue;
      }
      const excerpt = item?.excerpt?.trim() || null;
      await tx.blogPostTranslation.upsert({
        where: { postId_languageId: { postId, languageId: langId } },
        create: { postId, languageId: langId, title, excerpt, body },
        update: { title, excerpt, body },
      });
    }
  });
}

export function parseExtraTranslationsBody(raw: unknown): BlogExtraTranslationPayload[] {
  if (!Array.isArray(raw)) return [];
  const out: BlogExtraTranslationPayload[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const languageId = typeof o.languageId === "string" ? o.languageId.trim() : "";
    if (!languageId) continue;
    out.push({
      languageId,
      title: typeof o.title === "string" ? o.title : "",
      excerpt: typeof o.excerpt === "string" ? o.excerpt.trim() || null : null,
      body: typeof o.body === "string" ? o.body : "",
    });
  }
  return out;
}
