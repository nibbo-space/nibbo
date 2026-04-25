import { auth, signOut } from "@/lib/auth";
import { deleteUserIfCredentialExpired } from "@/lib/credential-guard";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  const origin = new URL(req.url).origin;
  if (!session?.user?.id) {
    return NextResponse.redirect(`${origin}/login`);
  }
  const deleted = await deleteUserIfCredentialExpired(session.user.id);
  if (!deleted) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }
  await signOut({ redirectTo: "/login?error=credential_expired" });
}
