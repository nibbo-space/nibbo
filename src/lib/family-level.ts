const FAMILY_LEVEL_CAP = 80;

function buildCumulativeMinXpPerLevel(): number[] {
  const cum: number[] = [0];
  let acc = 0;
  for (let L = 1; L < FAMILY_LEVEL_CAP; L += 1) {
    const delta = Math.round(38 + L * 11 + L * L * 0.38);
    acc += delta;
    cum.push(acc);
  }
  return cum;
}

export const FAMILY_LEVEL_MIN_TOTAL_XP = buildCumulativeMinXpPerLevel();

export type FamilyLevelProgress = {
  level: number;
  xpIntoLevel: number;
  xpForThisLevel: number;
  progressPercent: number;
  totalXp: number;
  isMaxLevel: boolean;
};

export function familyLevelProgress(totalXp: number): FamilyLevelProgress {
  const xp = Math.max(0, Math.floor(Number.isFinite(totalXp) ? totalXp : 0));
  const cum = FAMILY_LEVEL_MIN_TOTAL_XP;
  let idx = 0;
  for (let i = 0; i < cum.length; i += 1) {
    if (xp >= cum[i]!) idx = i;
    else break;
  }
  const level = idx + 1;
  const floor = cum[idx]!;
  const ceiling = cum[idx + 1];
  if (ceiling === undefined) {
    return {
      level,
      xpIntoLevel: xp - floor,
      xpForThisLevel: 0,
      progressPercent: 100,
      totalXp: xp,
      isMaxLevel: true,
    };
  }
  const xpIntoLevel = xp - floor;
  const xpForThisLevel = ceiling - floor;
  const progressPercent =
    xpForThisLevel <= 0 ? 100 : Math.min(100, Math.round((xpIntoLevel / xpForThisLevel) * 100));
  return {
    level,
    xpIntoLevel,
    xpForThisLevel,
    progressPercent,
    totalXp: xp,
    isMaxLevel: false,
  };
}
