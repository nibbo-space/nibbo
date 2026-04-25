import { LandingPageClient } from "@/components/landing/LandingPageClient";
import { auth } from "@/lib/auth";
import { I18N, messageLocale } from "@/lib/i18n";
import {
  PUBLIC_LOCALES,
  buildLanguageAlternates,
  isPublicLocale,
  localeHref,
} from "@/lib/public-locales";
import { getMetadataBaseUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return {};
  const { landing } = I18N[messageLocale(locale)];
  const base = getMetadataBaseUrl();
  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: {
      canonical: new URL(localeHref(locale, "/"), base).href,
      languages: buildLanguageAlternates("/"),
    },
    robots: { index: true, follow: true },
    openGraph: {
      url: new URL(localeHref(locale, "/"), base).href,
      title: landing.metaTitle,
      description: landing.metaDescription,
    },
  };
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const session = await auth();
  if (session) redirect("/dashboard");
  return <LandingPageClient />;
}
