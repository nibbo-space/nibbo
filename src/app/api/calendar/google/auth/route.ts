import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createGoogleOAuthClient, getAppBaseUrl, GOOGLE_CALENDAR_SCOPE } from "@/lib/google-calendar";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", getAppBaseUrl()));
  }

  const oauth2 = createGoogleOAuthClient();
  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("nibbo_gc_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_CALENDAR_SCOPE],
    state,
    include_granted_scopes: true,
  });

  return NextResponse.redirect(url);
}
