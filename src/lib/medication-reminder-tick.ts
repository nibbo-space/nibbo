import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kyivCalendarYmd } from "@/lib/kyiv-range";
import {
  formatMinutesAsClock,
  isInReminderWindow,
  isReminderPingDay,
  minutesFromMidnightInTz,
} from "@/lib/task-reminder";
import { fireAndForgetMedicationDuePush } from "@/lib/notifications/medication-push";

function parseDailyPush(j: Prisma.JsonValue | null | undefined): { ymd: string; fired: number[] } {
  if (j == null || typeof j !== "object" || Array.isArray(j)) {
    return { ymd: "", fired: [] };
  }
  const o = j as Record<string, unknown>;
  const ymd = typeof o.ymd === "string" ? o.ymd : "";
  const fired = Array.isArray(o.fired) ? o.fired.filter((x): x is number => typeof x === "number") : [];
  return { ymd, fired };
}

export async function processMedicationTicksForUser(
  userId: string,
  familyId: string,
  timeZone: string,
  now = new Date()
): Promise<void> {
  const todayYmd = kyivCalendarYmd(now, timeZone);
  const meds = await prisma.medication.findMany({
    where: { userId, familyId },
  });

  for (const m of meds) {
    if (m.scheduleMode === "INTERVAL_DAYS") {
      const cadence = m.intervalDays ?? 0;
      const anchor = m.intervalAnchorYmd;
      const startMin = m.intervalWindowStartMin ?? 9 * 60;
      const endMin = m.intervalWindowEndMin ?? 12 * 60;
      if (cadence < 1 || !anchor || startMin >= endMin) continue;
      if (!isReminderPingDay(anchor, todayYmd, cadence, timeZone)) continue;
      if (!isInReminderWindow(now, timeZone, startMin, endMin)) continue;
      if (m.intervalLastFiredYmd === todayYmd) continue;

      await prisma.medication.update({
        where: { id: m.id },
        data: { intervalLastFiredYmd: todayYmd },
      });
      const detail = `${formatMinutesAsClock(startMin)}–${formatMinutesAsClock(endMin)}`;
      fireAndForgetMedicationDuePush({ userId, medicationId: m.id, name: m.name, detail });
      continue;
    }

    if (m.scheduleMode === "DAILY_TIMES") {
      const slots = [...m.dailySlotMinutes].sort((a, b) => a - b);
      if (slots.length === 0) continue;
      const tol = Math.max(15, Math.min(180, m.slotToleranceMin || 45));
      let state = parseDailyPush(m.lastDailyPushJson);
      if (state.ymd !== todayYmd) {
        state = { ymd: todayYmd, fired: [] };
      }
      const updatedFired = [...state.fired];
      let changed = false;
      const cur = minutesFromMidnightInTz(now, timeZone);
      for (let i = 0; i < slots.length; i++) {
        const sm = slots[i];
        if (updatedFired.includes(i)) continue;
        if (cur >= sm && cur < sm + tol) {
          updatedFired.push(i);
          changed = true;
          fireAndForgetMedicationDuePush({
            userId,
            medicationId: m.id,
            name: m.name,
            detail: formatMinutesAsClock(sm),
          });
        }
      }
      if (changed) {
        await prisma.medication.update({
          where: { id: m.id },
          data: {
            lastDailyPushJson: { ymd: todayYmd, fired: updatedFired } as Prisma.InputJsonValue,
          },
        });
      }
    }
  }
}
