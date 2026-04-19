import { clampReminderCadence, clampWindowMinutes } from "@/lib/task-reminder";

function parseHmToMinutes(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number.parseInt(m[1], 10);
  const min = Number.parseInt(m[2], 10);
  if (h > 23 || min > 59 || Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
}

export function applyReminderFieldsFromBody(
  data: Record<string, unknown>,
  body: Record<string, unknown>,
  opts: { todayAnchorYmd: string; previousCadence: number | null; previousAnchor: string | null }
): void {
  if (!("reminderCadenceDays" in body)) return;

  const raw = body.reminderCadenceDays;
  if (raw === null) {
    data.reminderCadenceDays = null;
    data.reminderWindowStartMin = null;
    data.reminderWindowEndMin = null;
    data.reminderAnchorYmd = null;
    data.reminderLastFiredYmd = null;
    return;
  }

  const cadence = clampReminderCadence(Number(raw));
  if (cadence == null) {
    data.reminderCadenceDays = null;
    data.reminderWindowStartMin = null;
    data.reminderWindowEndMin = null;
    data.reminderAnchorYmd = null;
    data.reminderLastFiredYmd = null;
    return;
  }

  let startMin =
    typeof body.reminderWindowStartMin === "number"
      ? clampWindowMinutes(body.reminderWindowStartMin)
      : parseHmToMinutes(body.reminderWindowStart);
  let endMin =
    typeof body.reminderWindowEndMin === "number"
      ? clampWindowMinutes(body.reminderWindowEndMin)
      : parseHmToMinutes(body.reminderWindowEnd);

  if (startMin == null) startMin = 9 * 60;
  if (endMin == null) endMin = 12 * 60;
  const sm = clampWindowMinutes(startMin);
  let em = clampWindowMinutes(endMin);
  if (sm >= em) {
    em = Math.min(24 * 60 - 1, sm + 60);
  }

  let anchor =
    typeof body.reminderAnchorYmd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.reminderAnchorYmd.trim())
      ? body.reminderAnchorYmd.trim()
      : opts.previousAnchor;

  if (!anchor) anchor = opts.todayAnchorYmd;

  data.reminderCadenceDays = cadence;
  data.reminderWindowStartMin = sm;
  data.reminderWindowEndMin = em;
  data.reminderAnchorYmd = anchor;

  const cadenceChanged = cadence !== opts.previousCadence;
  const anchorChanged = anchor !== opts.previousAnchor;
  if (cadenceChanged || anchorChanged) {
    data.reminderLastFiredYmd = null;
  }
}

export function reminderFieldsForCreate(
  body: Record<string, unknown>,
  todayAnchorYmd: string
): Record<string, unknown> | undefined {
  if (!("reminderCadenceDays" in body)) return undefined;
  const raw = body.reminderCadenceDays;
  if (raw === null || raw === undefined) return undefined;
  const cadence = clampReminderCadence(Number(raw));
  if (cadence == null) return undefined;

  let startMin =
    typeof body.reminderWindowStartMin === "number"
      ? clampWindowMinutes(body.reminderWindowStartMin)
      : parseHmToMinutes(body.reminderWindowStart);
  let endMin =
    typeof body.reminderWindowEndMin === "number"
      ? clampWindowMinutes(body.reminderWindowEndMin)
      : parseHmToMinutes(body.reminderWindowEnd);
  if (startMin == null) startMin = 9 * 60;
  if (endMin == null) endMin = 12 * 60;
  const sm = clampWindowMinutes(startMin);
  let em = clampWindowMinutes(endMin);
  if (sm >= em) {
    em = Math.min(24 * 60 - 1, sm + 60);
  }

  let anchor =
    typeof body.reminderAnchorYmd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.reminderAnchorYmd.trim())
      ? body.reminderAnchorYmd.trim()
      : todayAnchorYmd;

  return {
    reminderCadenceDays: cadence,
    reminderWindowStartMin: sm,
    reminderWindowEndMin: em,
    reminderAnchorYmd: anchor,
    reminderLastFiredYmd: null,
  };
}
