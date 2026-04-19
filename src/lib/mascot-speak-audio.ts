import { Animalese } from "animalese-web";
import type { SpeechHandle } from "animalese-web";
import { seedToVoiceUnits } from "@/lib/mascot-dna";

const WAV_URL = "/audio/animalese.wav";
const FADE_OUT_SEC = 0.32;
const FADE_TIMER_PAD_MS = 55;

const LETTER_DURATION_FIXED = 0.068;
const MIN_SPEAK_SECONDS = 2;

const CV_SYLLS = [
  "BA",
  "MA",
  "PA",
  "DA",
  "TA",
  "NA",
  "LA",
  "GA",
  "KA",
  "HA",
  "WA",
  "BO",
  "MO",
  "NO",
  "GO",
  "DO",
  "TO",
  "BE",
  "ME",
  "NE",
  "TE",
  "DE",
  "KE",
  "BI",
  "MI",
  "NI",
  "LI",
  "DI",
  "BU",
  "MU",
  "NU",
  "LU",
  "DU",
  "TU",
  "RU",
  "YO",
  "YA",
  "YE",
] as const;

const NIBBY_CORE = "NIBBY";

function pickCvSyl(): string {
  return CV_SYLLS[Math.floor(Math.random() * CV_SYLLS.length)]!;
}

function buildSideLetters(minLetters: number): string {
  let out = "";
  while (out.length < minLetters) {
    out += pickCvSyl();
  }
  return out;
}

function randomBabbleForChunk(delta: string): string {
  const n = delta.length;
  if (n === 0) return "";
  const spare = Math.max(4, Math.min(20, Math.ceil(n / 2)));
  const leftN = Math.max(2, Math.floor(spare / 2));
  const rightN = Math.max(2, Math.ceil(spare / 2));
  return `${buildSideLetters(leftN)}${NIBBY_CORE}${buildSideLetters(rightN)}`;
}

type SessionVoice = {
  basePitch: number;
  pitchRange: number;
  letterDuration: number;
  volume: number;
  shortenWords: boolean;
};

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let engine: Animalese | null = null;
let loadPromise: Promise<boolean> | null = null;
const queue: string[] = [];
let draining = false;
let stopped = true;
let sessionVoice: SessionVoice | null = null;
let activeHandle: SpeechHandle | null = null;
let fadeOutTimer: ReturnType<typeof setTimeout> | null = null;
let audioGraphPrimed = false;
let sessionScheduledLetters = 0;
let speakCoalesceBuffer = "";
let speakCoalesceTimer: ReturnType<typeof setTimeout> | null = null;
const SPEAK_COALESCE_MS = 180;
const SPEAK_COALESCE_MAX_CHARS = 88;

function clearSpeakCoalesceTimer(): void {
  if (speakCoalesceTimer !== null) {
    clearTimeout(speakCoalesceTimer);
    speakCoalesceTimer = null;
  }
}

function enqueueBabbleForDelta(delta: string): void {
  if (stopped || !delta) return;
  const babble = randomBabbleForChunk(delta);
  if (!babble) return;
  sessionScheduledLetters += countSpokenLetters(babble);
  queue.push(babble);
  void drainQueue();
}

function flushSpeakCoalesceBuffer(): void {
  if (!speakCoalesceBuffer) return;
  const buf = speakCoalesceBuffer;
  speakCoalesceBuffer = "";
  enqueueBabbleForDelta(buf);
}

function scheduleSpeakCoalesceFlush(): void {
  clearSpeakCoalesceTimer();
  speakCoalesceTimer = setTimeout(() => {
    speakCoalesceTimer = null;
    flushSpeakCoalesceBuffer();
  }, SPEAK_COALESCE_MS);
}

function countSpokenLetters(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i += 1) {
    if (/[A-Za-z]/.test(s[i]!)) n += 1;
  }
  return n;
}

async function waitUntilQueueIdle(maxMs = 60000): Promise<void> {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (stopped) return;
    if (queue.length === 0 && !draining && activeHandle === null) return;
    await new Promise<void>((r) => setTimeout(r, 32));
  }
}

async function settleAudioGraphAfterRunning(): Promise<void> {
  if (audioGraphPrimed) return;
  const ctx = audioCtx;
  if (!ctx || ctx.state !== "running") return;
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  audioGraphPrimed = true;
}

function voiceFromSeed(seed: string): SessionVoice {
  const [u0, u1, , u3] = seedToVoiceUnits(seed);
  const center = 0.66;
  const octSpread = 1.12;
  const rawPitch = center * 2 ** ((u0 - 0.5) * octSpread);
  const basePitch = Math.min(1.56, Math.max(0.36, rawPitch));
  return {
    basePitch,
    pitchRange: 0.035 + u1 * 0.5,
    letterDuration: LETTER_DURATION_FIXED,
    volume: 0.42 + u3 * 0.52,
    shortenWords: false,
  };
}

function hardResetOutput(): void {
  if (fadeOutTimer !== null) {
    clearTimeout(fadeOutTimer);
    fadeOutTimer = null;
  }
  activeHandle?.stop();
  activeHandle = null;
  const ctx = audioCtx;
  const mg = masterGain;
  if (mg && ctx && ctx.state !== "closed") {
    mg.gain.cancelScheduledValues(ctx.currentTime);
    mg.gain.value = 1;
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(audioCtx.destination);
      engine = new Animalese(audioCtx, { volume: 1, destination: masterGain });
    }
    return audioCtx;
  } catch {
    return null;
  }
}

async function ensureLoaded(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx || !engine) return false;
  if (engine.isLoaded) return true;
  if (!loadPromise) {
    loadPromise = (async () => {
      const res = await fetch(WAV_URL);
      if (!res.ok) return false;
      await engine!.load(res);
      return engine!.isLoaded;
    })().finally(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

async function drainQueue() {
  if (draining) return;
  const eng = engine;
  const voice = sessionVoice;
  if (!eng || !voice || stopped) return;
  draining = true;
  try {
    while (!stopped && queue.length > 0) {
      const part = queue.shift()!;
      if (!/[A-Za-z]/.test(part)) continue;
      const h = eng.speak(part, {
        basePitch: voice.basePitch,
        pitchRange: voice.pitchRange,
        letterDuration: voice.letterDuration,
        volume: voice.volume,
        shortenWords: voice.shortenWords,
      });
      activeHandle = h;
      await h.finished.catch(() => {});
      if (activeHandle === h) activeHandle = null;
    }
  } finally {
    draining = false;
    if (!stopped && queue.length > 0) void drainQueue();
  }
}

export async function startMascotSpeakAudio(voiceSeed: string): Promise<void> {
  stopped = true;
  clearSpeakCoalesceTimer();
  speakCoalesceBuffer = "";
  queue.length = 0;
  sessionScheduledLetters = 0;
  sessionVoice = null;
  hardResetOutput();
  stopped = false;
  sessionVoice = voiceFromSeed(voiceSeed);
  const ok = await ensureLoaded();
  if (!ok || stopped) {
    stopped = true;
    sessionVoice = null;
    return;
  }
  const ctx = audioCtx;
  if (ctx && ctx.state === "suspended") {
    await ctx.resume().catch(() => {});
  }
  await settleAudioGraphAfterRunning();
}

export async function warmupMascotSpeakAudio(): Promise<void> {
  await ensureLoaded();
}

export function pushMascotSpeakDelta(delta: string): void {
  if (stopped || !delta) return;
  speakCoalesceBuffer += delta;
  if (speakCoalesceBuffer.length >= SPEAK_COALESCE_MAX_CHARS) {
    clearSpeakCoalesceTimer();
    flushSpeakCoalesceBuffer();
    return;
  }
  scheduleSpeakCoalesceFlush();
}

export function flushMascotSpeakCoalesced(): void {
  clearSpeakCoalesceTimer();
  flushSpeakCoalesceBuffer();
}

const TAP_VOICE_DELTAS = ["hi", "boop", "hey", "yay", "hm"] as const;

export async function playMascotBlobTapVoice(voiceSeed: string): Promise<void> {
  await warmupMascotSpeakAudio();
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});
  await settleAudioGraphAfterRunning();
  if (stopped || !sessionVoice) {
    await startMascotSpeakAudio(voiceSeed);
  }
  const d = TAP_VOICE_DELTAS[Math.floor(Math.random() * TAP_VOICE_DELTAS.length)]!;
  pushMascotSpeakDelta(d);
  flushMascotSpeakCoalesced();
}

export async function awaitMascotSpeakMinDuration(seconds = MIN_SPEAK_SECONDS): Promise<void> {
  const voice = sessionVoice;
  if (stopped || !voice) return;
  const minLetters = Math.max(10, Math.ceil(seconds / voice.letterDuration));
  if (sessionScheduledLetters >= minLetters) return;
  const need = minLetters - sessionScheduledLetters;
  const left = Math.max(4, Math.ceil(need / 2));
  const right = Math.max(4, need - left + 4);
  const filler = `${buildSideLetters(left)}${NIBBY_CORE}${buildSideLetters(right)}`;
  sessionScheduledLetters += countSpokenLetters(filler);
  queue.push(filler);
  void drainQueue();
  await waitUntilQueueIdle(Math.ceil(seconds * 1000) + 8000);
}

export function stopMascotSpeakAudio(): void {
  stopped = true;
  clearSpeakCoalesceTimer();
  speakCoalesceBuffer = "";
  queue.length = 0;
  sessionVoice = null;
  const ctx = audioCtx;
  const mg = masterGain;
  if (!activeHandle || !mg || !ctx || ctx.state === "closed") {
    hardResetOutput();
    return;
  }
  if (fadeOutTimer !== null) {
    clearTimeout(fadeOutTimer);
    fadeOutTimer = null;
  }
  const now = ctx.currentTime;
  mg.gain.cancelScheduledValues(now);
  mg.gain.setValueAtTime(mg.gain.value, now);
  mg.gain.linearRampToValueAtTime(0.0001, now + FADE_OUT_SEC);
  fadeOutTimer = setTimeout(() => {
    fadeOutTimer = null;
    activeHandle?.stop();
    activeHandle = null;
    const c = audioCtx;
    const m = masterGain;
    if (m && c && c.state !== "closed") {
      m.gain.cancelScheduledValues(c.currentTime);
      m.gain.value = 1;
    }
  }, FADE_OUT_SEC * 1000 + FADE_TIMER_PAD_MS);
}
