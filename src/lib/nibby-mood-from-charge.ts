import type { NibbyChargeStage } from "@/lib/nibby-charge";

export type NibbyBuddyMoodFace = "happy" | "smile" | "neutral" | "sleepy";

export type NibbyBuddyMoodVisual = {
  face: NibbyBuddyMoodFace;
  body: string;
  glow: string;
  ear: string;
  speed: number;
  distort: number;
  canvasFrom: string;
  canvasTo: string;
  bobAmp: number;
};

export function nibbyBuddyMoodFromChargeStage(stage: NibbyChargeStage): NibbyBuddyMoodVisual {
  if (stage === 4) {
    return {
      face: "happy",
      body: "#7c3aed",
      glow: "#a78bfa",
      ear: "#ec4899",
      speed: 1.8,
      distort: 0.25,
      canvasFrom: "#ede9fe",
      canvasTo: "#ddd6fe",
      bobAmp: 0.07,
    };
  }
  if (stage === 3) {
    return {
      face: "smile",
      body: "#0ea5e9",
      glow: "#38bdf8",
      ear: "#22c55e",
      speed: 1.35,
      distort: 0.19,
      canvasFrom: "#ecfeff",
      canvasTo: "#cffafe",
      bobAmp: 0.062,
    };
  }
  if (stage === 2) {
    return {
      face: "neutral",
      body: "#fb923c",
      glow: "#fda4af",
      ear: "#f43f5e",
      speed: 1.1,
      distort: 0.14,
      canvasFrom: "#fff7ed",
      canvasTo: "#ffe4e6",
      bobAmp: 0.054,
    };
  }
  return {
    face: "sleepy",
    body: "#94a3b8",
    glow: "#cbd5e1",
    ear: "#64748b",
    speed: 0.85,
    distort: 0.08,
    canvasFrom: "#f8fafc",
    canvasTo: "#e2e8f0",
    bobAmp: 0.046,
  };
}
