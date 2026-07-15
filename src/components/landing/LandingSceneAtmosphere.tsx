export function LandingSceneAtmosphere({ variant = "day" }: { variant?: "day" | "storm" | "play" | "dusk" }) {
  const bg =
    variant === "storm"
      ? "radial-gradient(ellipse 70% 55% at 60% 40%, rgba(255,90,106,0.22) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 20% 20%, rgba(148,163,184,0.35) 0%, transparent 50%), linear-gradient(180deg, #eef2f7 0%, #e8eef6 45%, #fce7eb 100%)"
      : variant === "play"
        ? "radial-gradient(ellipse 70% 55% at 55% 45%, rgba(61,207,154,0.2) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 20% 15%, rgba(255,90,106,0.14) 0%, transparent 50%), linear-gradient(180deg, #f4f7fb 0%, #ecfdf5 50%, #fff1f4 100%)"
        : variant === "dusk"
          ? "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(255,90,106,0.18) 0%, transparent 55%), radial-gradient(ellipse 45% 35% at 80% 20%, rgba(125,211,252,0.3) 0%, transparent 50%), linear-gradient(180deg, #f4f7fb 0%, #fdf2f4 55%, #ffe4ea 100%)"
          : "radial-gradient(ellipse 70% 55% at 55% 45%, rgba(255,90,106,0.16) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 15% 15%, rgba(125,211,252,0.35) 0%, transparent 50%), linear-gradient(180deg, #f4f7fb 0%, #e8f4fc 50%, #ffe8eb 100%)";

  return <div className="pointer-events-none absolute inset-0" style={{ background: bg }} aria-hidden />;
}
