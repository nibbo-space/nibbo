import { prisma } from "@/lib/prisma";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function getAppBaseUrl() {
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (authUrl) return authUrl.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getGoogleCalendarRedirectUri() {
  return `${getAppBaseUrl()}/api/calendar/google/callback`;
}

export function createGoogleOAuthClient() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  return new OAuth2Client(id, secret, getGoogleCalendarRedirectUri());
}

export function accountHasCalendarScope(scope: string | null | undefined) {
  if (!scope) return false;
  return scope.includes("calendar.events") || scope.includes("/auth/calendar");
}

export async function getCalendarClientForUser(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account) throw new Error("NO_GOOGLE_ACCOUNT");
  if (!accountHasCalendarScope(account.scope)) throw new Error("NO_CALENDAR_SCOPE");
  if (!account.refresh_token && !account.access_token) throw new Error("NO_GOOGLE_TOKENS");

  const oauth2 = createGoogleOAuthClient();
  oauth2.setCredentials({
    refresh_token: account.refresh_token ?? undefined,
    access_token: account.access_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  await oauth2.getAccessToken();
  const creds = oauth2.credentials;
  if (creds.access_token) {
    await prisma.account.updateMany({
      where: { userId, provider: "google" },
      data: {
        access_token: creds.access_token,
        expires_at: creds.expiry_date ? Math.floor(creds.expiry_date / 1000) : null,
        refresh_token: creds.refresh_token ?? account.refresh_token ?? undefined,
      },
    });
  }

  return google.calendar({ version: "v3", auth: oauth2 });
}
