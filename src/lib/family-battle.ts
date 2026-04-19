export type BattleMove = "strike" | "block" | "parry";

export const BATTLE_MOVES: BattleMove[] = ["strike", "block", "parry"];

export type RoundOutcome = "player_wins" | "opponent_wins" | "draw";

export function beats(a: BattleMove, b: BattleMove): boolean {
  if (a === b) return false;
  if (a === "strike" && b === "parry") return true;
  if (a === "parry" && b === "block") return true;
  if (a === "block" && b === "strike") return true;
  return false;
}

export function resolveRound(player: BattleMove, opponent: BattleMove): RoundOutcome {
  if (player === opponent) return "draw";
  if (beats(player, opponent)) return "player_wins";
  return "opponent_wins";
}

export function randomBattleMove(): BattleMove {
  const i = Math.floor(Math.random() * 3);
  return BATTLE_MOVES[i]!;
}

export function pickRandomElement<T>(items: readonly T[]): T | null {
  if (items.length === 0) return null;
  const buf = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
    return items[buf[0]! % items.length]!;
  }
  return items[Math.floor(Math.random() * items.length)]!;
}
