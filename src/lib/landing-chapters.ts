export const LANDING_CHAPTER_COUNT = 6;

export const LANDING_CHAPTERS = [
  { id: "meet", labelKey: "sceneMeetLabel" },
  { id: "chaos", labelKey: "sceneChaosLabel" },
  { id: "home", labelKey: "sceneHomeLabel" },
  { id: "play", labelKey: "scenePlayLabel" },
  { id: "board", labelKey: "sceneBoardLabel" },
  { id: "kit", labelKey: "sceneKitLabel" },
] as const;

export type LandingChapterId = (typeof LANDING_CHAPTERS)[number]["id"];
export type LandingChapterLabelKey = (typeof LANDING_CHAPTERS)[number]["labelKey"];
