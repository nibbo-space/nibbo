import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { PrivacyContent } from "@/components/shared/PrivacyContent";
import { auth } from "@/lib/auth";
import { APP_LANGUAGE_COOKIE_KEY, I18N, resolveAppLanguage } from "@/lib/i18n";
import { getMetadataBaseUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const language = resolveAppLanguage(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  const base = getMetadataBaseUrl();
  return {
    title: I18N[language].legal.privacyMetaTitle,
    alternates: { canonical: new URL("/privacy", base) },
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage() {
  let signedIn = false;
  try {
    const session = await auth();
    signedIn = Boolean(session?.user?.id);
  } catch {
    signedIn = false;
  }
  return <PrivacyContent signedIn={signedIn} />;
}
