const WINDOW_MS = 60_000;
const MAX_EVENTS = 100;

type Bucket = { windowStart: number; count: number };

const buckets = new Map<string, Bucket>();

export function achievementEventRateOk(userId: string): boolean {
  const now = Date.now();
  const b = buckets.get(userId);
  if (!b || now - b.windowStart >= WINDOW_MS) {
    buckets.set(userId, { windowStart: now, count: 1 });
    return true;
  }
  if (b.count >= MAX_EVENTS) return false;
  b.count += 1;
  return true;
}
