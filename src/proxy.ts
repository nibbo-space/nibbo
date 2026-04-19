import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/landing") return true;
  if (pathname.startsWith("/login/") || pathname.startsWith("/landing/")) return true;
  if (pathname.startsWith("/privacy") || pathname.startsWith("/roadmap") || pathname.startsWith("/blog"))
    return true;
  if (pathname === "/opengraph-image" || pathname === "/twitter-image") return true;
  return false;
}

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isPublicPage = isPublicPath(pathname);
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublicModelAsset = pathname.startsWith("/models/");

  if (isApiAuth || isPublicModelAsset) return NextResponse.next();

  if (pathname === "/") {
    const url = isLoggedIn ? "/dashboard" : "/landing";
    return NextResponse.redirect(new URL(url, req.url));
  }

  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
