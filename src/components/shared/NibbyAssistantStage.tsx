"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useCozyConfig } from "@/hooks/useCozyConfig";
import { createMascotDNA, mascotBoundingRadius } from "@/lib/mascot-dna";
import {
  nibbyBuddyMoodFromChargeStage,
  type NibbyBuddyMoodVisual,
} from "@/lib/nibby-mood-from-charge";
import type { NibbyChargeStage } from "@/lib/nibby-charge";
import { reportMascotBlobTap } from "@/lib/mascot-blob-tap-client";
import { playMascotBlobTapVoice } from "@/lib/mascot-speak-audio";
import { buildProceduralMascot } from "@/lib/procedural-mascot-three";

export type NibbyChatDrive = {
  speaking: boolean;
  lipPulse: number;
};

type MoodFace = "happy" | "smile" | "neutral" | "sleepy";

type BuddyMood = NibbyBuddyMoodVisual;

const BUDDY_MOOD: BuddyMood = {
  face: "smile",
  body: "#0ea5e9",
  glow: "#38bdf8",
  ear: "#22c55e",
  speed: 1.28,
  distort: 0.19,
  canvasFrom: "#ecfeff",
  canvasTo: "#cffafe",
  bobAmp: 0.06,
};

function mascotAnimProfile(face: MoodFace) {
  switch (face) {
    case "sleepy":
      return {
        bobFreqMul: 0.58,
        bobAmpMul: 0.38,
        swayMul: 0.25,
        yawMul: 0.32,
        pitchMul: 0.3,
        yBias: -0.1,
        sparkleSpin: 0.07,
        eyeOpen: 0.68,
        blinkRate: 1.55,
        breathMul: 0.55,
      };
    case "neutral":
      return {
        bobFreqMul: 0.72,
        bobAmpMul: 0.52,
        swayMul: 0.26,
        yawMul: 0.32,
        pitchMul: 0.34,
        yBias: -0.035,
        sparkleSpin: 0.09,
        eyeOpen: 0.97,
        blinkRate: 1.06,
        breathMul: 0.86,
      };
    case "smile":
      return {
        bobFreqMul: 1.22,
        bobAmpMul: 1.1,
        swayMul: 0.98,
        yawMul: 0.94,
        pitchMul: 0.86,
        yBias: 0.048,
        sparkleSpin: 0.46,
        eyeOpen: 1.08,
        blinkRate: 0.86,
        breathMul: 1.14,
      };
    case "happy":
      return {
        bobFreqMul: 1.72,
        bobAmpMul: 1.88,
        swayMul: 1.82,
        yawMul: 1.78,
        pitchMul: 1.65,
        yBias: 0.09,
        sparkleSpin: 1.25,
        eyeOpen: 1.12,
        blinkRate: 0.78,
        breathMul: 1.45,
      };
    default:
      return mascotAnimProfile("neutral");
  }
}

function buildDeadEyeCross(eyeSize: number): THREE.Group {
  const g = new THREE.Group();
  const col = new THREE.Color("#0c0a09");
  const mat1 = new THREE.MeshBasicMaterial({ color: col });
  const mat2 = new THREE.MeshBasicMaterial({ color: col });
  const w = eyeSize * 0.088;
  const h = eyeSize * 1.02;
  const geo1 = new THREE.BoxGeometry(w, h, w * 0.72);
  const geo2 = new THREE.BoxGeometry(w, h, w * 0.72);
  const b1 = new THREE.Mesh(geo1, mat1);
  const b2 = new THREE.Mesh(geo2, mat2);
  b1.rotation.z = Math.PI / 4;
  b2.rotation.z = -Math.PI / 4;
  const zf = eyeSize * 0.9;
  b1.position.z = zf;
  b2.position.z = zf;
  g.add(b1, b2);
  return g;
}

function nibbyAssistantCanvasBg(
  chargeStage: NibbyChargeStage | undefined,
  battleOutcome: "won" | "lost" | null | undefined
) {
  if (chargeStage === undefined) {
    return { from: BUDDY_MOOD.canvasFrom, to: BUDDY_MOOD.canvasTo };
  }
  if (battleOutcome === "won") {
    const j = nibbyBuddyMoodFromChargeStage(4);
    return { from: j.canvasFrom, to: j.canvasTo };
  }
  const b = nibbyBuddyMoodFromChargeStage(chargeStage);
  return { from: b.canvasFrom, to: b.canvasTo };
}

export default function NibbyAssistantStage({
  familyId,
  driveRef,
  chargeStage,
  battleOutcome = null,
  reportBlobTaps = true,
}: {
  familyId: string;
  driveRef: React.MutableRefObject<NibbyChatDrive>;
  chargeStage?: NibbyChargeStage;
  battleOutcome?: "won" | "lost" | null;
  reportBlobTaps?: boolean;
}) {
  const { config } = useCozyConfig();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mascotDna = useMemo(() => createMascotDNA(familyId), [familyId]);
  const chargeStageRef = useRef(chargeStage);
  const battleOutcomeRef = useRef<"won" | "lost" | null>(battleOutcome ?? null);
  const activityRef = useRef(0.48);
  const configRef = useRef(config);
  const tapLipTimerRef = useRef<number | null>(null);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    chargeStageRef.current = chargeStage;
  }, [chargeStage]);
  useEffect(() => {
    battleOutcomeRef.current = battleOutcome ?? null;
  }, [battleOutcome]);

  const canvasBg = useMemo(
    () => nibbyAssistantCanvasBg(chargeStage, battleOutcome ?? null),
    [chargeStage, battleOutcome]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.12, 3.85);
    camera.lookAt(0, 0.04, 0);

    const ambient = new THREE.AmbientLight(new THREE.Color("#fff7ed"), 0.72);
    const key = new THREE.DirectionalLight(new THREE.Color("#ffffff"), 1.4);
    key.position.set(2.4, 3.2, 3.2);
    const fill = new THREE.DirectionalLight(new THREE.Color(BUDDY_MOOD.glow), 0.9);
    fill.position.set(-2.4, 1.2, 1.8);
    const rim = new THREE.PointLight(new THREE.Color("#ffffff"), 0.65);
    rim.position.set(0, -1.5, -2.8);
    scene.add(ambient, key, fill, rim);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.035);
    scene.environment = envRT.texture;

    const mascot = buildProceduralMascot(mascotDna, familyId);
    const modelRoot = mascot.root;
    const modelBaseY = -0.02;
    const maxBody = Math.max(0.95, mascotBoundingRadius(mascotDna));
    const baseFit = 1.08 / maxBody;
    modelRoot.scale.setScalar(baseFit);
    modelRoot.position.y = modelBaseY;
    const mouthSmileZ0 = mascot.mouthSmile.position.z;
    scene.add(modelRoot);

    const deadEyeL = buildDeadEyeCross(mascotDna.eyeSize);
    const deadEyeR = buildDeadEyeCross(mascotDna.eyeSize);
    deadEyeL.visible = false;
    deadEyeR.visible = false;
    mascot.body.add(deadEyeL, deadEyeR);

    const resolveRuntimeMood = (): BuddyMood => {
      const st = chargeStageRef.current;
      if (st === undefined) return { ...BUDDY_MOOD };
      const o = battleOutcomeRef.current;
      if (o === "won") return { ...nibbyBuddyMoodFromChargeStage(4) };
      const base = { ...nibbyBuddyMoodFromChargeStage(st) };
      if (o === "lost") {
        return {
          ...base,
          face: "neutral",
          speed: Math.max(0.38, base.speed * 0.48),
          bobAmp: base.bobAmp * 0.44,
          distort: base.distort * 0.82,
        };
      }
      return base;
    };

    const sparklesCount = 64;
    const sparklePositions = new Float32Array(sparklesCount * 3);
    for (let i = 0; i < sparklesCount; i += 1) {
      const r = 1.8 + Math.random() * 1.2;
      const a = Math.random() * Math.PI * 2;
      const h = -0.7 + Math.random() * 2;
      sparklePositions[i * 3] = Math.cos(a) * r;
      sparklePositions[i * 3 + 1] = h;
      sparklePositions[i * 3 + 2] = Math.sin(a) * r;
    }
    const sparklesGeometry = new THREE.BufferGeometry();
    sparklesGeometry.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
    const sparklesMaterial = new THREE.PointsMaterial({
      size: 0.055 + activityRef.current * 0.07,
      color: new THREE.Color(BUDDY_MOOD.glow),
      transparent: true,
      opacity: 0.45 + configRef.current.intensity * 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparkles = new THREE.Points(sparklesGeometry, sparklesMaterial);
    scene.add(sparkles);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(2.3, 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color("#d4d4d8"), transparent: true, opacity: 0.28 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.22;
    scene.add(ground);

    const floorGlowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(BUDDY_MOOD.glow),
      transparent: true,
      opacity: 0.15,
    });
    const floorGlow = new THREE.Mesh(new THREE.RingGeometry(1.45, 2.15, 64), floorGlowMat);
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.y = -1.2;
    scene.add(floorGlow);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(container);

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const liquidRipple = { active: false, t0: 0, ox: 0, oy: 0, oz: 0 };

    const restoreBlobVertices = () => {
      const geo = mascot.blobMesh.geometry;
      const base = geo.userData.baseBlobPositions as Float32Array | undefined;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      if (!base) return;
      (pos.array as Float32Array).set(base);
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };

    const applyLiquidRipple = (timeMs: number) => {
      const geo = mascot.blobMesh.geometry;
      const base = geo.userData.baseBlobPositions as Float32Array | undefined;
      const baseN = geo.userData.baseBlobNormals as Float32Array | undefined;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      if (!base || !baseN) return;
      if (!liquidRipple.active) return;
      const tr = (timeMs - liquidRipple.t0) / 1000;
      const maxT = 2.15;
      if (tr >= maxT) {
        liquidRipple.active = false;
        restoreBlobVertices();
        return;
      }
      const { ox, oy, oz } = liquidRipple;
      const decay = Math.exp(-tr * 0.62);
      const amp = 0.056 * decay;
      const k = 16.5;
      const w = 23;
      const count = pos.count;
      for (let i = 0; i < count; i += 1) {
        const ix = i * 3;
        const bx = base[ix];
        const by = base[ix + 1];
        const bz = base[ix + 2];
        const nx0 = baseN[ix];
        const ny0 = baseN[ix + 1];
        const nz0 = baseN[ix + 2];
        const dx = bx - ox;
        const dy = by - oy;
        const dz = bz - oz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const spread = Math.exp(-dist * 2.75);
        const r1 = Math.sin(dist * k - tr * w) * spread;
        const r2 =
          Math.sin(dist * k * 1.48 - tr * (w * 1.08 + 1.4)) * Math.exp(-dist * 4.2) * 0.42;
        const disp = amp * (r1 + r2);
        pos.setXYZ(i, bx + nx0 * disp, by + ny0 * disp, bz + nz0 * disp);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;
      ndc.x = ((ev.clientX - rect.left) / w) * 2 - 1;
      ndc.y = -((ev.clientY - rect.top) / h) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(mascot.blobMesh, false);
      if (hits.length === 0) return;
      ev.preventDefault();
      const p = hits[0]!.point.clone();
      mascot.blobMesh.worldToLocal(p);
      liquidRipple.ox = p.x;
      liquidRipple.oy = p.y;
      liquidRipple.oz = p.z;
      liquidRipple.t0 = performance.now();
      liquidRipple.active = true;
      if (reportBlobTaps) reportMascotBlobTap();
      const wasSpeaking = driveRef.current.speaking;
      void playMascotBlobTapVoice(familyId).catch(() => {});
      if (!wasSpeaking) {
        if (tapLipTimerRef.current !== null) window.clearTimeout(tapLipTimerRef.current);
        driveRef.current.speaking = true;
        driveRef.current.lipPulse = 0.35 + Math.random() * 0.22;
        tapLipTimerRef.current = window.setTimeout(() => {
          tapLipTimerRef.current = null;
          driveRef.current.speaking = false;
          driveRef.current.lipPulse = 0;
        }, 780);
      }
    };
    canvas.style.cursor = "pointer";
    canvas.addEventListener("pointerdown", onPointerDown);

    let frameId = 0;
    const start = performance.now();
    let lipVis = 0;
    const animate = () => {
      const now = performance.now();
      applyLiquidRipple(now);
      const t = (now - start) / 1000;
      const m = resolveRuntimeMood();
      const cfg = configRef.current;
      const battleLost = battleOutcomeRef.current === "lost";
      const act = battleLost ? activityRef.current * 0.22 : activityRef.current;
      const ap = mascotAnimProfile(m.face as MoodFace);
      const s = m.speed * cfg.speed;
      const bob = mascotDna.bobSpeed * s * ap.bobFreqMul;
      const bobAmp = (m.bobAmp + mascotDna.bobAmp * 0.55) * ap.bobAmpMul;
      sparkles.rotation.y = t * ap.sparkleSpin;
      sparklesMaterial.color.set(m.glow);
      const speakingNow = driveRef.current.speaking;
      sparklesMaterial.size = 0.055 + act * 0.07 + (speakingNow ? 0.024 : 0);
      sparklesMaterial.opacity = 0.45 + cfg.intensity * 0.4 + (speakingNow ? 0.2 : 0);
      fill.color.set(m.glow);
      floorGlowMat.color.set(m.glow);
      const face = m.face as MoodFace;
      const isSmile = face === "smile";
      const isHappy = face === "happy";
      const isNeutral = face === "neutral";
      const { speaking, lipPulse } = driveRef.current;
      const lipTarget = Math.min(1, lipPulse + (speaking ? 0.4 : 0));
      lipVis += (lipTarget - lipVis) * 0.5;
      lipVis = Math.max(0, lipVis * 0.994);
      const lipBoost = Math.min(1, lipVis * 1.14);
      const lipForward = Math.min(1, lipBoost + (speaking ? 0.24 : 0));
      modelRoot.position.x = isHappy
        ? Math.sin(t * bob * 1.22 + 0.2) * 0.048 +
          Math.cos(t * bob * 1.95 + 0.6) * 0.028 +
          Math.sin(t * bob * 0.71) * 0.014
        : isSmile
          ? Math.sin(t * bob * 0.88 + 0.35) * 0.024 + Math.cos(t * bob * 1.55 + 0.2) * 0.011
          : isNeutral
            ? Math.sin(t * bob * 0.32 + 0.9) * 0.007
            : 0;
      modelRoot.position.y = modelBaseY + ap.yBias + Math.sin(t * bob) * bobAmp;
      modelRoot.rotation.z = Math.sin(t * bob * 0.75 + 0.15) * mascotDna.swayAmp * ap.swayMul;
      modelRoot.rotation.y =
        Math.sin(t * bob * 0.52) * 0.16 * ap.yawMul +
        (isHappy
          ? Math.sin(t * bob * 1.45 + 0.3) * 0.22
          : isSmile
            ? Math.sin(t * bob * 0.78 + 0.12) * 0.092
            : 0);
      modelRoot.rotation.x =
        (isHappy
          ? Math.sin(t * bob * 0.88 + 0.4) * 0.11 + Math.sin(t * bob * 1.55 + 1.1) * 0.055
          : isSmile
            ? Math.sin(t * bob * 0.72 + 0.45) * 0.048 + Math.sin(t * bob * 1.35 + 0.1) * 0.018
            : isNeutral
              ? Math.sin(t * bob * 0.36 + 0.25) * 0.014 - 0.018
              : 0) + (battleLost ? -0.07 : 0);
      const bc = mascot.bodyCore;
      const pitchRock =
        Math.sin(t * bob * 0.82) * 0.042 + Math.sin(t * 3.05 + 1.2) * 0.018;
      bc.rotation.x = pitchRock * ap.pitchMul * (isNeutral ? 0.36 : 1);
      if (isHappy) {
        bc.rotation.z =
          Math.sin(t * bob * 1.18 + 0.22) * 0.22 + Math.sin(t * bob * 2.05 + 0.9) * 0.08;
        bc.rotation.y = Math.sin(t * bob * 0.95 + 1.05) * 0.14;
      } else if (isSmile) {
        bc.rotation.z = Math.sin(t * bob * 0.88 + 0.28) * 0.078 + Math.sin(t * bob * 1.65 + 0.5) * 0.022;
        bc.rotation.y = Math.sin(t * bob * 0.62 + 0.75) * 0.048 + Math.cos(t * bob * 1.1) * 0.015;
      } else if (isNeutral) {
        bc.rotation.z = Math.sin(t * bob * 0.48 + 0.55) * 0.024;
        bc.rotation.y = Math.sin(t * bob * 0.36 + 1.05) * 0.016;
      } else {
        bc.rotation.z = 0;
        bc.rotation.y = 0;
      }
      const breath = 1 + Math.sin(t * 2.55) * 0.014 * ap.breathMul;
      if (isHappy) {
        const f1 = t * bob * 1.45;
        const f2 = t * bob * 0.92 + mascotDna.blinkOffset;
        const f3 = t * bob * 2.55;
        const sx =
          breath *
          (1 +
            Math.sin(f1) * 0.038 +
            Math.sin(f2 * 1.2) * 0.022 +
            Math.sin(f3) * 0.016 +
            Math.cos(t * bob * 1.72) * 0.012);
        const sy =
          breath *
          (1 +
            Math.sin(f2 + 1.05) * 0.048 +
            Math.sin(t * bob * 2.35) * 0.018 +
            Math.cos(f1 * 0.88) * 0.014);
        const sz =
          breath *
          (1 + Math.cos(f1 * 0.9 + 0.5) * 0.032 + Math.cos(f2 * 0.95) * 0.018 + Math.sin(f3 * 0.6) * 0.012);
        mascot.blobMesh.scale.set(sx, sy, sz);
      } else if (isSmile) {
        const w = Math.sin(t * bob * 0.95 + mascotDna.blinkOffset) * 0.5 + 0.5;
        const bump = 1 + w * 0.012 + Math.sin(t * bob * 1.55) * 0.008 + Math.sin(t * bob * 2.35) * 0.004;
        mascot.blobMesh.scale.setScalar(breath * bump);
      } else {
        const nudge = isNeutral ? 1 + Math.sin(t * bob * 0.55) * 0.0028 : 1;
        mascot.blobMesh.scale.setScalar(breath * nudge);
      }
      const blobMat = mascot.blobMesh.material;
      if (blobMat instanceof THREE.MeshPhysicalMaterial) {
        const irMul = isHappy ? 1.75 : isSmile ? 1.42 : isNeutral ? 0.82 : 1;
        const wt = t * 1.08 * irMul + mascotDna.blinkOffset * 0.4;
        const w = Math.sin(wt) * 0.5 + 0.5;
        blobMat.iridescenceThicknessRange = [
          mascotDna.iridescenceThicknessMin + w * (isHappy ? 48 : isSmile ? 38 : isNeutral ? 22 : 34),
          mascotDna.iridescenceThicknessMax + w * (isHappy ? 62 : isSmile ? 50 : isNeutral ? 28 : 46),
        ];
        blobMat.iridescenceIOR =
          mascotDna.iridescenceIOR +
          Math.sin(t * 0.74 * irMul + 0.2) * (isHappy ? 0.078 : isSmile ? 0.062 : isNeutral ? 0.032 : 0.055);
      }
      const isSleepy = m.face === "sleepy";
      deadEyeL.visible = false;
      deadEyeR.visible = false;
      const smileBaseZ = Math.PI + mascotDna.mouthRotZ;
      if (battleLost) {
        mascot.bellyGlow.visible = false;
        mascot.leftEye.visible = false;
        mascot.rightEye.visible = false;
        mascot.sleepyEyelids.visible = false;
        mascot.mouthNeutral.visible = true;
        mascot.mouthSmile.visible = false;
        mascot.mouthSleepy.visible = false;
        mascot.mouthSmile.scale.set(1, 1, 1);
        mascot.mouthSmile.position.z = mouthSmileZ0;
        mascot.mouthSmile.rotation.z = smileBaseZ;
        deadEyeL.visible = true;
        deadEyeR.visible = true;
        deadEyeL.position.copy(mascot.leftEye.position);
        deadEyeR.position.copy(mascot.rightEye.position);
        deadEyeL.rotation.order = "XYZ";
        deadEyeR.rotation.order = "XYZ";
        deadEyeL.rotation.x = mascotDna.eyeRotX + 0.02;
        deadEyeL.rotation.y = 0;
        deadEyeL.rotation.z = mascotDna.eyeTilt + mascotDna.eyeTiltAsym + Math.sin(t * 1.05) * 0.05;
        deadEyeR.rotation.x = mascotDna.eyeRotX + 0.02;
        deadEyeR.rotation.y = 0;
        deadEyeR.rotation.z = -mascotDna.eyeTilt + mascotDna.eyeTiltAsym - Math.sin(t * 1.12) * 0.05;
        deadEyeL.scale.setScalar(mascotDna.eyeScaleL * 0.94);
        deadEyeR.scale.setScalar(mascotDna.eyeScaleR * 0.94);
      } else {
        mascot.leftEye.visible = true;
        mascot.rightEye.visible = true;
        mascot.sleepyEyelids.visible = false;
        mascot.mouthNeutral.visible = m.face === "neutral";
        mascot.mouthSmile.visible = m.face === "smile" || m.face === "happy";
        mascot.mouthSleepy.visible = isSleepy;
        mascot.mouthSmile.scale.setScalar(m.face === "happy" ? 1.24 : 1);
        mascot.mouthSmile.position.z = mouthSmileZ0;
        if (isSmile || isHappy) {
          const mk = isHappy ? 1.55 : 0.65;
          mascot.mouthSmile.rotation.z =
            smileBaseZ +
            Math.sin(t * bob * (isHappy ? 1.85 : 1.05) + 0.3) * 0.11 * mk +
            Math.sin(t * bob * (isHappy ? 3.2 : 1.6)) * (isHappy ? 0.07 : 0.025) * mk;
        } else {
          mascot.mouthSmile.rotation.z = smileBaseZ;
        }

        if (speaking || lipBoost > 0.04) {
          mascot.mouthNeutral.visible = false;
          mascot.mouthSleepy.visible = false;
          mascot.mouthSmile.visible = true;
          const rate = 10.5 + lipBoost * 8.5;
          const lip = 0.5 + 0.5 * Math.sin(t * rate);
          const lipB = 0.5 + 0.5 * Math.sin(t * rate * 1.71 + 0.9);
          const mush = 0.58 * lip + 0.42 * lipB;
          const pulse = 0.5 + 0.5 * Math.sin(t * rate * 2.35 + 0.35);
          const k = 0.38 + 0.62 * lipBoost;
          const openY = 0.46 + mush * 0.88 * k + pulse * 0.1 * k;
          const wide = 1.02 + lipBoost * 0.34 + mush * 0.22 * k + pulse * 0.12 * (0.35 + lipBoost);
          const deep = 0.94 + lipBoost * 0.28 + lipB * 0.2 * k + (1 - pulse) * 0.1 * k;
          mascot.mouthSmile.scale.set(wide, openY, deep);
          mascot.mouthSmile.position.z =
            mouthSmileZ0 +
            lipForward * 0.042 +
            mush * 0.04 * lipBoost +
            Math.sin(t * rate * 0.48) * 0.018 * lipBoost;
          mascot.mouthSmile.rotation.z =
            smileBaseZ + Math.sin(t * (14 + lipBoost * 8)) * (0.05 + 0.065 * lipBoost);
        }

          mascot.bellyGlow.visible = m.face === "happy";
        if (mascot.bellyGlow.visible) {
          const bellyMat = mascot.bellyGlow.material as THREE.MeshStandardMaterial;
          bellyMat.emissiveIntensity = 0.82 + Math.sin(t * bob * 2.75 + 0.4) * 0.52;
        }
        if (isSleepy) {
          const squ = 0.13 + Math.sin(t * bob * 0.95) * 0.018;
          mascot.leftEye.rotation.z = mascotDna.eyeTilt + mascotDna.eyeTiltAsym;
          mascot.rightEye.rotation.z = -mascotDna.eyeTilt + mascotDna.eyeTiltAsym;
          mascot.leftEye.scale.set(
            mascotDna.eyeScaleL * 1.02,
            mascotDna.eyeOvalY * mascotDna.eyeOvalL * squ,
            mascotDna.eyeSquashZ
          );
          mascot.rightEye.scale.set(
            mascotDna.eyeScaleR * 1.02,
            mascotDna.eyeOvalY * mascotDna.eyeOvalR * squ,
            mascotDna.eyeSquashZ
          );
        } else {
          const blinkWave = Math.sin(t * 2.2 * ap.blinkRate + mascotDna.blinkOffset);
          const blink = blinkWave > 0.985 ? 0.12 : 1;
          const ovalL = mascotDna.eyeOvalY * mascotDna.eyeOvalL * ap.eyeOpen * blink;
          const ovalR = mascotDna.eyeOvalY * mascotDna.eyeOvalR * ap.eyeOpen * blink;
          const tiltX = isSmile ? 0.15 : m.face === "happy" ? 0.32 : isNeutral ? 0.04 : 0;
          const eyeBob =
            (isSmile ? Math.sin(t * bob * 1.48) * 0.018 + Math.sin(t * bob * 2.2) * 0.008 : 0) +
            (isHappy ? Math.sin(t * bob * 2.65) * 0.048 + Math.sin(t * bob * 4.1) * 0.018 : 0) +
            (isNeutral ? Math.sin(t * bob * 0.62 + 0.3) * 0.006 : 0);
          const eyeStretch = 1 + eyeBob * 0.9;
          const wobL =
            (isHappy ? Math.sin(t * bob * 1.55) * 0.095 : isSmile ? Math.sin(t * bob * 1.02) * 0.038 : 0) +
            Math.sin(t * bob * 1.2) * 0.02 * (isHappy ? 1 : 0) +
            (isNeutral ? Math.sin(t * bob * 0.45 + 0.2) * 0.014 - Math.sin(t * bob * 0.31 + 1.1) * 0.01 : 0);
          const wobR =
            (isHappy ? Math.sin(t * bob * 1.55 + 0.5) * 0.095 : isSmile ? Math.sin(t * bob * 1.02 + 0.4) * 0.038 : 0) -
            Math.sin(t * bob * 1.2 + 0.4) * 0.02 * (isHappy ? 1 : 0) +
            (isNeutral ? -Math.sin(t * bob * 0.45 + 0.65) * 0.014 + Math.sin(t * bob * 0.31 + 0.4) * 0.01 : 0);
          mascot.leftEye.rotation.z = mascotDna.eyeTilt + mascotDna.eyeTiltAsym + tiltX + wobL;
          mascot.rightEye.rotation.z = -mascotDna.eyeTilt + mascotDna.eyeTiltAsym - tiltX - wobR;
          mascot.leftEye.scale.set(mascotDna.eyeScaleL, ovalL * eyeStretch, mascotDna.eyeSquashZ);
          mascot.rightEye.scale.set(mascotDna.eyeScaleR, ovalR * eyeStretch, mascotDna.eyeSquashZ);
        }
      }

      let scalePulse = 1;
      if (isSmile) {
        scalePulse += Math.sin(t * bob * 1.28) * 0.014 + Math.sin(t * bob * 2.25) * 0.009 + Math.cos(t * bob * 1.85) * 0.005;
      }
      if (isNeutral) {
        scalePulse += Math.sin(t * bob * 0.48 + 0.6) * 0.0025;
      }
      if (isHappy) {
        scalePulse +=
          Math.sin(t * bob * 2.45) * 0.048 +
          Math.sin(t * bob * 3.9) * 0.022 +
          Math.cos(t * bob * 1.35) * 0.018 +
          Math.sin(t * bob * 5.2) * 0.009;
      }
      if (!battleLost && driveRef.current.speaking) {
        scalePulse += Math.sin(t * 18.2) * 0.016 + Math.sin(t * 25.5) * 0.01;
      }
      modelRoot.scale.setScalar(baseFit * scalePulse);
      if (isHappy) {
        const ak = 1.62;
        const w = t * bob;
        const shake = Math.sin(w * 5.4 + 0.11) * 0.09 * ak;
        mascot.armLMesh.rotation.z =
          Math.sin(w * 1.95 + 0.2) * 0.88 * ak + Math.sin(w * 4.15) * 0.14 * ak + shake;
        mascot.armLMesh.rotation.x =
          Math.cos(w * 1.52 + 0.5) * 0.62 * ak + Math.sin(w * 3.25 + 0.3) * 0.12 * ak;
        mascot.armLMesh.rotation.y = Math.sin(w * 2.72 + 0.15) * 0.42 * ak;
        mascot.armRMesh.rotation.z =
          -Math.sin(w * 1.88 + 0.95) * 0.88 * ak - Math.sin(w * 4.05 + 0.4) * 0.14 * ak - shake;
        mascot.armRMesh.rotation.x =
          Math.cos(w * 1.58 + 1.05) * 0.62 * ak + Math.sin(w * 3.18 + 0.7) * 0.12 * ak;
        mascot.armRMesh.rotation.y = -Math.sin(w * 2.68 + 1.05) * 0.42 * ak;
        const fk = 1.35;
        mascot.footLMesh.rotation.x =
          Math.sin(w * 2.35 + 0.35) * 0.42 * fk + Math.sin(w * 4.8) * 0.08 * fk;
        mascot.footLMesh.rotation.z = Math.sin(w * 1.82 + 0.25) * 0.28 * fk;
        mascot.footLMesh.rotation.y = Math.sin(w * 2.62 + 0.05) * 0.24 * fk;
        mascot.footRMesh.rotation.x =
          -Math.sin(w * 2.28 + 1.15) * 0.42 * fk - Math.sin(w * 4.75 + 0.5) * 0.08 * fk;
        mascot.footRMesh.rotation.z = -Math.sin(w * 1.78 + 0.85) * 0.28 * fk;
        mascot.footRMesh.rotation.y = -Math.sin(w * 2.55 + 1.2) * 0.24 * fk;
      } else if (isSmile) {
        const ak = 0.48;
        const ws = t * bob;
        mascot.armLMesh.rotation.z = Math.sin(ws * 1.12 + 0.2) * 0.34 * ak + Math.sin(ws * 2.05) * 0.06 * ak;
        mascot.armLMesh.rotation.x = Math.cos(ws * 0.95 + 0.5) * 0.2 * ak;
        mascot.armLMesh.rotation.y = Math.sin(ws * 0.88 + 0.15) * 0.1 * ak;
        mascot.armRMesh.rotation.z = -Math.sin(ws * 1.08 + 0.85) * 0.34 * ak - Math.sin(ws * 2.02 + 0.3) * 0.06 * ak;
        mascot.armRMesh.rotation.x = Math.cos(ws * 0.98 + 1.05) * 0.2 * ak;
        mascot.armRMesh.rotation.y = -Math.sin(ws * 0.9 + 1.1) * 0.1 * ak;
        mascot.footLMesh.rotation.set(0, 0, 0);
        mascot.footRMesh.rotation.set(0, 0, 0);
      } else if (isNeutral) {
        const ak = 0.16;
        const wn = t * bob * 0.55;
        mascot.armLMesh.rotation.z = Math.sin(wn + 0.35) * 0.14 * ak;
        mascot.armLMesh.rotation.x = Math.cos(wn * 0.9 + 0.6) * 0.08 * ak;
        mascot.armLMesh.rotation.y = 0;
        mascot.armRMesh.rotation.z = -Math.sin(wn + 0.95) * 0.14 * ak;
        mascot.armRMesh.rotation.x = Math.cos(wn * 0.88 + 1.15) * 0.08 * ak;
        mascot.armRMesh.rotation.y = 0;
        mascot.footLMesh.rotation.set(0, 0, 0);
        mascot.footRMesh.rotation.set(0, 0, 0);
      } else {
        mascot.armLMesh.rotation.set(0, 0, 0);
        mascot.armRMesh.rotation.set(0, 0, 0);
        mascot.footLMesh.rotation.set(0, 0, 0);
        mascot.footRMesh.rotation.set(0, 0, 0);
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (tapLipTimerRef.current !== null) {
        window.clearTimeout(tapLipTimerRef.current);
        tapLipTimerRef.current = null;
      }
      cancelAnimationFrame(frameId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.style.cursor = "";
      liquidRipple.active = false;
      restoreBlobVertices();
      resizeObserver.disconnect();
      scene.remove(modelRoot);
      mascot.dispose();
      envRT.dispose();
      pmremGenerator.dispose();
      scene.environment = null;
      renderer.dispose();
      sparklesGeometry.dispose();
      sparklesMaterial.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      floorGlow.geometry.dispose();
      floorGlowMat.dispose();
    };
  }, [mascotDna, familyId, reportBlobTaps]);

  return (
    <div
      className="relative h-full min-h-0 w-full overflow-hidden rounded-3xl border border-warm-100/80"
      style={{
        background: `linear-gradient(180deg, ${canvasBg.from}, ${canvasBg.to})`,
      }}
    >
      <canvas ref={canvasRef} className="block h-full min-h-0 w-full" />
    </div>
  );
}
