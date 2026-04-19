"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Swords } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { NibbyChatDrive } from "@/components/shared/NibbyAssistantStage";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { type BattleMove, randomBattleMove, resolveRound } from "@/lib/family-battle";
import { FAMILY_BATTLE_WIN_XP } from "@/lib/family-display-xp";
import type { NibbyChargeStage } from "@/lib/nibby-charge";
import { I18N } from "@/lib/i18n";
import { TASK_POINTS_AWARDED_EVENT } from "@/lib/task-points";
import { cn } from "@/lib/utils";

const NibbyAssistantStage = dynamic(() => import("@/components/shared/NibbyAssistantStage"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] w-full animate-pulse rounded-2xl bg-gradient-to-b from-rose-50 via-cream-50 to-lavender-50 sm:h-[240px]" />
  ),
});

type OpponentPayload = { id: string; name: string } | null;

const MOVE_EMOJI: Record<BattleMove, string> = {
  strike: "⚔️",
  block: "🛡️",
  parry: "✨",
};

const MOVE_BURST_CLASS: Record<BattleMove, string> = {
  strike: "animate-fb-strike",
  block: "animate-fb-block",
  parry: "animate-fb-parry",
};

const MOVE_PREVIEW_ORDER: BattleMove[] = ["strike", "block", "parry"];

function FbSectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3 sm:mb-4">
      <h2 className="whitespace-nowrap font-display text-[10px] font-black uppercase tracking-[0.26em] text-warm-700 sm:text-[11px]">
        {children}
      </h2>
      <span
        className="h-0.5 min-w-[1.25rem] flex-1 max-w-[min(100%,18rem)] rounded-full bg-gradient-to-r from-rose-300 via-lavender-300 to-transparent"
        aria-hidden
      />
    </div>
  );
}

const fbPageWrap =
  "mx-auto w-full max-w-5xl px-4 pb-12 pt-2 sm:px-6 md:px-8 md:pb-16 md:pt-4";

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

interface FamilyBattleViewProps {
  playerFamilyId: string;
  playerFamilyName: string;
  opponent: OpponentPayload;
  initialBattleId: string | null;
  playerMaxLives: number;
  playerChargeStage: NibbyChargeStage;
  opponentMaxLives: number;
  opponentChargeStage: NibbyChargeStage;
}

function LivesRow({
  lives,
  max,
  bump,
  compact,
}: {
  lives: number;
  max: number;
  bump: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 justify-end gap-0.5 sm:justify-center sm:gap-1",
        bump && "animate-fb-heart-row"
      )}
      aria-hidden
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            "transition-[opacity,filter,transform] duration-300",
            compact ? "text-xs sm:text-sm" : "text-lg sm:text-2xl",
            i < lives
              ? "scale-100 text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.45)]"
              : compact
                ? "scale-95 text-warm-300/80 opacity-75 grayscale"
                : "scale-95 text-warm-200 opacity-50 grayscale"
          )}
        >
          ♥
        </span>
      ))}
    </div>
  );
}

function MoveBurstOverlay({ move, side }: { move: BattleMove; side: "player" | "opponent" }) {
  const emoji = MOVE_EMOJI[move];
  const burst = MOVE_BURST_CLASS[move];
  const tint =
    side === "player"
      ? "from-rose-500/25 via-white/50 to-peach-200/30"
      : "from-lavender-500/25 via-white/50 to-indigo-200/30";
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-gradient-to-b",
        tint
      )}
      aria-hidden
    >
      <span className={cn("inline-block text-7xl drop-shadow-lg sm:text-8xl", burst)}>{emoji}</span>
    </div>
  );
}

export default function FamilyBattleView({
  playerFamilyId,
  playerFamilyName,
  opponent,
  initialBattleId,
  playerMaxLives,
  playerChargeStage,
  opponentMaxLives,
  opponentChargeStage,
}: FamilyBattleViewProps) {
  const { language } = useAppLanguage();
  const t = I18N[language].achievements.familyBattle;
  const playerDriveRef = useRef<NibbyChatDrive>({ speaking: false, lipPulse: 0 });
  const opponentDriveRef = useRef<NibbyChatDrive>({ speaking: false, lipPulse: 0 });
  const busyRef = useRef(false);
  const battleCompletePostedRef = useRef(false);

  const [battleId, setBattleId] = useState(initialBattleId ?? "");
  const [playerLives, setPlayerLives] = useState(playerMaxLives);
  const [opponentLives, setOpponentLives] = useState(opponentMaxLives);
  const [roundMessage, setRoundMessage] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<"won" | "lost" | null>(null);

  const [busy, setBusy] = useState(false);
  const [burstLayer, setBurstLayer] = useState<0 | 1>(0);
  const [playerBurst, setPlayerBurst] = useState<BattleMove | null>(null);
  const [opponentBurst, setOpponentBurst] = useState<BattleMove | null>(null);
  const [hitTarget, setHitTarget] = useState<"player" | "opponent" | null>(null);
  const [drawClash, setDrawClash] = useState(false);
  const [playerHeartBump, setPlayerHeartBump] = useState(false);
  const [opponentHeartBump, setOpponentHeartBump] = useState(false);

  useEffect(() => {
    busyRef.current = false;
    battleCompletePostedRef.current = false;
    setBusy(false);
    setBattleId(initialBattleId ?? "");
    setPlayerLives(playerMaxLives);
    setOpponentLives(opponentMaxLives);
    setRoundMessage(null);
    setGameOver(null);
    setPlayerBurst(null);
    setOpponentBurst(null);
    setHitTarget(null);
    setDrawClash(false);
    setPlayerHeartBump(false);
    setOpponentHeartBump(false);
  }, [initialBattleId, opponent?.id, playerMaxLives, opponentMaxLives]);

  const resetMatch = useCallback(async () => {
    busyRef.current = false;
    battleCompletePostedRef.current = false;
    setBusy(false);
    setPlayerLives(playerMaxLives);
    setOpponentLives(opponentMaxLives);
    setRoundMessage(null);
    setGameOver(null);
    setPlayerBurst(null);
    setOpponentBurst(null);
    setHitTarget(null);
    setDrawClash(false);
    setPlayerHeartBump(false);
    setOpponentHeartBump(false);
    if (!opponent) return;
    setBattleId("");
    try {
      const res = await fetch("/api/family-battle/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentFamilyId: opponent.id }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { battleId?: string };
      if (data.battleId) setBattleId(data.battleId);
    } catch {}
  }, [opponent, opponentMaxLives, playerMaxLives]);

  useEffect(() => {
    if (!opponent || gameOver) return;
    if (opponentLives <= 0) setGameOver("won");
    else if (playerLives <= 0) setGameOver("lost");
  }, [opponent, opponentLives, playerLives, gameOver]);

  useEffect(() => {
    if (!opponent || !gameOver || !battleId) return;
    if (battleCompletePostedRef.current) return;
    battleCompletePostedRef.current = true;
    let cancelled = false;
    const outcome = gameOver === "won" ? "win" : "loss";
    void (async () => {
      try {
        const res = await fetch("/api/achievements/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "family_battle_complete", battleId, outcome }),
        });
        if (!res.ok) throw new Error("event failed");
        if (outcome === "win") {
          window.dispatchEvent(
            new CustomEvent(TASK_POINTS_AWARDED_EVENT, { detail: { points: FAMILY_BATTLE_WIN_XP } })
          );
        }
      } catch {
        if (!cancelled) battleCompletePostedRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [battleId, gameOver, opponent]);

  const runRound = useCallback(
    async (move: BattleMove) => {
      if (!opponent || !battleId || gameOver || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setRoundMessage(null);

      const npc = randomBattleMove();
      const outcome = resolveRound(move, npc);

      setBurstLayer((x) => (x === 0 ? 1 : 0));
      setPlayerBurst(move);
      await delay(540);
      setPlayerBurst(null);

      setBurstLayer((x) => (x === 0 ? 1 : 0));
      setOpponentBurst(npc);
      await delay(540);
      setOpponentBurst(null);

      if (outcome === "player_wins") {
        setHitTarget("opponent");
        setOpponentHeartBump(true);
        await delay(600);
        setHitTarget(null);
        setOpponentHeartBump(false);
        setRoundMessage(t.resultPlayerWinsRound);
        setOpponentLives((ol) => Math.max(0, ol - 1));
      } else if (outcome === "opponent_wins") {
        setHitTarget("player");
        setPlayerHeartBump(true);
        await delay(600);
        setHitTarget(null);
        setPlayerHeartBump(false);
        setRoundMessage(t.resultOpponentWinsRound);
        setPlayerLives((pl) => Math.max(0, pl - 1));
      } else {
        setDrawClash(true);
        await delay(500);
        setDrawClash(false);
        setRoundMessage(t.resultDraw);
      }

      busyRef.current = false;
      setBusy(false);
    },
    [battleId, opponent, gameOver, t]
  );

  const moveButtons: {
    move: BattleMove;
    emoji: string;
    surface: string;
    hover: string;
    emojiTone: string;
  }[] = [
    {
      move: "strike",
      emoji: "⚔️",
      surface: "border-rose-200/90 bg-gradient-to-br from-rose-50/90 to-white",
      hover: "hover:border-rose-300 hover:bg-rose-50 hover:shadow-md",
      emojiTone: "text-rose-500",
    },
    {
      move: "block",
      emoji: "🛡️",
      surface: "border-emerald-200/90 bg-gradient-to-br from-sage-50/90 to-white",
      hover: "hover:border-emerald-300 hover:bg-emerald-50/80 hover:shadow-md",
      emojiTone: "text-emerald-600",
    },
    {
      move: "parry",
      emoji: "✨",
      surface: "border-lavender-200/90 bg-gradient-to-br from-lavender-50/90 to-white",
      hover: "hover:border-violet-300 hover:bg-lavender-50 hover:shadow-md",
      emojiTone: "text-violet-600",
    },
  ];

  if (!opponent) {
    return (
      <div className={cn(fbPageWrap, "min-h-[calc(100dvh-6rem)]")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/achievements"
            className="inline-flex items-center gap-2 rounded-full border border-warm-200 bg-white/90 px-3 py-2 text-xs font-bold text-warm-800 shadow-cozy transition hover:border-rose-300 hover:bg-rose-50 sm:px-4 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-warm-600" aria-hidden />
            {t.backAchievements}
          </Link>
          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">
            {t.eyebrow}
          </span>
        </div>
        <h1 className="mt-6 text-center font-display text-[clamp(2rem,5.5vw,3.25rem)] font-black leading-[0.98] tracking-tight text-transparent sm:text-left">
          <span className="bg-gradient-to-br from-rose-600 via-warm-800 to-violet-700 bg-clip-text">
            {t.emptyTitle}
          </span>
        </h1>
        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
          <div className="lg:col-span-5">
            <FbSectionHeading>{t.sectionHowItWorks}</FbSectionHeading>
            <div className="rounded-[1.75rem] border border-warm-100 bg-white/85 p-5 shadow-cozy sm:p-6">
              <p className="text-sm leading-relaxed text-warm-700">{t.emptyBody}</p>
            </div>
          </div>
          <div className="hidden lg:col-span-7 lg:flex lg:min-h-[14rem] lg:items-center lg:justify-center">
            <div className="relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
              <div
                className="absolute inset-0 rounded-full border-4 border-dashed border-rose-200/70 opacity-80"
                aria-hidden
              />
              <div
                className="absolute inset-4 rounded-full border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-lavender-50 shadow-cozy"
                aria-hidden
              />
              <Swords className="relative z-[1] h-24 w-24 text-rose-400 animate-float" aria-hidden />
            </div>
          </div>
        </div>
        <div className="mt-12 flex justify-center sm:justify-start">
          <Link
            href="/achievements"
            className="inline-flex min-w-[12rem] items-center justify-center rounded-full bg-gradient-to-b from-rose-400 to-rose-600 px-8 py-3 text-sm font-black text-white shadow-cozy transition hover:brightness-105 active:translate-y-px"
          >
            {t.backAchievements}
          </Link>
        </div>
      </div>
    );
  }

  const stageShell =
    "relative h-[200px] w-full overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-b from-cream-50 via-white to-lavender-50/50 shadow-cozy ring-1 ring-rose-100/70 sm:h-[240px]";

  return (
    <div className={cn(fbPageWrap, "min-h-[calc(100dvh-6rem)]")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/achievements"
          className="inline-flex items-center gap-2 rounded-full border border-warm-200 bg-white/90 px-3 py-2 text-xs font-bold text-warm-800 shadow-cozy transition hover:border-rose-300 hover:bg-rose-50 sm:px-4 sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-warm-600" aria-hidden />
          {t.backAchievements}
        </Link>
        <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">
          {t.eyebrow}
        </span>
      </div>

      <h1 className="mt-5 text-center font-display text-[clamp(2.1rem,5.8vw,3.5rem)] font-black leading-[0.98] tracking-tight text-transparent sm:text-left">
        <span className="bg-gradient-to-br from-rose-600 via-warm-800 to-violet-700 bg-clip-text">{t.title}</span>
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
        <div className="lg:col-span-5">
          <FbSectionHeading>{t.sectionHowItWorks}</FbSectionHeading>
          <div className="rounded-[1.75rem] border border-warm-100 bg-white/85 p-5 shadow-cozy sm:p-6">
            <p className="text-sm leading-relaxed text-warm-700">{t.subtitle}</p>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">
              {t.sectionRules}
            </p>
            <p className="mt-2 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-center text-[11px] font-bold leading-snug text-amber-950/90 sm:text-xs">
              {t.rulesLine}
            </p>
          </div>
        </div>
        <div className="hidden lg:col-span-7 lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-5">
          <div className="flex flex-wrap justify-center gap-3">
            {MOVE_PREVIEW_ORDER.map((move) => (
              <div
                key={move}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-warm-200 bg-white/90 text-2xl shadow-cozy sm:h-16 sm:w-16 sm:text-3xl"
              >
                {MOVE_EMOJI[move]}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-warm-200 bg-cream-50/90 px-5 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-warm-600 shadow-cozy">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" aria-hidden />
            {t.arenaVersus}
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lavender-400" aria-hidden />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2 lg:hidden">
        {MOVE_PREVIEW_ORDER.map((move) => (
          <div
            key={move}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-warm-200 bg-white/90 text-lg shadow-cozy"
          >
            {MOVE_EMOJI[move]}
          </div>
        ))}
      </div>

        <div className="mt-10 sm:mt-12">
          <FbSectionHeading>{t.sectionRing}</FbSectionHeading>
          <div
            className={cn(
              "relative overflow-hidden rounded-[2rem] border-2 border-rose-200/90 bg-white/90 shadow-cozy-lg",
              drawClash && "ring-2 ring-lime-400 ring-offset-4 ring-offset-cream-50"
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(251,113,133,0.14),transparent_58%),radial-gradient(ellipse_65%_45%_at_100%_100%,rgba(167,139,250,0.12),transparent_52%),radial-gradient(ellipse_50%_40%_at_0%_100%,rgba(254,215,170,0.1),transparent_48%)]"
              aria-hidden
            />
            <div className={cn("relative z-10", drawClash && "animate-fb-draw-clash")}>
              <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_auto_1fr] md:items-stretch md:gap-0">
                <div className="flex flex-col gap-1.5 px-2 pb-2 pt-2 sm:px-3 sm:pb-3 sm:pt-3 md:border-r md:border-warm-100 md:pr-3">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/90 px-2 py-1 shadow-cozy sm:px-2.5 sm:py-1.5">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="shrink-0 rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[8px] font-bold uppercase leading-none tracking-wide text-rose-700 sm:text-[9px]">
                    {t.youLabel}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-left font-display text-[11px] font-bold leading-tight text-warm-900 sm:text-xs">
                    «{playerFamilyName || "—"}»
                  </p>
                  <LivesRow
                    lives={playerLives}
                    max={playerMaxLives}
                    bump={playerHeartBump}
                    compact
                  />
                </div>
                <p className="mt-0.5 truncate text-center text-[9px] leading-tight text-rose-800/90 sm:text-[10px]">
                  {t.chargeHint
                    .replace("{lives}", String(playerMaxLives))
                    .replace("{stage}", String(playerChargeStage))}
                </p>
              </div>
              <div className={cn("relative", stageShell)}>
                <div
                  className={cn(
                    "relative z-0 h-full w-full",
                    hitTarget === "player" && "animate-fb-hit-shake"
                  )}
                >
                  <NibbyAssistantStage
                    key={`pl-${initialBattleId ?? ""}`}
                    familyId={playerFamilyId}
                    driveRef={playerDriveRef}
                    chargeStage={playerChargeStage}
                    battleOutcome={
                      gameOver === "won" ? "won" : gameOver === "lost" ? "lost" : null
                    }
                  />
                </div>
                {hitTarget === "player" ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-rose-400/30 animate-fb-hit-flash"
                    aria-hidden
                  />
                ) : null}
                {playerBurst ? (
                  <MoveBurstOverlay key={`p-${burstLayer}-${playerBurst}`} move={playerBurst} side="player" />
                ) : null}
              </div>
            </div>

            <div className="relative flex min-h-[2rem] items-center justify-center bg-gradient-to-r from-rose-50/90 via-white to-lavender-50/90 py-1 md:min-h-0 md:bg-gradient-to-b md:from-rose-50/80 md:via-white md:to-lavender-50/80 md:px-1.5 md:py-4">
              <span
                className="rounded-full border-2 border-rose-200 bg-gradient-to-b from-rose-400 to-peach-500 px-3 py-1 font-display text-[10px] font-black tracking-[0.22em] text-white shadow-cozy sm:px-4 sm:text-xs md:px-2 md:py-8 md:text-sm md:leading-none md:[writing-mode:vertical-rl] md:tracking-[0.18em]"
                aria-hidden
              >
                {t.arenaVersus}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 px-2 pb-2 pt-2 sm:px-3 sm:pb-3 sm:pt-3 md:pl-3">
              <div className="rounded-2xl border border-lavender-200 bg-lavender-50/90 px-2 py-1 shadow-cozy sm:px-2.5 sm:py-1.5">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="shrink-0 rounded-full border border-lavender-200 bg-white px-2 py-0.5 text-[8px] font-bold uppercase leading-none tracking-wide text-violet-700 sm:text-[9px]">
                    {t.opponentLabel}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-left font-display text-[11px] font-bold leading-tight text-warm-900 sm:text-xs">
                    «{opponent.name}»
                  </p>
                  <LivesRow
                    lives={opponentLives}
                    max={opponentMaxLives}
                    bump={opponentHeartBump}
                    compact
                  />
                </div>
                <p className="mt-0.5 truncate text-center text-[9px] leading-tight text-violet-800/90 sm:text-[10px]">
                  {t.chargeHint
                    .replace("{lives}", String(opponentMaxLives))
                    .replace("{stage}", String(opponentChargeStage))}
                </p>
              </div>
              <div className={cn("relative", stageShell)}>
                <div
                  className={cn(
                    "relative z-0 h-full w-full",
                    hitTarget === "opponent" && "animate-fb-hit-shake"
                  )}
                >
                  <NibbyAssistantStage
                    key={`op-${opponent.id}-${initialBattleId ?? ""}`}
                    familyId={opponent.id}
                    driveRef={opponentDriveRef}
                    chargeStage={opponentChargeStage}
                    battleOutcome={
                      gameOver === "won" ? "lost" : gameOver === "lost" ? "won" : null
                    }
                  />
                </div>
                {hitTarget === "opponent" ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-rose-400/30 animate-fb-hit-flash"
                    aria-hidden
                  />
                ) : null}
                {opponentBurst ? (
                  <MoveBurstOverlay
                    key={`o-${burstLayer}-${opponentBurst}`}
                    move={opponentBurst}
                    side="opponent"
                  />
                ) : null}
              </div>
            </div>
          </div>

            <div className="border-t border-warm-200/70 bg-gradient-to-b from-white/80 via-cream-50/25 to-lavender-50/15 px-3 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
            {gameOver ? (
              <div className="text-center" role="status">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-500 shadow-cozy">
                  <Swords className="h-7 w-7" aria-hidden />
                </div>
                <h2 className="font-display text-xl font-extrabold text-warm-900 sm:text-2xl">
                  {gameOver === "won" ? t.wonTitle : t.lostTitle}
                </h2>
                <p className="mt-1 text-xs text-warm-600 sm:text-sm">
                  {gameOver === "won" ? t.wonSubtitle : t.lostSubtitle}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => void resetMatch()}
                    className="rounded-full bg-gradient-to-b from-rose-400 to-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-cozy transition hover:brightness-105 active:translate-y-px sm:px-7 sm:text-sm"
                  >
                    {t.playAgain}
                  </button>
                  <Link
                    href="/achievements/family-battle"
                    className="inline-flex items-center rounded-full border border-warm-200 bg-white px-5 py-2.5 text-xs font-bold text-warm-800 shadow-cozy transition hover:border-lavender-300 hover:bg-lavender-50 sm:text-sm"
                  >
                    {t.newOpponent}
                  </Link>
                </div>
              </div>
            ) : (
              <div aria-busy={busy || !battleId}>
                <div className="mb-4 flex min-h-[6rem] w-full flex-col items-center justify-center text-center sm:min-h-[5.5rem]">
                  {roundMessage ? (
                    <p className="mx-auto w-full max-w-xl rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-xs font-medium leading-snug text-amber-950 transition-opacity duration-200 sm:text-sm">
                      {roundMessage}
                    </p>
                  ) : busy ? (
                    <div className="flex h-10 items-center justify-center gap-1 text-lg leading-none text-rose-300/85" aria-hidden>
                      <span className="animate-pulse">·</span>
                      <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>
                        ·
                      </span>
                      <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>
                        ·
                      </span>
                    </div>
                  ) : (
                    <p className="font-display text-sm font-semibold text-warm-800 sm:text-base">{t.chooseMove}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-3 min-[420px]:gap-3">
                  {moveButtons.map(({ move, emoji, surface, hover, emojiTone }) => (
                    <button
                      key={move}
                      type="button"
                      disabled={busy || !battleId}
                      onClick={() => void runRound(move)}
                      className={cn(
                        "group flex min-h-[4.5rem] flex-row items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition sm:min-h-0 sm:flex-col sm:items-center sm:gap-2 sm:rounded-3xl sm:px-4 sm:py-5 sm:text-center",
                        surface,
                        hover,
                        "shadow-cozy active:scale-[0.98]",
                        (busy || !battleId) && "pointer-events-none opacity-45"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/90 text-2xl shadow-sm sm:h-12 sm:w-12 sm:text-3xl",
                          emojiTone
                        )}
                        aria-hidden
                      >
                        {emoji}
                      </span>
                      <span className="min-w-0 flex-1 font-display text-sm font-bold leading-tight text-warm-900 sm:flex-none sm:text-sm">
                        {t.moves[move]}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Link
                    href="/achievements/family-battle"
                    className={cn(
                      "text-sm font-semibold text-violet-700 underline decoration-lavender-300 decoration-2 underline-offset-4 transition hover:text-violet-900 hover:decoration-violet-400",
                      (busy || !battleId) && "pointer-events-none opacity-45"
                    )}
                  >
                    {t.newOpponent}
                  </Link>
                </div>
              </div>
            )}
            </div>
            </div>
          </div>
        </div>
    </div>
  );
}
