export type BlogTranslationValue = {
  code: string;
  title: string;
  excerpt: string | null;
  body: string;
};

export type BlogPostTranslationRow = {
  language: { code: string };
  title: string;
  excerpt: string | null;
  body: string;
};

export function blogTranslationItemsFromPost(post: {
  titleUk: string;
  titleEn: string;
  excerptUk?: string | null;
  excerptEn?: string | null;
  bodyUk: string;
  bodyEn: string;
  translations?: BlogPostTranslationRow[];
}): BlogTranslationValue[] {
  const items: BlogTranslationValue[] = [
    { code: "uk", title: post.titleUk, excerpt: post.excerptUk ?? null, body: post.bodyUk },
    { code: "en", title: post.titleEn, excerpt: post.excerptEn ?? null, body: post.bodyEn },
  ];
  for (const tr of post.translations ?? []) {
    items.push({
      code: tr.language.code.trim().toLowerCase(),
      title: tr.title,
      excerpt: tr.excerpt,
      body: tr.body,
    });
  }
  return items;
}

export function pickBlogTranslation(
  items: BlogTranslationValue[],
  preferredCode: string,
  fallbackCodes: string[] = ["uk", "en"]
): BlogTranslationValue | null {
  const byCode = new Map(items.map((x) => [x.code.trim().toLowerCase(), x]));
  const pc = preferredCode.trim().toLowerCase();
  const direct = byCode.get(pc);
  if (direct && direct.title && direct.body) return direct;
  for (const code of fallbackCodes) {
    const row = byCode.get(code.toLowerCase());
    if (row && row.title && row.body) return row;
  }
  for (const row of items) {
    if (row.title && row.body) return row;
  }
  return null;
}

export function pickBlogLine(
  items: BlogTranslationValue[],
  preferredCode: string,
  fallbackCodes: string[] = ["uk", "en"]
): BlogTranslationValue | null {
  const byCode = new Map(items.map((x) => [x.code.trim().toLowerCase(), x]));
  const pc = preferredCode.trim().toLowerCase();
  const direct = byCode.get(pc);
  if (direct?.title) return direct;
  for (const code of fallbackCodes) {
    const row = byCode.get(code.toLowerCase());
    if (row?.title) return row;
  }
  for (const row of items) {
    if (row.title) return row;
  }
  return null;
}
