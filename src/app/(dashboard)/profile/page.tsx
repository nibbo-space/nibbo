import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import ProfileSettingsForm from "@/components/shared/ProfileSettingsForm";
import { messageLocale, APP_LANGUAGE_COOKIE_KEY, I18N } from "@/lib/i18n";
import { resolveUiLanguageFromRequest } from "@/lib/languages";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const { language } = await resolveUiLanguageFromRequest(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  return { title: I18N[messageLocale(language)].profile.title };
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      color: true,
      emoji: true,
      familyId: true,
      displayCurrency: true,
      timeZone: true,
      personalApiEnabled: true,
      ollamaApiKeyEnc: true,
      ollamaModel: true,
    },
  });
  if (!row) redirect("/login");
  const initialUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    color: row.color,
    emoji: row.emoji,
    familyId: row.familyId,
    displayCurrency: row.displayCurrency,
    timeZone: row.timeZone,
    personalApiEnabled: row.personalApiEnabled,
    ollamaKeyConfigured: Boolean(row.ollamaApiKeyEnc),
    ollamaModel: row.ollamaModel,
  };
  return <ProfileSettingsForm initialUser={initialUser} />;
}
