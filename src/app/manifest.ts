import type { MetadataRoute } from "next";
import { cookies, headers } from "next/headers";
import { APP_LANGUAGE_COOKIE_KEY, I18N, messageLocale } from "@/lib/i18n";
import { resolveUiLanguageFromRequest } from "@/lib/languages";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const { language } = await resolveUiLanguageFromRequest(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  const meta = I18N[messageLocale(language)].siteRoot;

  return {
    name: "Nibbo",
    short_name: "Nibbo",
    description: meta.defaultDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#fff8f1",
    theme_color: "#f43f5e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
