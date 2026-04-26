export const TASK_POINTS_AWARDED_EVENT = "task-points-awarded";

export const XP_EVENT_POINTS = {
  task_completed: 10,
  subscription_deleted: 25,
  credit_closed: 60,
  shopping_item_closed: 8,
  medication_taken: 5,
  note_created: 3,
} as const;

export type XpEventType = keyof typeof XP_EVENT_POINTS;

export function xpPointsForEvent(eventType: XpEventType): number {
  return XP_EVENT_POINTS[eventType];
}
