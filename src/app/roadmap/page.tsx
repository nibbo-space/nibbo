import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { RoadmapContent } from "@/components/shared/RoadmapContent";
import { auth } from "@/lib/auth";
import { messageLocale, APP_LANGUAGE_COOKIE_KEY, I18N } from "@/lib/i18n";
import { resolveUiLanguageFromRequest } from "@/lib/languages";
import { getMetadataBaseUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const { language } = await resolveUiLanguageFromRequest(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  const base = getMetadataBaseUrl();
  return {
    title: I18N[messageLocale(language)].roadmapPage.metaTitle,
    description: I18N[messageLocale(language)].roadmapPage.metaDescription,
    alternates: { canonical: new URL("/roadmap", base) },
    robots: { index: true, follow: true },
  };
}

export default async function RoadmapPage() {
  let signedIn = false;
  try {
    const session = await auth();
    signedIn = Boolean(session?.user?.id);
  } catch {
    signedIn = false;
  }
  return <RoadmapContent signedIn={signedIn} />;
}
