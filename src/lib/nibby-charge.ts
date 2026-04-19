export type NibbyChargeStage = 1 | 2 | 3 | 4;

export function nibbyChargeStage(doneToday: number, doneWeek: number): NibbyChargeStage {
  if (doneToday >= 4 || doneWeek >= 16) return 4;
  if (doneToday >= 2 || doneWeek >= 8) return 3;
  if (doneToday >= 1 || doneWeek >= 4) return 2;
  return 1;
}
