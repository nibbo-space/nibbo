import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createGoogleOAuthClient, getAppBaseUrl } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", getAppBaseUrl()));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const base = getAppBaseUrl();

  if (oauthError) {
    return NextResponse.redirect(new URL(`/calendar?gc_error=${encodeURIComponent(oauthError)}`, base));
  }

  const cookieStore = await cookies();
  const expected = cookieStore.get("nibbo_gc_oauth_state")?.value;
  cookieStore.delete("nibbo_gc_oauth_state");

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/calendar?gc_error=state", base));
  }

  const oauth2 = createGoogleOAuthClient();
  const { tokens } = await oauth2.getToken(code);

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });
  if (!account) {
    return NextResponse.redirect(new URL("/calendar?gc_error=no_google_account", base));
  }

  await prisma.account.update({
    where: { id: account.id },
    data: {
      refresh_token: tokens.refresh_token ?? account.refresh_token,
      access_token: tokens.access_token ?? account.access_token,
      expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
      scope: tokens.scope ?? account.scope,
      token_type: tokens.token_type ?? account.token_type,
    },
  });

  return NextResponse.redirect(new URL("/calendar?gc_connected=1", base));
}
