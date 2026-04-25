import type { Metadata } from "next";
import { RoadmapContent } from "@/components/shared/RoadmapContent";
import { auth } from "@/lib/auth";
import { I18N, messageLocale } from "@/lib/i18n";
import { buildLanguageAlternates, isPublicLocale, localeHref, PUBLIC_LOCALES } from "@/lib/public-locales";
import { getMetadataBaseUrl } from "@/lib/site-url";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return {};
  const base = getMetadataBaseUrl();
  return {
    title: I18N[messageLocale(locale)].roadmapPage.metaTitle,
    description: I18N[messageLocale(locale)].roadmapPage.metaDescription,
    alternates: {
      canonical: new URL(localeHref(locale, "/roadmap"), base).href,
      languages: buildLanguageAlternates("/roadmap"),
    },
    robots: { index: true, follow: true },
  };
}

export default async function RoadmapPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  let signedIn = false;
  try {
    const session = await auth();
    signedIn = Boolean(session?.user?.id);
  } catch {
    signedIn = false;
  }
  return <RoadmapContent signedIn={signedIn} />;
}
