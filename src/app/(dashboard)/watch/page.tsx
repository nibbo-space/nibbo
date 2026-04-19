import WatchingView from "@/components/watching/WatchingView";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { getTmdbApiKey } from "@/lib/tmdb";

const userSelect = { id: true, name: true, image: true, color: true, emoji: true } as const;

export default async function WatchPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return null;

  const [active, history, community] = await Promise.all([
    prisma.watchItem.findMany({
      where: { familyId, status: { in: ["WATCHING", "PAUSED"] } },
      include: { user: { select: userSelect } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.watchItem.findMany({
      where: { familyId, status: { in: ["FINISHED", "DROPPED"] } },
      include: { user: { select: userSelect } },
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
      take: 80,
    }),
    prisma.watchItem.findMany({
      where: {
        NOT: { familyId },
        status: "WATCHING",
        family: { shareWatchingFeed: true },
      },
      orderBy: { updatedAt: "desc" },
      take: 24,
      select: {
        id: true,
        title: true,
        posterPath: true,
        mediaType: true,
        season: true,
        updatedAt: true,
        family: { select: { name: true } },
        user: { select: { name: true, emoji: true } },
      },
    }),
  ]);

  return (
    <WatchingView
      initialActive={JSON.parse(JSON.stringify(active))}
      initialHistory={JSON.parse(JSON.stringify(history))}
      initialCommunity={JSON.parse(JSON.stringify(community))}
      hasTmdb={Boolean(getTmdbApiKey())}
    />
  );
}
