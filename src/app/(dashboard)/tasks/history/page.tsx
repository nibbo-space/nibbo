import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { APP_LANGUAGE_COOKIE_KEY, I18N, resolveAppLanguage } from "@/lib/i18n";
import { completedTaskHistoryWhere } from "@/lib/family-private-scope";
import { prisma } from "@/lib/prisma";
import { POINTS_PER_TASK_COMPLETION } from "@/lib/task-points";

type CompletedTaskItem = {
  id: string;
  title: string;
  completedAt: Date | null;
  updatedAt: Date;
};

function buildGroups(tasks: CompletedTaskItem[], locale: string) {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const groups = new Map<
    string,
    {
      dateLabel: string;
      dayXp: number;
      items: Array<{ id: string; title: string; timeLabel: string; xp: number }>;
    }
  >();

  for (const task of tasks) {
    const doneAt = task.completedAt ?? task.updatedAt;
    const dateKey = doneAt.toISOString().slice(0, 10);
    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        dateLabel: dateFormatter.format(doneAt),
        dayXp: 0,
        items: [],
      });
    }
    const xp = POINTS_PER_TASK_COMPLETION;
    groups.get(dateKey)!.items.push({
      id: task.id,
      title: task.title,
      timeLabel: timeFormatter.format(doneAt),
      xp,
    });
    groups.get(dateKey)!.dayXp += xp;
  }

  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([, value]) => value);
}

export default async function TasksHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return null;

  const cookieStore = await cookies();
  const hdrs = await headers();
  const language = resolveAppLanguage(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    hdrs.get("accept-language")
  );
  const t = I18N[language].task.history;
  const locale = language === "en" ? "en-US" : "uk-UA";

  const tasks = await prisma.task.findMany({
    where: completedTaskHistoryWhere(familyId, session.user.id),
    select: {
      id: true,
      title: true,
      completedAt: true,
      updatedAt: true,
    },
    orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
    take: 500,
  });

  const groups = buildGroups(tasks, locale);

  return (
    <section className="max-w-4xl mx-auto w-full rounded-3xl border border-lavender-100 bg-gradient-to-br from-rose-50/70 via-lavender-50/70 to-sky-50/70 p-4 md:p-6">
      <div className="mb-6 md:mb-8 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-rose-500/80">Logbook</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-warm-800 mt-1">{t.title}</h1>
          <p className="text-sm text-warm-600 mt-2 max-w-2xl">{t.subtitle}</p>
        </div>
        <Link
          href="/tasks"
          className="shrink-0 px-3 py-2 rounded-xl text-sm font-medium bg-white/90 border border-warm-200 text-warm-700 hover:bg-warm-50"
        >
          {t.backToBoard}
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-lavender-200 bg-white/75 px-5 py-8 text-center">
          <div className="mb-3 flex justify-center">
            <Sparkles className="h-9 w-9 text-lavender-500" />
          </div>
          <h2 className="text-lg font-semibold text-warm-800">{t.emptyTitle}</h2>
          <p className="text-sm text-warm-500 mt-2 max-w-lg mx-auto">{t.emptyText}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.dateLabel} className="rounded-2xl border border-lavender-200 bg-white/85 overflow-hidden shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)]">
              <div className="px-4 py-3 bg-gradient-to-r from-rose-50/90 via-lavender-50/90 to-sky-50/90 border-b border-warm-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-warm-500">{t.dayLabel}</p>
                    <p className="text-sm font-semibold text-warm-700 mt-0.5">{group.dateLabel}</p>
                  </div>
                  <p className="text-xs font-semibold text-rose-600 shrink-0">+{group.dayXp} XP</p>
                </div>
              </div>
              <ul className="divide-y divide-warm-100">
                {group.items.map((item) => (
                  <li key={item.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <p className="text-sm text-warm-800">{item.title}</p>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-rose-600">+{item.xp} XP</p>
                      <p className="text-xs text-warm-500 mt-0.5">
                        {t.completedAt} {item.timeLabel}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
