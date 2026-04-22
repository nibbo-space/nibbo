import Header from "@/components/shared/Header";
import OnboardingTour from "@/components/shared/OnboardingTour";
import ReminderHeartbeat from "@/components/shared/ReminderHeartbeat";
import Sidebar from "@/components/shared/Sidebar";
import DashboardRouteGates from "@/components/shared/DashboardRouteGates";
import { DisabledAppModulesProvider } from "@/components/shared/DisabledAppModulesProvider";
import { AchievementUnlockProvider } from "@/components/achievements/AchievementUnlockProvider";
import { AssistantBuddyProvider } from "@/components/shared/AssistantBuddyProvider";
import { FocusModeProvider } from "@/components/shared/FocusModeProvider";
import { UserPreferencesProvider } from "@/components/shared/UserPreferencesProvider";
import ConsumeFamilyInviteClient from "@/components/family/ConsumeFamilyInviteClient";
import { auth, signOut } from "@/lib/auth";
import { loadCredentialGate } from "@/lib/credential-guard";
import { applyFamilyInviteCookieIfPresent } from "@/lib/family-invite";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const gate = await loadCredentialGate(session.user.id);
  if (!gate) {
    await signOut({ redirectTo: "/login" });
  } else if (gate.credentialExpired) {
    redirect("/api/auth/incomplete-expired");
  } else if (gate.mustSetPassword) {
    redirect("/onboarding/account-setup");
  }
  let user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    color: string;
    emoji: string;
    onboardingCompletedAt: Date | null;
    niboWelcomeCompletedAt: Date | null;
    displayCurrency: string;
    timeZone: string;
    ollamaApiKeyEnc: string | null;
    familyId: string | null;
    familyRole: "OWNER" | "MEMBER";
  } | null = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        color: true,
        emoji: true,
        onboardingCompletedAt: true,
        niboWelcomeCompletedAt: true,
        displayCurrency: true,
        timeZone: true,
        ollamaApiKeyEnc: true,
        familyId: true,
        familyRole: true,
      },
    });
  } catch {
    const fallbackUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        color: true,
        emoji: true,
        displayCurrency: true,
        timeZone: true,
        ollamaApiKeyEnc: true,
        familyId: true,
        familyRole: true,
      },
    });
    if (fallbackUser) {
      user = {
        ...fallbackUser,
        onboardingCompletedAt: null,
        niboWelcomeCompletedAt: null,
        ollamaApiKeyEnc: fallbackUser.ollamaApiKeyEnc ?? null,
        familyRole: fallbackUser.familyRole,
      };
    }
  }
  if (!user) redirect("/login");

  if (user.email) {
    const applied = await applyFamilyInviteCookieIfPresent(session.user.id, user.email);
    if (applied) {
      const next = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { familyId: true, familyRole: true },
      });
      if (next) {
        user = { ...user, familyId: next.familyId, familyRole: next.familyRole };
      }
    }
  }

  let disabledAppModules: string[] = [];
  let modulesSetupCompletedAt: Date | null = null;
  if (user.familyId) {
    try {
      const fam = await prisma.family.findUnique({
        where: { id: user.familyId },
        select: { disabledAppModules: true, modulesSetupCompletedAt: true },
      });
      disabledAppModules = fam?.disabledAppModules ?? [];
      modulesSetupCompletedAt = fam?.modulesSetupCompletedAt ?? null;
    } catch {
      disabledAppModules = [];
    }
  }

  if (user.familyRole === "OWNER" && !modulesSetupCompletedAt) {
    redirect("/onboarding/modules");
  }
  if (!user.niboWelcomeCompletedAt) {
    redirect("/onboarding/nibo");
  }

  const assistantEnabled = Boolean(user.ollamaApiKeyEnc);
  const assistantMascotSeed = user.familyId || user.id;

  return (
    <div className="flex min-h-dvh flex-col bg-cream-50 md:h-screen md:flex-row md:overflow-hidden">
      <ConsumeFamilyInviteClient />
      <UserPreferencesProvider
        displayCurrency={user.displayCurrency}
        timeZone={user.timeZone}
        assistantEnabled={assistantEnabled}
        assistantMascotSeed={assistantMascotSeed}
      >
        <AchievementUnlockProvider>
          <DisabledAppModulesProvider initial={disabledAppModules}>
            <FocusModeProvider>
              <AssistantBuddyProvider>
                <Sidebar user={user} isAdmin={Boolean(session.user.isAdmin)} />
                <div className="flex-1 flex flex-col md:overflow-hidden">
                  <ReminderHeartbeat />
                  <OnboardingTour shouldRun={!user.onboardingCompletedAt} userId={user.id} />
                  <Header user={user} initialPoints={0} isAdmin={Boolean(session.user.isAdmin)} />
                  <DashboardRouteGates />
                  <main className="flex-1 overflow-y-auto p-3 md:p-6">{children}</main>
                </div>
              </AssistantBuddyProvider>
            </FocusModeProvider>
          </DisabledAppModulesProvider>
        </AchievementUnlockProvider>
      </UserPreferencesProvider>
    </div>
  );
}
