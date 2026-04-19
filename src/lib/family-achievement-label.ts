import { achievementById } from "@/lib/achievements/registry";
import type { AppLanguage } from "@/lib/i18n";
import { I18N } from "@/lib/i18n";

export function familyAchievementLabel(achievementId: string, language: AppLanguage) {
  const badges = I18N[language].achievements.badges as Record<string, string>;
  if (badges[achievementId]) return badges[achievementId]!;
  const def = achievementById(achievementId);
  if (def?.badgeKey && badges[def.badgeKey]) return badges[def.badgeKey]!;
  return achievementId;
}

export function familyAchievementDescription(achievementId: string, language: AppLanguage) {
  const desc = (I18N[language].achievements as { badgeDescriptions: Record<string, string> }).badgeDescriptions;
  if (desc[achievementId]) return desc[achievementId]!;
  const def = achievementById(achievementId);
  if (def?.badgeKey && desc[def.badgeKey]) return desc[def.badgeKey]!;
  return "";
}
