import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { auth } from "@/lib/auth";
import { messageLocale, APP_LANGUAGE_COOKIE_KEY, I18N } from "@/lib/i18n";
import { resolveUiLanguageFromRequest } from "@/lib/languages";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const { language } = await resolveUiLanguageFromRequest(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  return { title: I18N[messageLocale(language)].feedback.metaTitle };
}

export default async function FeedbackPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);
  const initialEmail = session?.user?.email ?? "";
  return (
    <FeedbackForm
      initialContactEmail={initialEmail}
      backHref={signedIn ? "/dashboard" : "/login"}
      signedIn={signedIn}
    />
  );
}
