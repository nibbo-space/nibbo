import { LandingPageClient } from "@/components/landing/LandingPageClient";
import { auth } from "@/lib/auth";
import { messageLocale, APP_LANGUAGE_COOKIE_KEY, I18N } from "@/lib/i18n";
import { resolveUiLanguageFromRequest } from "@/lib/languages";
import { getMetadataBaseUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const { language: lang } = await resolveUiLanguageFromRequest(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  const { landing } = I18N[messageLocale(lang)];
  const base = getMetadataBaseUrl();
  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: { canonical: new URL("/landing", base) },
    robots: { index: true, follow: true },
  };
}

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect("/dashboard");
  return <LandingPageClient />;
}
