import { ACHIEVEMENT_UNLOCK_EVENT, type AchievementUnlockDetail } from "@/lib/achievement-unlock-events";

let pending = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_MS = 850;
const BATCH = 4;

async function flushMascotBlobTaps() {
  if (typeof window === "undefined") return;
  const n = pending;
  pending = 0;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (n < 1) return;
  try {
    const res = await fetch("/api/achievements/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "mascot_blob_tap", count: n }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { newUnlockIds?: string[] };
    const ids = data.newUnlockIds?.filter(Boolean) ?? [];
    if (ids.length > 0) {
      window.dispatchEvent(
        new CustomEvent<AchievementUnlockDetail>(ACHIEVEMENT_UNLOCK_EVENT, { detail: { ids } })
      );
    }
  } catch {
    /* ignore */
  }
}

export function reportMascotBlobTap() {
  if (typeof window === "undefined") return;
  pending += 1;
  if (pending >= BATCH) {
    void flushMascotBlobTaps();
    return;
  }
  if (!timer) {
    timer = setTimeout(() => {
      timer = null;
      void flushMascotBlobTaps();
    }, FLUSH_MS);
  }
}
