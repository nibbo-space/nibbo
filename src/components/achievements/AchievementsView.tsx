"use client";

import Link from "next/link";
import { Swords } from "lucide-react";
import { useMemo } from "react";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { EARLY_SETTLER_ACHIEVEMENT_ID, type AchievementKind } from "@/lib/achievements/registry";
import { familyLevelProgress } from "@/lib/family-level";
import { familyAchievementDescription } from "@/lib/family-achievement-label";
import { messageLocale, I18N } from "@/lib/i18n";

export type AchievementCardVM = {
  id: string;
  kind: AchievementKind;
  threshold: number;
  secret: boolean;
  order: number;
  badgeKey: string;
  emoji: string;
  stickerBorderUnlocked: string;
  stickerBgUnlocked: string;
  stickerBorderLocked: string;
  stickerBgLocked: string;
  unlocked: boolean;
};

type RankRow = {
  rank: number;
  familyId: string;
  familyName: string;
  points: number;
};

type FamilyInfo = {
  id: string;
  name: string;
  shareInLeaderboard: boolean;
} | null;

interface AchievementsViewProps {
  points: number;
  familyInfo: FamilyInfo;
  myRank: RankRow | null;
  rows: RankRow[];
  achievements: AchievementCardVM[];
}

function stickerTiltClass(id: string, index: number): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h + id.charCodeAt(i)) % 4;
  }
  const opts = ["-rotate-[2.5deg]", "rotate-[2.5deg]", "-rotate-[1.2deg]", "rotate-[1.2deg]"];
  return opts[(h + index) % opts.length]!;
}

function footerBarClass(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h + id.charCodeAt(i)) % 4;
  }
  const opts = [
    "bg-cream-100 text-warm-800",
    "bg-peach-100 text-warm-800",
    "bg-lavender-100 text-lavender-900",
    "bg-rose-100 text-rose-950",
  ];
  return opts[h]!;
}

function rankDotClass(rank: number): string {
  const colors = ["bg-rose-400", "bg-peach-400", "bg-lavender-400", "bg-sage-500", "bg-rose-500"];
  return colors[(Math.max(1, rank) - 1) % colors.length]!;
}

function completionPercent(points: number, maxXp: number): number {
  if (maxXp <= 0) return 0;
  return Math.min(100, Math.round((points / maxXp) * 100));
}

export default function AchievementsView({
  points,
  familyInfo,
  myRank,
  rows,
  achievements,
}: AchievementsViewProps) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].achievements;
  const fb = t.familyBattle;
  const badges = t.badges as Record<string, string>;
  const hints = (t as { badgeHints?: Record<string, string> }).badgeHints ?? {};

  const xpMilestones = useMemo(
    () => achievements.filter((a) => a.kind === "xp_family").sort((a, b) => a.threshold - b.threshold),
    [achievements]
  );

  const nextXpMilestone = useMemo(
    () => xpMilestones.find((a) => points < a.threshold) ?? null,
    [xpMilestones, points]
  );

  const levelProgress = useMemo(() => familyLevelProgress(points), [points]);

  const topPoints = rows[0]?.points ?? 1;
  const badgeLabel = (key: string) => badges[key] ?? key;

  const kindLabel = (kind: AchievementKind) => {
    if (kind === "xp_family") return t.kindXp;
    if (kind === "family_members") return t.kindFamily;
    if (kind === "counter_user") return t.kindTap;
    if (kind === "registration_rank") return t.kindEarly;
    return t.kindStat;
  };

  const leader = rows[0];
  const restRows = rows.slice(1);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 md:space-y-6" data-tour="achievements-hud">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_min(17rem,100%)] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-5 md:space-y-6">
          <header className="rounded-3xl border border-warm-100 bg-white/80 p-5 shadow-cozy sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">{t.hudEyebrow}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-warm-800 sm:text-3xl">{t.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-warm-500">{t.subtitle}</p>
            <div className="mt-4">
              <Link
                href="/achievements/xp"
                className="inline-flex rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm font-medium text-warm-700 hover:bg-warm-50"
              >
                XP rules and family history
              </Link>
            </div>
          </header>

          <Link
            href="/achievements/family-battle"
            className="group flex flex-col gap-3 rounded-3xl border-2 border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-lavender-50 p-5 shadow-cozy transition hover:border-rose-300 hover:shadow-cozy-hover sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-peach-400 text-white shadow-md ring-2 ring-white/80">
                <Swords className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">{fb.eyebrow}</p>
                <p className="mt-0.5 text-lg font-bold text-warm-800">{fb.cardCtaTitle}</p>
                <p className="mt-1 max-w-xl text-sm text-warm-600">{fb.cardCtaSubtitle}</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-warm-800 px-5 py-3 text-sm font-bold text-white shadow-md transition group-hover:bg-warm-900">
              {fb.cardCtaButton}
            </span>
          </Link>

          <section
            className="rounded-3xl border border-warm-100 bg-white/80 p-5 shadow-cozy sm:p-6 md:p-7"
            aria-label="XP"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-6 sm:gap-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">
                    {t.familyLevelEyebrow}
                  </p>
                  <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-warm-800 sm:text-5xl">
                    {levelProgress.level}
                  </p>
                </div>
                <div className="pb-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">
                    {t.familyTotalXpShort}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-warm-700 sm:text-3xl">{points}</p>
                </div>
              </div>
              {familyInfo?.shareInLeaderboard && myRank ? (
                <p className="max-w-sm text-right text-sm font-medium leading-snug text-warm-600">
                  {t.yourFamilyRankPrefix}{" "}
                  <span className="font-semibold text-rose-600">«{familyInfo.name}»</span> {t.yourFamilyRankMiddle}{" "}
                  <span className="font-bold text-lavender-600">#{myRank.rank}</span> {t.yourFamilyRankSuffix}{" "}
                  <span className="font-bold tabular-nums text-warm-800">{myRank.points}</span> XP.
                </p>
              ) : (
                <p className="max-w-xs text-right text-sm text-warm-500">{t.familyNotInRating}</p>
              )}
            </div>
            {!levelProgress.isMaxLevel ? (
              <>
                <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-warm-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-400 via-peach-300 to-lavender-400 shadow-sm transition-[width] duration-500"
                    style={{ width: `${levelProgress.progressPercent}%` }}
                  />
                </div>
                <p className="mt-3 text-sm font-medium leading-snug text-warm-600">
                  {t.familyLevelXpToNext
                    .replace("{current}", String(levelProgress.xpIntoLevel))
                    .replace("{need}", String(levelProgress.xpForThisLevel))
                    .replace("{next}", String(levelProgress.level + 1))}
                </p>
              </>
            ) : (
              <>
                <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-warm-100">
                  <div className="h-full w-full rounded-full bg-gradient-to-r from-sage-400 to-emerald-400 shadow-sm" />
                </div>
                <p className="mt-3 text-sm font-medium leading-snug text-sage-700">{t.familyLevelMax}</p>
              </>
            )}
            <p className="mt-2 text-xs leading-snug text-warm-500">
              {nextXpMilestone ? (
                <>
                  {t.nextAchievementHint
                    .replace("{badge}", badgeLabel(nextXpMilestone.badgeKey))
                    .replace("{threshold}", String(nextXpMilestone.threshold))}
                </>
              ) : (
                <span className="text-sage-600">{t.allUnlocked}</span>
              )}
            </p>
          </section>
        </div>

        <aside className="min-w-0 w-full lg:row-span-2 lg:sticky lg:top-4 lg:self-start">
          <div
            className={`flex flex-col overflow-hidden rounded-3xl border border-warm-100 bg-white/80 shadow-cozy ${
              rows.length > 0
                ? "max-h-[min(75vh,26rem)] sm:max-h-[min(78vh,30rem)] lg:max-h-[min(88vh,36rem)]"
                : ""
            }`}
          >
            <div className="shrink-0 border-b border-warm-100/80 px-5 pb-3 pt-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-warm-800">
                <span aria-hidden>🏆</span>
                {t.rankingTitle}
              </h2>
              <p className="mt-1 text-xs text-warm-500">{t.rankingSubtitle}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]">
              {rows.length === 0 ? (
                <p className="text-sm text-warm-500">{t.noFamilies}</p>
              ) : (
                <>
                  {leader ? (
                    <div className="rounded-2xl border border-warm-100 bg-gradient-to-br from-cream-50 via-white to-lavender-50/50 p-4 shadow-cozy">
                      <div className="flex flex-col items-center text-center">
                        <div className="relative">
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-200 via-peach-100 to-lavender-200 text-3xl shadow-inner ring-4 ring-white">
                            🏠
                          </div>
                          <span className="absolute -right-1 -top-1 text-2xl drop-shadow" aria-hidden>
                            👑
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm font-bold text-warm-800">{leader.familyName}</p>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold tabular-nums text-rose-800 ring-1 ring-rose-200/80">
                            {t.familyLevelBadge.replace("{level}", String(familyLevelProgress(leader.points).level))}
                          </span>
                          <span className="rounded-full bg-warm-800 px-3 py-1 text-xs font-bold tabular-nums text-cream-50 shadow-md">
                            {completionPercent(leader.points, topPoints)}% · {leader.points} XP
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <ul className={leader ? "mt-4 space-y-2" : "space-y-2"}>
                    {restRows.map((row) => {
                      const mine = row.familyId === familyInfo?.id;
                      const pct = completionPercent(row.points, topPoints);
                      const rowLevel = familyLevelProgress(row.points).level;
                      const badge = t.familyLevelBadge.replace("{level}", String(rowLevel));
                      return (
                        <li
                          key={row.familyId}
                          className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                            mine
                              ? "border-rose-200 bg-white shadow-cozy-hover ring-1 ring-rose-100"
                              : "border-transparent bg-warm-50/70 hover:border-warm-100 hover:bg-white hover:shadow-cozy"
                          }`}
                        >
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-lavender-100 text-lg ring-2 ring-white">
                              🏠
                            </div>
                            <span className="absolute -bottom-1 -right-1 min-w-[1.15rem] rounded-md bg-warm-800 px-1 py-px text-center text-[9px] font-bold leading-none text-cream-50 shadow-sm ring-1 ring-white">
                              {rowLevel}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-bold ${mine ? "text-rose-600" : "text-warm-800"}`}>
                              {row.familyName}
                            </p>
                            <p className="text-[11px] font-semibold text-warm-500">
                              <span className="font-bold text-lavender-700">{badge}</span>
                              <span> · </span>
                              {pct}% · {row.points} XP
                            </p>
                          </div>
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${rankDotClass(row.rank)}`}
                          >
                            {row.rank}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0 lg:col-span-1" aria-labelledby="achievements-grid-heading">
          <div className="mb-5">
            <h2 id="achievements-grid-heading" className="text-lg font-bold text-warm-800 sm:text-xl">
              {t.achievementsTitle}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-warm-500">{t.stickersSubtitle}</p>
          </div>

            <div className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 min-[440px]:gap-5 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
              {achievements.map((card, index) => {
                const mystery = card.secret && !card.unlocked;
                const achievementDesc = mystery ? "" : familyAchievementDescription(card.id, language);
                const title = mystery ? t.secretMysteryTitle : badgeLabel(card.badgeKey);
                const emoji = mystery ? t.secretMysteryEmoji : card.emoji;
                const accentBorder = card.unlocked ? card.stickerBorderUnlocked : card.stickerBorderLocked;
                const tint = card.unlocked ? card.stickerBgUnlocked : card.stickerBgLocked;
                const tilt = stickerTiltClass(card.id, index);
                const hintLine = mystery
                  ? t.secretMysterySubtitle
                  : hints[card.badgeKey] ??
                    (card.kind === "xp_family"
                      ? `${t.threshold}: ${card.threshold} XP`
                      : card.kind === "family_members"
                        ? t.thresholdMembersHint.replace("{n}", String(card.threshold))
                        : card.kind === "registration_rank"
                          ? t.thresholdRegistrationHint.replace("{n}", String(card.threshold))
                          : `${t.threshold}: ${card.threshold}`);
                const bar = card.unlocked ? footerBarClass(card.id) : "bg-warm-200/90 text-warm-700 border-t border-warm-300/60";
                const metaRight = mystery
                  ? "· · ·"
                  : card.kind === "xp_family"
                    ? `${card.threshold} XP`
                    : card.kind === "family_members"
                      ? t.thresholdMembersMeta.replace("{n}", String(card.threshold))
                      : card.kind === "registration_rank"
                        ? t.thresholdRegistrationMeta.replace("{n}", String(card.threshold))
                        : `${card.threshold}`;

                const earlyGoldFrame =
                  card.id === EARLY_SETTLER_ACHIEVEMENT_ID && card.unlocked
                    ? " shadow-[0_0_0_2px_rgba(251,191,36,0.5),0_14px_44px_-14px_rgba(245,158,11,0.28)]"
                    : "";

                const shell = card.unlocked
                  ? `${tilt} border border-warm-100 bg-white/90 shadow-cozy-lg ring-1 ring-rose-100/90 transition duration-300 hover:-translate-y-1 hover:shadow-cozy-hover hover:ring-rose-200${earlyGoldFrame}`
                  : "rotate-0 border-2 border-dashed border-warm-300/70 bg-warm-50/75 shadow-cozy saturate-[0.72] transition duration-200 hover:border-warm-400/80 hover:bg-warm-50";

                return (
                  <article
                    key={card.id}
                    className={`group flex min-h-[320px] flex-col overflow-hidden rounded-3xl sm:min-h-[360px] ${shell}`}
                  >
                    <div className="relative flex flex-1 flex-col px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
                      <div
                        className={`pointer-events-none absolute left-1/2 top-3 h-2 w-16 -translate-x-1/2 rounded-full bg-gradient-to-r from-white via-cream-200 to-white shadow-sm ring-1 ring-warm-200/60 ${card.unlocked ? "opacity-95" : "opacity-35"}`}
                        aria-hidden
                      />
                      <div className="relative z-[1] flex items-start justify-between gap-2 pt-2">
                        <span
                          className={`text-[11px] font-bold tabular-nums ${card.unlocked ? "text-warm-500" : "text-warm-400"}`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            card.unlocked
                              ? "bg-sage-500 text-white shadow-sm"
                              : "border border-warm-400/50 bg-warm-100/90 text-warm-700"
                          }`}
                        >
                          {card.unlocked ? t.unlocked : t.locked}
                        </span>
                      </div>

                      <div className="relative z-[1] mt-4 flex flex-1 flex-col items-center">
                        <div className="relative">
                          {card.unlocked ? (
                            <div
                              className="pointer-events-none absolute -inset-4 rounded-[2.5rem] bg-gradient-to-b from-white/90 to-transparent opacity-70 blur-md"
                              aria-hidden
                            />
                          ) : null}
                          <div
                            className={`relative flex aspect-square w-[min(11rem,70vw)] max-w-[12.5rem] items-center justify-center overflow-hidden rounded-[2rem] border-[3px] bg-gradient-to-b sm:w-44 sm:max-w-none md:w-48 ${accentBorder} ${tint} ${
                              card.unlocked
                                ? "shadow-[0_12px_0_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.65)]"
                                : "shadow-[0_5px_0_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.35)]"
                            }`}
                          >
                            {!card.unlocked ? (
                              <div
                                className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-warm-900/[0.07] to-warm-900/[0.14]"
                                aria-hidden
                              />
                            ) : null}
                            <span
                              className={`relative z-[2] text-[min(4.25rem,22vw)] leading-none sm:text-7xl md:text-8xl ${
                                card.unlocked
                                  ? "drop-shadow-[0_2px_0_rgba(0,0,0,0.06)]"
                                  : mystery
                                    ? "opacity-[0.72] grayscale-[0.35] contrast-90"
                                    : "opacity-[0.42] grayscale contrast-90"
                              }`}
                            >
                              {emoji}
                            </span>
                          </div>
                        </div>

                        <h3
                          className={`mt-5 line-clamp-2 w-full text-center text-base font-bold leading-snug sm:text-lg ${
                            mystery
                              ? "tracking-[0.08em] text-warm-500"
                              : card.unlocked
                                ? "text-warm-800"
                                : "text-warm-500"
                          }`}
                        >
                          {title}
                        </h3>
                        {achievementDesc ? (
                          <p className="mt-2 line-clamp-3 w-full text-center text-xs font-medium leading-snug text-warm-600 sm:text-sm">
                            {achievementDesc}
                          </p>
                        ) : null}
                        <p
                          className={`line-clamp-1 text-center text-sm font-semibold ${
                            achievementDesc ? "mt-2" : "mt-1"
                          } ${card.unlocked ? "text-warm-500" : "text-warm-400"}`}
                        >
                          {kindLabel(card.kind)}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`mt-auto flex min-h-[3.5rem] items-stretch justify-between gap-3 px-5 py-3.5 text-left sm:min-h-[4rem] sm:px-6 sm:py-4 ${bar}`}
                    >
                      <span className="line-clamp-2 min-w-0 flex-1 text-xs font-bold leading-snug sm:text-sm">
                        {hintLine}
                      </span>
                      <span className="shrink-0 self-center text-right text-xs font-black tabular-nums opacity-90 sm:text-sm">
                        {metaRight}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
        </section>
      </div>
    </div>
  );
}
