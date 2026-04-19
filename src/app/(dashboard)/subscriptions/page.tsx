import SubscriptionsView from "@/components/subscriptions/SubscriptionsView";
import { auth } from "@/lib/auth";
import { getNbuExchangeRates } from "@/lib/exchange-rates";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) redirect("/login");

  const [currentUser, items, members, exchangeRates] = await Promise.all([
    prisma.user.findFirst({
      where: { id: session.user.id, familyId },
      select: { familyRole: true },
    }),
    prisma.familySubscription.findMany({
      where: { familyId },
      include: {
        ownerUser: { select: { id: true, name: true, email: true, color: true, emoji: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, color: true, emoji: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ nextBillingDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({
      where: { familyId },
      select: { id: true, name: true, email: true, image: true, color: true, emoji: true, familyRole: true },
      orderBy: { name: "asc" },
    }),
    getNbuExchangeRates(),
  ]);

  if (!currentUser) redirect("/login");

  const initialItems = items.map((item) => ({
    ...item,
    nextBillingDate: item.nextBillingDate.toISOString(),
    trialEndsAt: item.trialEndsAt ? item.trialEndsAt.toISOString() : null,
  }));

  return (
    <SubscriptionsView
      initialItems={initialItems}
      members={members}
      currentUserRole={currentUser.familyRole}
      exchangeRates={exchangeRates}
    />
  );
}
