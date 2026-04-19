import { POINTS_PER_TASK_COMPLETION } from "@/lib/task-points";

export const MASCOT_BLOB_TAP_COUNTER_KEY = "mascot_blob_tap";
export const BUDDY_CHAT_COUNTER_KEY = "buddy_chat_turns";
export const FEEDBACK_BUG_COUNTER_KEY = "feedback_bug_reports";
export const FEEDBACK_SUGGESTION_COUNTER_KEY = "feedback_suggestion_reports";
export const FAMILY_BATTLE_WINS_COUNTER_KEY = "family_battle_wins";
export const SECRET_BIG_FAMILY_ACHIEVEMENT_ID = "secret-big-family";

export type AchievementKind = "xp_family" | "family_members" | "counter_user" | "stat_user" | "registration_rank";

export type UserStatAchievementKey =
  | "user_tasks_done"
  | "user_events_assigned"
  | "user_notes_written"
  | "user_shopping_checked"
  | "user_meals_cooked"
  | "user_watch_items"
  | "user_watch_watching";

const STICKER_PRESETS = [
  {
    stickerBorderUnlocked: "border-rose-400",
    stickerBgUnlocked: "from-rose-100 via-orange-50 to-amber-50",
    stickerBorderLocked: "border-stone-300/80",
    stickerBgLocked: "from-stone-100 to-stone-200/90",
  },
  {
    stickerBorderUnlocked: "border-fuchsia-400",
    stickerBgUnlocked: "from-fuchsia-100 via-violet-50 to-indigo-50",
    stickerBorderLocked: "border-stone-300/80",
    stickerBgLocked: "from-stone-100 to-stone-200/90",
  },
  {
    stickerBorderUnlocked: "border-sky-400",
    stickerBgUnlocked: "from-sky-100 via-cyan-50 to-teal-50",
    stickerBorderLocked: "border-stone-300/80",
    stickerBgLocked: "from-stone-100 to-stone-200/90",
  },
  {
    stickerBorderUnlocked: "border-amber-400",
    stickerBgUnlocked: "from-amber-100 via-yellow-50 to-lime-50",
    stickerBorderLocked: "border-stone-300/80",
    stickerBgLocked: "from-stone-100 to-stone-200/90",
  },
  {
    stickerBorderUnlocked: "border-emerald-400",
    stickerBgUnlocked: "from-emerald-100 via-green-50 to-lime-50",
    stickerBorderLocked: "border-stone-300/80",
    stickerBgLocked: "from-stone-100 to-stone-200/90",
  },
  {
    stickerBorderUnlocked: "border-violet-400",
    stickerBgUnlocked: "from-violet-100 via-purple-50 to-pink-50",
    stickerBorderLocked: "border-stone-300/80",
    stickerBgLocked: "from-stone-100 to-stone-200/90",
  },
  {
    stickerBorderUnlocked: "border-orange-400",
    stickerBgUnlocked: "from-orange-100 via-rose-50 to-red-50",
    stickerBorderLocked: "border-stone-300/80",
    stickerBgLocked: "from-stone-100 to-stone-200/90",
  },
  {
    stickerBorderUnlocked: "border-cyan-400",
    stickerBgUnlocked: "from-cyan-100 via-sky-50 to-blue-50",
    stickerBorderLocked: "border-stone-300/80",
    stickerBgLocked: "from-stone-100 to-stone-200/90",
  },
  {
    stickerBorderUnlocked: "border-pink-400",
    stickerBgUnlocked: "from-pink-100 via-rose-50 to-fuchsia-50",
    stickerBorderLocked: "border-stone-300/80",
    stickerBgLocked: "from-stone-100 to-stone-200/90",
  },
  {
    stickerBorderUnlocked: "border-lime-400",
    stickerBgUnlocked: "from-lime-100 via-emerald-50 to-teal-50",
    stickerBorderLocked: "border-stone-300/80",
    stickerBgLocked: "from-stone-100 to-stone-200/90",
  },
] as const;

const XP_EMOJI = ["✨", "🌟", "💛", "🍯", "🧡", "💜", "🩵", "💚", "🤍", "🎀", "⭐", "🌈", "🔥", "💎", "🏆", "🎖️", "👑", "🦄", "🦋", "🌸"];
const TAP_EMOJI = ["👆", "💫", "🫧", "✨", "🌀", "🎪"];
const STAT_EMOJI = ["📌", "🗂️", "📅", "🛒", "🍳", "📺", "🎯", "🧩", "🎨", "🔖", "✅", "📝", "🍿", "🥇", "💪", "🌱", "🦾", "📎", "🎬", "🧠", "🔔", "🎁", "🛍️", "🍜"];

export type AchievementDefinition = {
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
  counterKey?: string;
  statKey?: UserStatAchievementKey;
};

export const EARLY_SETTLER_ACHIEVEMENT_ID = "early-settler-100";

type StickerStyleFields = Pick<
  AchievementDefinition,
  "stickerBorderUnlocked" | "stickerBgUnlocked" | "stickerBorderLocked" | "stickerBgLocked"
>;

const EARLY_SETTLER_GOLD: StickerStyleFields = {
  stickerBorderUnlocked:
    "border-amber-500 ring-2 ring-amber-300/70 shadow-[0_0_22px_rgba(245,158,11,0.42),inset_0_0_0_1px_rgba(255,251,235,0.85)]",
  stickerBgUnlocked: "from-amber-100 via-yellow-50 to-amber-100",
  stickerBorderLocked: "border-amber-400/55",
  stickerBgLocked: "from-amber-50/90 via-stone-100 to-stone-200/85",
};

function sortAchievementsForDisplay(a: AchievementDefinition, b: AchievementDefinition): number {
  const aFirst = a.id === EARLY_SETTLER_ACHIEVEMENT_ID ? 0 : 1;
  const bFirst = b.id === EARLY_SETTLER_ACHIEVEMENT_ID ? 0 : 1;
  if (aFirst !== bFirst) return aFirst - bFirst;
  return a.order - b.order;
}

function pickS(order: number) {
  return STICKER_PRESETS[order % STICKER_PRESETS.length]!;
}

function xpRow(
  order: number,
  id: string,
  threshold: number,
  badgeKey: string,
  secret: boolean
): AchievementDefinition {
  const s = pickS(order);
  return {
    id,
    kind: "xp_family",
    threshold,
    secret,
    order,
    badgeKey,
    emoji: XP_EMOJI[order % XP_EMOJI.length]!,
    ...s,
  };
}

function tapRow(
  order: number,
  id: string,
  threshold: number,
  badgeKey: string,
  secret: boolean
): AchievementDefinition {
  const s = pickS(order + 3);
  return {
    id,
    kind: "counter_user",
    threshold,
    secret,
    order,
    badgeKey,
    emoji: TAP_EMOJI[order % TAP_EMOJI.length]!,
    counterKey: MASCOT_BLOB_TAP_COUNTER_KEY,
    ...s,
  };
}

function familyMembersRow(
  order: number,
  id: string,
  threshold: number,
  badgeKey: string,
  secret: boolean
): AchievementDefinition {
  const s = pickS(order + 1);
  return {
    id,
    kind: "family_members",
    threshold,
    secret,
    order,
    badgeKey,
    emoji: XP_EMOJI[order % XP_EMOJI.length]!,
    ...s,
  };
}

function registrationRankRow(
  order: number,
  id: string,
  threshold: number,
  badgeKey: string,
  secret: boolean,
  sticker?: StickerStyleFields
): AchievementDefinition {
  const s = sticker ?? pickS(order + 6);
  return {
    id,
    kind: "registration_rank",
    threshold,
    secret,
    order,
    badgeKey,
    emoji: "🏠",
    ...s,
  };
}

function counterUserRow(
  order: number,
  id: string,
  counterKey: string,
  threshold: number,
  badgeKey: string,
  secret: boolean
): AchievementDefinition {
  const s = pickS(order + 4);
  return {
    id,
    kind: "counter_user",
    threshold,
    secret,
    order,
    badgeKey,
    emoji: TAP_EMOJI[order % TAP_EMOJI.length]!,
    counterKey,
    ...s,
  };
}

function statRow(
  order: number,
  id: string,
  statKey: UserStatAchievementKey,
  threshold: number,
  badgeKey: string,
  secret: boolean
): AchievementDefinition {
  const s = pickS(order + 5);
  return {
    id,
    kind: "stat_user",
    statKey,
    threshold,
    secret,
    order,
    badgeKey,
    emoji: STAT_EMOJI[order % STAT_EMOJI.length]!,
    ...s,
  };
}

const XP_DEFS: AchievementDefinition[] = [
  xpRow(1, "family-xp-20", 20, "familyXp20", false),
  xpRow(2, "first-steps", 50, "first-steps", false),
  xpRow(3, "family-xp-100", 100, "familyXp100", false),
  xpRow(4, "family-xp-150", 150, "familyXp150", false),
  xpRow(5, "family-xp-200", 200, "familyXp200", false),
  xpRow(6, "warm-routine", 300, "warm-routine", false),
  xpRow(7, "family-xp-400", 400, "familyXp400", false),
  xpRow(8, "cozy-family", 600, "cozy-family", false),
  xpRow(9, "family-xp-800", 800, "familyXp800", false),
  xpRow(10, "family-xp-950", 950, "familyXp950", false),
  xpRow(11, "task-masters", 1200, "task-masters", false),
  xpRow(12, "family-xp-1500", 1500, "familyXp1500", false),
  xpRow(13, "family-xp-1800", 1800, "familyXp1800", false),
  xpRow(14, "legend", 2500, "legend", false),
  xpRow(15, "family-xp-3200", 3200, "familyXp3200", false),
  xpRow(16, "master-of-nibbo", 5000, "master-of-nibbo", true),
  xpRow(17, "family-xp-6500", 6500, "familyXp6500", false),
  xpRow(18, "family-xp-8000", 8000, "familyXp8000", false),
  xpRow(19, "family-xp-10000", 10000, "familyXp10000", false),
  xpRow(20, "family-xp-12500", 12500, "familyXp12500", false),
];

const TAP_DEFS: AchievementDefinition[] = [
  tapRow(21, "nibby-tap-5", 5, "nibbyTap5", false),
  tapRow(22, "nibby-blob-friend", 10, "nibby-blob-friend", false),
  tapRow(23, "nibby-tap-25", 25, "nibbyTap25", false),
  tapRow(24, "nibby-tap-45", 45, "nibbyTap45", false),
  tapRow(25, "nibby-tap-75", 75, "nibbyTap75", false),
  tapRow(26, "nibby-tap-120", 120, "nibbyTap120", false),
  tapRow(27, "nibby-tap-1000", 1000, "nibbyTap1000", true),
];

const STAT_DEFS: AchievementDefinition[] = [
  statRow(28, "stat-task-1", "user_tasks_done", 1, "statTask1", false),
  statRow(29, "stat-task-3", "user_tasks_done", 3, "statTask3", false),
  statRow(30, "stat-task-7", "user_tasks_done", 7, "statTask7", false),
  statRow(31, "stat-task-15", "user_tasks_done", 15, "statTask15", false),
  statRow(32, "stat-task-25", "user_tasks_done", 25, "statTask25", false),
  statRow(33, "stat-ev-1", "user_events_assigned", 1, "statEv1", false),
  statRow(34, "stat-ev-4", "user_events_assigned", 4, "statEv4", false),
  statRow(35, "stat-ev-12", "user_events_assigned", 12, "statEv12", false),
  statRow(36, "stat-ev-30", "user_events_assigned", 30, "statEv30", false),
  statRow(37, "stat-note-1", "user_notes_written", 1, "statNote1", false),
  statRow(38, "stat-note-3", "user_notes_written", 3, "statNote3", false),
  statRow(39, "stat-note-8", "user_notes_written", 8, "statNote8", false),
  statRow(40, "stat-note-20", "user_notes_written", 20, "statNote20", false),
  statRow(41, "stat-shop-2", "user_shopping_checked", 2, "statShop2", false),
  statRow(42, "stat-shop-6", "user_shopping_checked", 6, "statShop6", false),
  statRow(43, "stat-shop-15", "user_shopping_checked", 15, "statShop15", false),
  statRow(44, "stat-shop-40", "user_shopping_checked", 40, "statShop40", false),
  statRow(45, "stat-meal-1", "user_meals_cooked", 1, "statMeal1", false),
  statRow(46, "stat-meal-4", "user_meals_cooked", 4, "statMeal4", false),
  statRow(47, "stat-meal-10", "user_meals_cooked", 10, "statMeal10", false),
  statRow(48, "stat-meal-25", "user_meals_cooked", 25, "statMeal25", false),
  statRow(49, "stat-watch-1", "user_watch_items", 1, "statWatch1", false),
  statRow(50, "stat-watch-3", "user_watch_items", 3, "statWatch3", false),
  statRow(51, "stat-watch-8", "user_watch_items", 8, "statWatch8", false),
  statRow(52, "secret-cinephile-10", "user_watch_watching", 10, "secretCinephile10", true),
];

const EXTRA_DEFS: AchievementDefinition[] = [
  familyMembersRow(53, SECRET_BIG_FAMILY_ACHIEVEMENT_ID, 6, "secretBigFamily", true),
  counterUserRow(54, "secret-buddy-chat-30", BUDDY_CHAT_COUNTER_KEY, 30, "secretBuddyChat30", true),
  counterUserRow(55, "secret-feedback-bugs-5", FEEDBACK_BUG_COUNTER_KEY, 5, "secretFeedbackBugs5", true),
  counterUserRow(56, "secret-feedback-suggestions-10", FEEDBACK_SUGGESTION_COUNTER_KEY, 10, "secretFeedbackSuggestions10", true),
  counterUserRow(57, "secret-family-battle-wins-10", FAMILY_BATTLE_WINS_COUNTER_KEY, 10, "secretFamilyBattleWins10", true),
  registrationRankRow(58, EARLY_SETTLER_ACHIEVEMENT_ID, 100, "earlySettler100", true, EARLY_SETTLER_GOLD),
];

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  ...XP_DEFS,
  ...TAP_DEFS,
  ...STAT_DEFS,
  ...EXTRA_DEFS,
].sort(sortAchievementsForDisplay);

export const XP_FAMILY_ACHIEVEMENT_IDS = ACHIEVEMENT_DEFINITIONS.filter((d) => d.kind === "xp_family").map(
  (d) => d.id
);

export const FAMILY_ACHIEVEMENT_THRESHOLDS = ACHIEVEMENT_DEFINITIONS.filter((d) => d.kind === "xp_family").map(
  (d) => ({ id: d.id, threshold: d.threshold })
) as readonly { id: string; threshold: number }[];

export function achievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
}

export function listAchievementsSorted(): AchievementDefinition[] {
  return [...ACHIEVEMENT_DEFINITIONS].sort(sortAchievementsForDisplay);
}

export function unlockedXpFamilyIdsFromXp(familyXp: number): string[] {
  return ACHIEVEMENT_DEFINITIONS.filter(
    (d) => d.kind === "xp_family" && familyXp >= d.threshold
  ).map((d) => d.id);
}

export { POINTS_PER_TASK_COMPLETION };

export function familyXpFromCompletedTaskCount(completed: number) {
  return completed * POINTS_PER_TASK_COMPLETION;
}

export function unlockedFamilyAchievementIds(familyXp: number) {
  return unlockedXpFamilyIdsFromXp(familyXp);
}
