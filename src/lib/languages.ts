import { prisma } from "@/lib/prisma";
import { resolveAppLanguage, type ResolveUiLanguageConfig, type UiLocaleOption } from "@/lib/i18n";

export type ActiveLanguage = {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};

export async function getActiveLanguages(): Promise<ActiveLanguage[]> {
  return prisma.language.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: { id: true, code: true, name: true, isDefault: true, isActive: true, sortOrder: true },
  });
}

export function normalizeLanguageCode(value: string): string {
  return value.trim().toLowerCase();
}

export async function resolveUiLanguageFromRequest(
  cookieValue: string | undefined,
  acceptLanguage: string | null | undefined
): Promise<{ language: string; locales: UiLocaleOption[]; resolveConfig: ResolveUiLanguageConfig }> {
  const rows = await getActiveLanguages();
  const allowedCodes = rows.map((r) => r.code);
  const defaultRow = rows.find((r) => r.isDefault) ?? rows[0];
  const defaultCode = defaultRow?.code ?? "en";
  const allowed = allowedCodes.length ? allowedCodes : ["en"];
  const resolveConfig: ResolveUiLanguageConfig = {
    allowedCodes: allowed,
    defaultCode: allowed.includes(defaultCode) ? defaultCode : allowed[0] ?? "en",
  };
  const language = resolveAppLanguage(cookieValue, acceptLanguage, resolveConfig);
  const locales: UiLocaleOption[] =
    rows.length > 0 ? rows.map((r) => ({ code: r.code, name: r.name })) : [{ code: "en", name: "English" }];
  return { language, locales, resolveConfig };
}
