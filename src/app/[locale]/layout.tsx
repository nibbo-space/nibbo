import { AppLanguageProvider } from "@/components/shared/AppLanguageProvider";
import { getActiveLanguages } from "@/lib/languages";
import { isPublicLocale, PUBLIC_LOCALES } from "@/lib/public-locales";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export async function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();

  const rows = await getActiveLanguages();
  const locales = rows.length
    ? rows.map((r) => ({ code: r.code, name: r.name }))
    : [{ code: "en", name: "English" }];
  const defaultRow = rows.find((r) => r.isDefault) ?? rows[0];
  const defaultCode = defaultRow?.code ?? "en";

  return (
    <AppLanguageProvider initialLanguage={locale} locales={locales} defaultCode={defaultCode}>
      {children}
    </AppLanguageProvider>
  );
}
