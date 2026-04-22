import AccountSetupClient from "@/components/onboarding/AccountSetupClient";
import { auth } from "@/lib/auth";
import { loadCredentialGate } from "@/lib/credential-guard";
import { redirect } from "next/navigation";

export default async function OnboardingAccountSetupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const gate = await loadCredentialGate(session.user.id);
  if (!gate) redirect("/login");
  if (gate.credentialExpired) redirect("/api/auth/incomplete-expired");
  if (!gate.mustSetPassword) redirect("/dashboard");
  return <AccountSetupClient initialName={session.user.name?.trim() ?? ""} />;
}
