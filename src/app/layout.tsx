import { AppLanguageProvider } from "@/components/shared/AppLanguageProvider";

import { ConditionalGoogleAnalytics } from "@/components/shared/ConditionalGoogleAnalytics";

import { CookieConsent } from "@/components/shared/CookieConsent";

import { APP_LANGUAGE_COOKIE_KEY, I18N, messageLocale } from "@/lib/i18n";

import { resolveUiLanguageFromRequest } from "@/lib/languages";

import { OG_ALT, OG_SIZE } from "@/lib/og-share-card";

import { getMetadataBaseUrl } from "@/lib/site-url";

import type { Metadata, Viewport } from "next";

import { Inter, Nunito } from "next/font/google";

import { cookies, headers } from "next/headers";

import { Toaster } from "react-hot-toast";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  variable: "--font-heading",
  display: "swap",
  weight: ["600", "700", "800"],
});

const site = getMetadataBaseUrl();

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const { language } = await resolveUiLanguageFromRequest(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  const meta = I18N[messageLocale(language)].siteRoot;
  const ml = messageLocale(language);
  const ogLocale = ml === "uk" ? "uk_UA" : "en_US";
  const alternateLocale = ml === "uk" ? ["en_US"] : ["uk_UA"];

  return {
    metadataBase: site,
    applicationName: "Nibbo",
    title: {
      default: meta.defaultTitle,
      template: "%s · Nibbo",
    },
    description: meta.defaultDescription,
    keywords: [...meta.keywords],
    authors: [{ name: "Nibbo" }],
    creator: "Nibbo",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
      shortcut: ["/favicon.svg"],
    },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      alternateLocale,
      url: site.href,
      siteName: "Nibbo",
      title: meta.defaultTitle,
      description: meta.defaultDescription,
      images: [
        {
          url: "/opengraph-image",
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          alt: OG_ALT,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.defaultTitle,
      description: meta.defaultDescription,
      images: ["/twitter-image"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const { language, locales, resolveConfig } = await resolveUiLanguageFromRequest(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );

  return (
    <html lang={language} className={`${inter.variable} ${nunito.variable}`}>
      <body className="m-0 min-h-dvh bg-gradient-to-br from-cream-50 via-rose-50/30 to-lavender-50/20 p-0 font-sans antialiased">
        <AppLanguageProvider initialLanguage={language} locales={locales} defaultCode={resolveConfig.defaultCode}>
          {children}
          <CookieConsent />
          <ConditionalGoogleAnalytics />
        </AppLanguageProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#fff",
              color: "#292524",
              borderRadius: "12px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              border: "1px solid #e7e5e4",
              fontFamily: "inherit",
            },
            success: {
              iconTheme: { primary: "#f43f5e", secondary: "#fff" },
            },
          }}
        />
      </body>
    </html>
  );
}
