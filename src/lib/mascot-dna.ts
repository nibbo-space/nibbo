export interface MascotDNA {
  beanXZ: number;
  beanY: number;
  beanZD: number;
  surfaceNoiseAmp: number;
  surfaceNoiseFreq: number;
  surfaceNoisePersistence: number;
  surfaceNoiseLacunarity: number;
  surfaceNoiseEulerX: number;
  surfaceNoiseEulerY: number;
  surfaceNoiseEulerZ: number;
  puddleStrength: number;
  klyaksaSpread: number;
  klyaksaFlat: number;
  iridescenceIOR: number;
  iridescenceThicknessMin: number;
  iridescenceThicknessMax: number;
  footRadius: number;
  footSpread: number;
  footZ: number;
  sideNub: number;
  eyeSize: number;
  eyeGap: number;
  eyeY: number;
  eyeLift: number;
  eyeLeftX: number;
  eyeRightX: number;
  eyeLeftY: number;
  eyeRightY: number;
  eyeScaleL: number;
  eyeScaleR: number;
  eyeOvalL: number;
  eyeOvalR: number;
  eyeSquashZ: number;
  eyeRotX: number;
  eyeTiltAsym: number;
  eyeZPuff: number;
  eyeTilt: number;
  eyeOvalY: number;
  eyeIrisHue: number;
  eyeIrisSat: number;
  eyeIrisLight: number;
  eyeIrisHueShiftL: number;
  eyeIrisHueShiftR: number;
  mouthWidth: number;
  mouthDrop: number;
  mouthLift: number;
  mouthZPuff: number;
  mouthRotZ: number;
  mouthTube: number;
  mouthSmileArc: number;
  mouthNeutralH: number;
  mouthNeutralD: number;
  mouthHue: number;
  mouthSat: number;
  mouthLight: number;
  mouthForward: number;
  hueBody: number;
  hueRim: number;
  satBody: number;
  lightBody: number;
  bobSpeed: number;
  bobAmp: number;
  swayAmp: number;
  blinkOffset: number;
}

function hashString(value: string) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < value.length; i += 1) {
    const k = value.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

export function createSeededRandom(seedText: string) {
  const seed = hashString(seedText);
  let a = seed[0];
  let b = seed[1];
  let c = seed[2];
  let d = seed[3];
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const res = (t + d) | 0;
    c = (c + res) | 0;
    return (res >>> 0) / 4294967296;
  };
}

export function seedToVoiceUnits(familyId: string): readonly [number, number, number, number] {
  const raw = familyId.trim().toLowerCase().replace(/-/g, "");
  const s = raw.length > 0 ? raw : "nibbo";
  let fold = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    fold ^= s.charCodeAt(i);
    fold = Math.imul(fold, 16777619);
  }
  const f = fold >>> 0;
  const p = hashString(`animalese|1|${s}\u{202f}${f}`);
  const q = hashString(`animalese|2|\u{202f}${f}|${s}`);
  const r = hashString(`${s}\u{00b7}animalese|3|\u{00b7}${f}`);
  const mix = (a: number, b: number, c: number) => ((a ^ b ^ c) >>> 0) / 4294967296;
  return [mix(p[0], q[2], r[1]), mix(p[1], q[0], r[3]), mix(p[2], q[3], r[0]), mix(p[3], q[1], r[2])];
}

function range(rng: () => number, min: number, max: number) {
  return min + (max - min) * rng();
}

export function mascotBoundingRadius(dna: MascotDNA): number {
  const xzBoost = 1 + dna.klyaksaSpread * dna.puddleStrength * 0.38;
  const xz = Math.max(dna.beanXZ, dna.beanZD) * xzBoost;
  const base = 0.72 * Math.max(xz, dna.beanY);
  return base + dna.surfaceNoiseAmp * 0.95 + dna.footRadius;
}

export function createMascotDNA(familyId: string): MascotDNA {
  const rng = createSeededRandom(familyId || "nibbo");
  const hueBody = range(rng, 0, 1);
  const hueRim = (hueBody + range(rng, 0.05, 0.55) + 1) % 1;
  return {
    beanXZ: range(rng, 0.88, 1.3),
    beanY: range(rng, 0.74, 1.2),
    beanZD: range(rng, 0.86, 1.18),
    surfaceNoiseAmp: range(rng, 0.022, 0.045),
    surfaceNoiseFreq: range(rng, 0.36, 0.78),
    surfaceNoisePersistence: range(rng, 0.56, 0.72),
    surfaceNoiseLacunarity: range(rng, 1.96, 2.08),
    surfaceNoiseEulerX: range(rng, 0, Math.PI * 2),
    surfaceNoiseEulerY: range(rng, 0, Math.PI * 2),
    surfaceNoiseEulerZ: range(rng, 0, Math.PI * 2),
    puddleStrength: range(rng, 0, 1),
    klyaksaSpread: range(rng, 0.06, 0.48),
    klyaksaFlat: range(rng, 0.04, 0.34),
    iridescenceIOR: range(rng, 1.06, 1.28),
    iridescenceThicknessMin: range(rng, 90, 160),
    iridescenceThicknessMax: range(rng, 280, 420),
    footRadius: range(rng, 0.095, 0.148),
    footSpread: range(rng, 0.24, 0.34),
    footZ: range(rng, 0.04, 0.12),
    sideNub: range(rng, 0, 0.32),
    eyeSize: range(rng, 0.088, 0.158),
    eyeGap: range(rng, 0.18, 0.36),
    eyeY: range(rng, 0.18, 0.38),
    eyeLift: range(rng, -0.032, 0.042),
    eyeLeftX: range(rng, -0.028, 0.028),
    eyeRightX: range(rng, -0.028, 0.028),
    eyeLeftY: range(rng, -0.026, 0.026),
    eyeRightY: range(rng, -0.026, 0.026),
    eyeScaleL: range(rng, 0.9, 1.1),
    eyeScaleR: range(rng, 0.9, 1.1),
    eyeOvalL: range(rng, 0.92, 1.1),
    eyeOvalR: range(rng, 0.92, 1.1),
    eyeSquashZ: range(rng, 0.7, 0.92),
    eyeRotX: range(rng, -0.12, 0.13),
    eyeTiltAsym: range(rng, -0.09, 0.09),
    eyeZPuff: range(rng, -0.038, 0.048),
    eyeTilt: range(rng, 0.08, 0.28),
    eyeOvalY: range(rng, 1.18, 1.68),
    eyeIrisHue: range(rng, 0, 1),
    eyeIrisSat: range(rng, 0.56, 0.94),
    eyeIrisLight: range(rng, 0.22, 0.42),
    eyeIrisHueShiftL: range(rng, -0.11, 0.11),
    eyeIrisHueShiftR: range(rng, -0.11, 0.11),
    mouthWidth: range(rng, 0.048, 0.11),
    mouthDrop: range(rng, 0.12, 0.24),
    mouthLift: range(rng, -0.05, 0.025),
    mouthZPuff: range(rng, -0.018, 0.065),
    mouthRotZ: range(rng, -0.16, 0.16),
    mouthTube: range(rng, 0.0082, 0.014),
    mouthSmileArc: range(rng, 0.82, 1.18),
    mouthNeutralH: range(rng, 0.02, 0.036),
    mouthNeutralD: range(rng, 0.014, 0.028),
    mouthHue: range(rng, 0, 1),
    mouthSat: range(rng, 0.58, 0.92),
    mouthLight: range(rng, 0.36, 0.54),
    mouthForward: range(rng, 0.048, 0.12),
    hueBody,
    hueRim,
    satBody: range(rng, 0.48, 0.98),
    lightBody: range(rng, 0.3, 0.72),
    bobSpeed: range(rng, 0.85, 1.45),
    bobAmp: range(rng, 0.032, 0.075),
    swayAmp: range(rng, 0.028, 0.075),
    blinkOffset: range(rng, 0, Math.PI * 2),
  };
}
