import { LandingPageClient } from "@/components/landing/LandingPageClient";
import { auth } from "@/lib/auth";
import { APP_LANGUAGE_COOKIE_KEY, I18N, resolveAppLanguage } from "@/lib/i18n";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const lang = resolveAppLanguage(cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value, hdrs.get("accept-language"));
  const { landing } = I18N[lang];
  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
  };
}

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect("/dashboard");
  return <LandingPageClient />;
}
