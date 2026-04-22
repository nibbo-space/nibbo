import { auth } from "@/lib/auth";
import { loadCredentialGate } from "@/lib/credential-guard";
import { redirect } from "next/navigation";
import SetPasswordClient from "./SetPasswordClient";

export default async function SetPasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const gate = await loadCredentialGate(session.user.id);
  if (!gate) redirect("/login");
  if (gate.credentialExpired) redirect("/api/auth/incomplete-expired");
  if (!gate.mustSetPassword) redirect("/dashboard");
  return <SetPasswordClient initialName={session.user.name?.trim() ?? ""} />;
}
