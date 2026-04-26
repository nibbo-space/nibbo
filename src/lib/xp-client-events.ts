import { ACHIEVEMENT_UNLOCK_EVENT, type AchievementUnlockDetail } from "@/lib/achievement-unlock-events";
import { TASK_POINTS_AWARDED_EVENT } from "@/lib/task-points";

type XpEventPayload = {
  awardedPoints?: unknown;
  newAchievementIds?: unknown;
};

export function dispatchXpAndAchievementEvents(payload: unknown) {
  if (typeof window === "undefined" || typeof payload !== "object" || payload === null) return;
  const data = payload as XpEventPayload;

  const points = typeof data.awardedPoints === "number" ? data.awardedPoints : 0;
  if (points > 0) {
    window.dispatchEvent(new CustomEvent(TASK_POINTS_AWARDED_EVENT, { detail: { points } }));
  }

  if (!Array.isArray(data.newAchievementIds) || data.newAchievementIds.length === 0) return;
  const ids = data.newAchievementIds.filter((x): x is string => typeof x === "string" && x.length > 0);
  if (ids.length === 0) return;
  window.dispatchEvent(new CustomEvent<AchievementUnlockDetail>(ACHIEVEMENT_UNLOCK_EVENT, { detail: { ids } }));
}
