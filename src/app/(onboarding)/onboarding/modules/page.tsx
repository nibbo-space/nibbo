import OnboardingModulesClient from "@/components/onboarding/OnboardingModulesClient";
import { auth } from "@/lib/auth";
import { loadCredentialGate } from "@/lib/credential-guard";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function OnboardingModulesPage() {
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
      select: { familyRole: true },
    }),
    prisma.family.findUnique({
      where: { id: familyId },
      select: { disabledAppModules: true, modulesSetupCompletedAt: true },
    }),
  ]);

  if (!family) redirect("/login");
  if (user?.familyRole !== "OWNER" || family.modulesSetupCompletedAt) {
    redirect("/onboarding/nibo");
  }

  return <OnboardingModulesClient initialDisabled={family.disabledAppModules} />;
}
