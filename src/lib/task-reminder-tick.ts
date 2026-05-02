import { prisma } from "@/lib/prisma";
import { formatYmdInTimeZone } from "@/lib/calendar-tz";
import {
  isInReminderWindow,
  isReminderPingDay,
  nextPingYmdFrom,
  formatMinutesAsClock,
} from "@/lib/task-reminder";
import { fireAndForgetReminderDuePush } from "@/lib/notifications/reminder-push";

export async function processReminderTicksForUser(
  userId: string,
  familyId: string,
  timeZone: string,
  now = new Date()
): Promise<void> {
  const todayYmd = formatYmdInTimeZone(now, timeZone);
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      completed: false,
      reminderCadenceDays: { not: null, gt: 0 },
      column: { board: { familyId } },
    },
    select: {
      id: true,
      title: true,
      reminderCadenceDays: true,
      reminderWindowStartMin: true,
      reminderWindowEndMin: true,
      reminderAnchorYmd: true,
      reminderLastFiredYmd: true,
    },
  });

  for (const t of tasks) {
    const cadence = t.reminderCadenceDays ?? 0;
    if (cadence < 1) continue;
    let anchor = t.reminderAnchorYmd;
    if (!anchor) {
      await prisma.task.update({
        where: { id: t.id },
        data: { reminderAnchorYmd: todayYmd },
      });
      anchor = todayYmd;
    }
    const startMin = t.reminderWindowStartMin ?? 9 * 60;
    const endMin = t.reminderWindowEndMin ?? 12 * 60;
    if (startMin >= endMin) continue;

    const ping = isReminderPingDay(anchor, todayYmd, cadence, timeZone);
    if (!ping) continue;
    if (!isInReminderWindow(now, timeZone, startMin, endMin)) continue;
    if (t.reminderLastFiredYmd === todayYmd) continue;

    await prisma.task.update({
      where: { id: t.id },
      data: { reminderLastFiredYmd: todayYmd },
    });
    fireAndForgetReminderDuePush({
      userId,
      taskId: t.id,
      taskTitle: t.title,
    });
  }
}

export type DashboardReminderRow = {
  id: string;
  title: string;
  priority: string;
  cadenceDays: number;
  windowStartMin: number;
  windowEndMin: number;
  anchorYmd: string | null;
  pingToday: boolean;
  inWindowNow: boolean;
  nextPingYmd: string;
  windowLabel: string;
};

export async function loadDashboardReminderDeck(
  userId: string,
  familyId: string,
  timeZone: string,
  now = new Date()
): Promise<DashboardReminderRow[]> {
  await processReminderTicksForUser(userId, familyId, timeZone, now);
  const todayYmd = formatYmdInTimeZone(now, timeZone);
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      completed: false,
      reminderCadenceDays: { not: null, gt: 0 },
      column: { board: { familyId } },
    },
    select: {
      id: true,
      title: true,
      priority: true,
      reminderCadenceDays: true,
      reminderWindowStartMin: true,
      reminderWindowEndMin: true,
      reminderAnchorYmd: true,
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
  });

  return tasks.map((t) => {
    const cadence = t.reminderCadenceDays ?? 7;
    const anchor = t.reminderAnchorYmd ?? todayYmd;
    const startMin = t.reminderWindowStartMin ?? 9 * 60;
    const endMin = t.reminderWindowEndMin ?? 12 * 60;
    const pingToday = isReminderPingDay(anchor, todayYmd, cadence, timeZone);
    const inWindowNow = isInReminderWindow(now, timeZone, startMin, endMin);
    const nextPingYmd = nextPingYmdFrom(anchor, todayYmd, cadence, timeZone);
    return {
      id: t.id,
      title: t.title,
      priority: t.priority,
      cadenceDays: cadence,
      windowStartMin: startMin,
      windowEndMin: endMin,
      anchorYmd: t.reminderAnchorYmd,
      pingToday,
      inWindowNow,
      nextPingYmd,
      windowLabel: `${formatMinutesAsClock(startMin)}–${formatMinutesAsClock(endMin)}`,
    };
  });
}
