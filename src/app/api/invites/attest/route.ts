import {
  FAMILY_INVITE_COOKIE,
  familyInviteCookieOptions,
  validateFamilyInviteAttestToken,
} from "@/lib/family-invite";
import { getMetadataBaseUrl } from "@/lib/site-url";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  const base = getMetadataBaseUrl();
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invite_invalid", base));
  }
  const v = await validateFamilyInviteAttestToken(token);
  if (!v.ok) {
    const err = v.reason === "expired" ? "invite_expired" : "invite_invalid";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(err)}`, base));
  }
  const dest = new URL("/login?tab=register&invite=1", base);
  const res = NextResponse.redirect(dest);
  res.cookies.set(FAMILY_INVITE_COOKIE, token, familyInviteCookieOptions());
  return res;
}
