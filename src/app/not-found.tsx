import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { NotFoundContent } from "@/components/shared/NotFoundContent";
import { APP_LANGUAGE_COOKIE_KEY, I18N, resolveAppLanguage } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const language = resolveAppLanguage(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  return { title: I18N[language].notFound.metaTitle };
}

export default function NotFound() {
  return <NotFoundContent />;
}
