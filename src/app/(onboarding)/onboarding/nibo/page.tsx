import OnboardingNiboClient from "@/components/onboarding/OnboardingNiboClient";
import { auth } from "@/lib/auth";
import { loadCredentialGate } from "@/lib/credential-guard";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function OnboardingNiboPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const gate = await loadCredentialGate(session.user.id);
  if (!gate) redirect("/login");
  if (gate.credentialExpired) redirect("/api/auth/incomplete-expired");
  if (gate.mustSetPassword) redirect("/onboarding/account-setup");
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) redirect("/login");

  const [user, family] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { familyRole: true, niboWelcomeCompletedAt: true },
    }),
    prisma.family.findUnique({
      where: { id: familyId },
      select: { modulesSetupCompletedAt: true },
    }),
  ]);

  if (!user || !family) redirect("/login");
  if (user.niboWelcomeCompletedAt) {
    redirect("/dashboard");
  }
  if (user.familyRole === "OWNER" && !family.modulesSetupCompletedAt) {
    redirect("/onboarding/modules");
  }

  return <OnboardingNiboClient familyId={familyId} />;
}
