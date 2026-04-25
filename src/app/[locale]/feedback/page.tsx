import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
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
    title: I18N[messageLocale(locale)].feedback.metaTitle,
    alternates: {
      canonical: new URL(localeHref(locale, "/feedback"), base).href,
      languages: buildLanguageAlternates("/feedback"),
    },
    robots: { index: true, follow: true },
  };
}

export default async function FeedbackPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);
  const initialEmail = session?.user?.email ?? "";
  return (
    <FeedbackForm
      initialContactEmail={initialEmail}
      backHref={signedIn ? "/dashboard" : `/${locale}`}
      signedIn={signedIn}
    />
  );
}
