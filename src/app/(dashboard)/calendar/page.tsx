import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import CalendarView from "@/components/calendar/CalendarView";

export default async function CalendarPage() {
  const session = await auth();
  if (!session) return null;
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return null;

  const [events, users, subscriptions] = await Promise.all([
    prisma.event.findMany({
      where: { familyId },
      include: {
        assignee: { select: { id: true, name: true, image: true, color: true, emoji: true } },
        subscription: { select: { id: true, title: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.user.findMany({ where: { familyId }, select: { id: true, name: true, image: true, color: true, emoji: true } }),
    prisma.familySubscription.findMany({
      where: { familyId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <CalendarView
        initialEvents={events}
        users={users}
        currentUserId={session.user.id}
        subscriptions={subscriptions}
      />
    </div>
  );
}
