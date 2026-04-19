export type CozySeasonMode = "auto" | "spring" | "summer" | "autumn" | "winter";
export type CozySeason = Exclude<CozySeasonMode, "auto">;
export type CozyMascot = "nibby";

export interface CozyConfig {
  speed: number;
  intensity: number;
  seasonMode: CozySeasonMode;
  season: CozySeason;
  mascot: CozyMascot;
}

export const COZY_STORAGE_KEY = "nibbo.cozy.config";

export const resolveSeason = (date = new Date()): CozySeason => {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
};

export const defaultCozyConfig = (): CozyConfig => ({
  speed: 1,
  intensity: 0.7,
  seasonMode: "auto",
  season: resolveSeason(),
  mascot: "nibby",
});

export const clampCozyNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const normalizeCozyConfig = (value: Partial<CozyConfig> | null | undefined): CozyConfig => {
  const base = defaultCozyConfig();
  const seasonMode = value?.seasonMode ?? base.seasonMode;
  const season = seasonMode === "auto" ? resolveSeason() : (value?.season ?? seasonMode);
  return {
    speed: clampCozyNumber(value?.speed ?? base.speed, 0.6, 1.4),
    intensity: clampCozyNumber(value?.intensity ?? base.intensity, 0.2, 1),
    seasonMode,
    season,
    mascot: "nibby",
  };
};

export const applyCozyConfigToDocument = (config: CozyConfig) => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.cozyTheme = config.season;
  document.documentElement.dataset.cozyThemeMode = config.seasonMode;
  document.documentElement.dataset.cozyMascot = config.mascot;
};

export const cozyMotion = (config: CozyConfig) => ({
  hoverScale: 1 + 0.02 * config.intensity,
  tapScale: 1 - 0.02 * config.intensity,
  duration: 0.15 + 0.07 * (2 - config.speed),
});
