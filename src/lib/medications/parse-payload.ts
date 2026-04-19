import { MedicationScheduleMode } from "@prisma/client";
import { kyivCalendarYmd } from "@/lib/kyiv-range";
import { clampReminderCadence, clampWindowMinutes } from "@/lib/task-reminder";

function parseHmToMinutes(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number.parseInt(m[1], 10);
  const mi = Number.parseInt(m[2], 10);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

function normalizeDailySlots(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (const x of raw) {
    const n = typeof x === "number" ? x : Number(x);
    if (!Number.isFinite(n)) continue;
    const v = clampWindowMinutes(Math.floor(n));
    if (!out.includes(v)) out.push(v);
  }
  return out.sort((a, b) => a - b).slice(0, 8);
}

function dailySlotsFromTimeStrings(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (const x of raw) {
    const m = parseHmToMinutes(x);
    if (m != null && !out.includes(m)) out.push(m);
  }
  return out.sort((a, b) => a - b).slice(0, 8);
}

export type ParsedMedicationPayload = {
  name: string;
  notes: string | null;
  scheduleMode: MedicationScheduleMode;
  dailySlotMinutes: number[];
  slotToleranceMin: number;
  intervalDays: number | null;
  intervalAnchorYmd: string | null;
  intervalWindowStartMin: number | null;
  intervalWindowEndMin: number | null;
};

export function parseMedicationPayload(
  body: Record<string, unknown>,
  timeZone: string,
  now: Date
): ParsedMedicationPayload | null {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  if (!name) return null;
  const notesRaw = body.notes;
  const notes =
    notesRaw === null || notesRaw === undefined
      ? null
      : typeof notesRaw === "string"
        ? notesRaw.trim().slice(0, 2000) || null
        : null;

  const modeRaw = String(body.scheduleMode ?? "").toUpperCase();
  const scheduleMode =
    modeRaw === "INTERVAL_DAYS" ? MedicationScheduleMode.INTERVAL_DAYS : MedicationScheduleMode.DAILY_TIMES;

  let dailySlotMinutes =
    normalizeDailySlots(body.dailySlotMinutes).length > 0
      ? normalizeDailySlots(body.dailySlotMinutes)
      : dailySlotsFromTimeStrings(body.dailyTimes);

  const tolRaw = body.slotToleranceMin;
  const slotToleranceMin =
    typeof tolRaw === "number"
      ? Math.max(15, Math.min(180, Math.floor(tolRaw)))
      : typeof tolRaw === "string"
        ? Math.max(15, Math.min(180, Number.parseInt(tolRaw, 10) || 45))
        : 45;

  let intervalDays: number | null = null;
  let intervalAnchorYmd: string | null = null;
  let intervalWindowStartMin: number | null = null;
  let intervalWindowEndMin: number | null = null;

  if (scheduleMode === MedicationScheduleMode.INTERVAL_DAYS) {
    intervalDays = clampReminderCadence(Number(body.intervalDays ?? 0));
    if (intervalDays == null) return null;
    const anchor =
      typeof body.intervalAnchorYmd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.intervalAnchorYmd.trim())
        ? body.intervalAnchorYmd.trim()
        : kyivCalendarYmd(now, timeZone);
    intervalAnchorYmd = anchor;
    let sm =
      typeof body.intervalWindowStartMin === "number"
        ? clampWindowMinutes(body.intervalWindowStartMin)
        : parseHmToMinutes(body.intervalWindowStart);
    let em =
      typeof body.intervalWindowEndMin === "number"
        ? clampWindowMinutes(body.intervalWindowEndMin)
        : parseHmToMinutes(body.intervalWindowEnd);
    if (sm == null) sm = 9 * 60;
    if (em == null) em = 12 * 60;
    intervalWindowStartMin = clampWindowMinutes(sm);
    intervalWindowEndMin = Math.min(24 * 60 - 1, Math.max(intervalWindowStartMin + 60, clampWindowMinutes(em)));
    dailySlotMinutes = [];
  } else if (dailySlotMinutes.length === 0) {
    return null;
  }

  return {
    name,
    notes,
    scheduleMode,
    dailySlotMinutes,
    slotToleranceMin,
    intervalDays,
    intervalAnchorYmd,
    intervalWindowStartMin,
    intervalWindowEndMin,
  };
}
