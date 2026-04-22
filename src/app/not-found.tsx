import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { NotFoundContent } from "@/components/shared/NotFoundContent";
import { messageLocale, APP_LANGUAGE_COOKIE_KEY, I18N } from "@/lib/i18n";
import { resolveUiLanguageFromRequest } from "@/lib/languages";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const { language } = await resolveUiLanguageFromRequest(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  return { title: I18N[messageLocale(language)].notFound.metaTitle };
}

export default function NotFound() {
  return <NotFoundContent />;
}
