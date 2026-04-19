const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CYR_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ie",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "iu",
  я: "ia",
  ё: "io",
  ы: "y",
  э: "e",
};

function translitChar(ch: string): string {
  const lower = ch.toLowerCase();
  const t = CYR_TO_LATIN[lower];
  if (t !== undefined) return t;
  return ch;
}

export function slugify(input: string): string {
  let s = "";
  for (const ch of input.trim()) {
    if (/[a-zA-Z0-9]/.test(ch)) {
      s += ch.toLowerCase();
      continue;
    }
    if (/[\u0400-\u04FF]/.test(ch)) {
      s += translitChar(ch);
      continue;
    }
    if (/\s|_|-/.test(ch) || /[^\w]/.test(ch)) {
      s += "-";
    }
  }
  s = s
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return s || "post";
}

export function isValidBlogSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 120 && SLUG_PATTERN.test(slug);
}
