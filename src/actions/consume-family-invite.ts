"use server";

import { cookies } from "next/headers";
import { FAMILY_INVITE_COOKIE } from "@/lib/family-invite";

export async function clearFamilyInviteCookieAction(): Promise<void> {
  const cookieStore = await cookies();
  if (!cookieStore.get(FAMILY_INVITE_COOKIE)?.value) return;
  cookieStore.delete(FAMILY_INVITE_COOKIE);
}
