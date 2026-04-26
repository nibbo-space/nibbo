import Link from "next/link";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { getFamilyDisplayXp } from "@/lib/family-display-xp";
import { prisma } from "@/lib/prisma";
import { XP_RULES, xpPointsForPrismaEvent, xpTitleForEvent } from "@/lib/xp-labels";
import { redirect } from "next/navigation";

export default async function AchievementsXpPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) redirect("/login");

  const [totalXp, recentEntries, groupedByType] = await Promise.all([
    getFamilyDisplayXp(familyId),
    prisma.xpLedgerEntry.findMany({
      where: { familyId },
      include: {
        user: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.xpLedgerEntry.groupBy({
      by: ["eventType"],
      where: { familyId },
      _sum: { points: true },
      _count: { _all: true },
      orderBy: { _sum: { points: "desc" } },
    }),
  ]);

  const topSources = groupedByType.slice(0, 6);

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <header className="rounded-3xl border border-warm-100 bg-white/80 p-5 shadow-cozy sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Family XP</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-warm-800 sm:text-3xl">XP rules and history</h1>
        <p className="mt-2 text-sm text-warm-600">
          This page shows what actions give XP and how your family earned points over time.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="rounded-2xl bg-gradient-to-r from-lavender-100 to-rose-100 px-3 py-2 text-sm font-bold text-warm-800">
            Total: {totalXp} XP
          </span>
          <Link
            href="/achievements"
            className="rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm font-medium text-warm-700 hover:bg-warm-50"
          >
            Back to achievements
          </Link>
        </div>
      </header>

      <div className="rounded-3xl border border-warm-100 bg-white/80 p-5 shadow-cozy sm:p-6">
        <h2 className="text-lg font-bold text-warm-800">XP rules</h2>
        <ul className="mt-3 divide-y divide-warm-100 rounded-2xl border border-warm-100 bg-white">
          {XP_RULES.map((rule) => (
            <li key={rule.eventType} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm text-warm-700">{rule.title}</span>
              <span className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                +{xpPointsForPrismaEvent(rule.eventType)} XP
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-warm-100 bg-white/80 p-5 shadow-cozy sm:p-6">
          <h2 className="text-lg font-bold text-warm-800">Top XP sources</h2>
          <ul className="mt-3 space-y-2">
            {topSources.map((row) => (
              <li
                key={row.eventType}
                className="flex items-center justify-between rounded-xl border border-warm-100 bg-white px-3 py-2 text-sm"
              >
                <span className="text-warm-700">{xpTitleForEvent(row.eventType)}</span>
                <span className="font-semibold text-warm-800">{row._sum.points ?? 0} XP</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-warm-100 bg-white/80 p-5 shadow-cozy sm:p-6">
          <h2 className="text-lg font-bold text-warm-800">Recent family XP</h2>
          {recentEntries.length === 0 ? (
            <p className="mt-3 text-sm text-warm-500">No XP activity yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentEntries.slice(0, 12).map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-warm-100 bg-white px-3 py-2 text-sm text-warm-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>{xpTitleForEvent(entry.eventType)}</span>
                    <span className="font-semibold text-rose-700">+{entry.points} XP</span>
                  </div>
                  <p className="mt-1 text-xs text-warm-500">
                    {entry.user?.name || "Family member"} - {entry.createdAt.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
