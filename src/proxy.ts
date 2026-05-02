import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";
import { APP_LANGUAGE_COOKIE_KEY, resolveAppLanguage } from "@/lib/i18n";
import { DEFAULT_PUBLIC_LOCALE, PUBLIC_LOCALES } from "@/lib/public-locales";

const GEO_BLOCKED_IMAGE_PATH = "/geo-blocked.png";

function geoBlockedPageHtml(): string {
  return `<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>403</title><style>html,body{margin:0;min-height:100%;background:#0c0f12}body{display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;padding:max(12px,2vmin);min-height:100dvh}img{max-width:min(1100px,100%);height:auto;border-radius:10px;box-shadow:0 24px 80px rgba(0,0,0,.55)}</style></head><body><img src="${GEO_BLOCKED_IMAGE_PATH}" alt="" decoding="async" fetchpriority="high"/></body></html>`;
}

function blockedCountrySet(): Set<string> | null {
  const raw = process.env.NIBBO_GEO_BLOCK_COUNTRIES?.trim();
  if (!raw) return null;
  const set = new Set(
    raw
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)
  );
  return set.size ? set : null;
}

function clientCountry(request: NextRequest): string | undefined {
  const fromHeader =
    request.headers.get("x-vercel-ip-country")?.trim() ||
    request.headers.get("cf-ipcountry")?.trim();
  const c = fromHeader?.toUpperCase();
  if (c && c !== "ZZ") return c;
  return undefined;
}

const LEGACY_PUBLIC_PREFIXES = ["/blog", "/roadmap", "/privacy", "/feedback"];
const LOCALE_PREFIX_RE = /^\/(en|uk|ja)(\/|$)/;
const MOBILE_API_PREFIX = "/api/mobile/v1";

function applyMobileCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

function isLocalePath(p: string): boolean {
  return LOCALE_PREFIX_RE.test(p);
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/" || isLocalePath(pathname)) return true;
  if (
    LEGACY_PUBLIC_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    )
  )
    return true;
  if (pathname === "/landing" || pathname.startsWith("/landing/")) return true;
  if (pathname === "/opengraph-image" || pathname === "/twitter-image") return true;
  return false;
}

function detectLocale(req: NextRequest): string {
  const cookie = req.cookies.get(APP_LANGUAGE_COOKIE_KEY)?.value;
  const accept = req.headers.get("accept-language");
  return resolveAppLanguage(cookie, accept, {
    allowedCodes: [...PUBLIC_LOCALES],
    defaultCode: DEFAULT_PUBLIC_LOCALE,
  });
}

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl;

  if (pathname === GEO_BLOCKED_IMAGE_PATH) {
    return NextResponse.next();
  }

  const blocked = blockedCountrySet();
  if (blocked) {
    const country = clientCountry(req);
    if (country && blocked.has(country)) {
      return new NextResponse(geoBlockedPageHtml(), {
        status: 403,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
  }

  const isLoggedIn = !!req.auth;
  const isApiAuth = pathname.startsWith("/api/auth");
  const isMobileApi = pathname.startsWith(MOBILE_API_PREFIX);
  const isPublicModelAsset = pathname.startsWith("/models/");

  if (isMobileApi) {
    if (req.method === "OPTIONS") {
      return applyMobileCors(new NextResponse(null, { status: 204 }));
    }
    return applyMobileCors(NextResponse.next());
  }

  if (isApiAuth || isPublicModelAsset) return NextResponse.next();

  if (pathname === "/") {
    if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", req.url));
    const locale = detectLocale(req);
    return NextResponse.redirect(new URL(`/${locale}${search}`, req.url));
  }

  if (pathname === "/landing" || pathname.startsWith("/landing/")) {
    const locale = detectLocale(req);
    const tail = pathname === "/landing" ? "" : pathname.slice("/landing".length);
    return NextResponse.redirect(new URL(`/${locale}${tail}${search}`, req.url), 308);
  }

  for (const prefix of LEGACY_PUBLIC_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      const locale = detectLocale(req);
      return NextResponse.redirect(
        new URL(`/${locale}${pathname}${search}`, req.url),
        308
      );
    }
  }

  if (!isLoggedIn && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nibbo-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: ["/api/mobile/v1/:path*", "/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
