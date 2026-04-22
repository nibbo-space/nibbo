import { auth, signOut } from "@/lib/auth";
import { loadCredentialGate } from "@/lib/credential-guard";
import { consumePendingFamilyInviteCookie } from "@/lib/family-invite";
import { redirect } from "next/navigation";

export default async function OnboardingRootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const gate = await loadCredentialGate(session.user.id);
  if (!gate) {
    await signOut({ redirectTo: "/login" });
  } else if (gate.credentialExpired) {
    redirect("/api/auth/incomplete-expired");
  } else if (gate.mustSetPassword) {
    redirect("/auth/set-password");
  }
  await consumePendingFamilyInviteCookie(session.user.id, session.user.email ?? undefined);
  return (
    <div className="min-h-dvh bg-gradient-to-br from-cream-50 via-rose-50/40 to-lavender-50/30">{children}</div>
  );
}
