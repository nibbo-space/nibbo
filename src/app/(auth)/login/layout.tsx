import { auth, signOut } from "@/lib/auth";
import { loadCredentialGate } from "@/lib/credential-guard";
import { messageLocale, APP_LANGUAGE_COOKIE_KEY, I18N } from "@/lib/i18n";
import { resolveUiLanguageFromRequest } from "@/lib/languages";
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
  return { title: I18N[messageLocale(lang)].login.metaTitle };
}

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.id) {
    const gate = await loadCredentialGate(session.user.id);
    if (!gate) {
      await signOut({ redirectTo: "/login" });
    } else if (gate.credentialExpired) {
      redirect("/api/auth/incomplete-expired");
    } else if (gate.mustSetPassword) {
      redirect("/onboarding/account-setup");
    } else {
      redirect("/dashboard");
    }
  }
  return children;
}
