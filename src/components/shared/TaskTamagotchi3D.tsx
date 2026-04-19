"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useCozyConfig } from "@/hooks/useCozyConfig";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { familyAchievementLabel } from "@/lib/family-achievement-label";
import { listAchievementsSorted } from "@/lib/achievements/registry";
import { nibbyChargeStage } from "@/lib/nibby-charge";
import { reportMascotBlobTap } from "@/lib/mascot-blob-tap-client";
import { playMascotBlobTapVoice } from "@/lib/mascot-speak-audio";
import { I18N, type AppLanguage } from "@/lib/i18n";
import { createMascotDNA, mascotBoundingRadius } from "@/lib/mascot-dna";
import { buildProceduralMascot } from "@/lib/procedural-mascot-three";
import { MessageCircle, Share2, Sparkles } from "lucide-react";
import { useAssistantBuddy } from "@/components/shared/AssistantBuddyProvider";

interface TaskTamagotchi3DProps {
  familyId: string;
  doneToday: number;
  doneWeek: number;
  myOpen: number;
  doneTotal: number;
  familyXp?: number;
  unlockedAchievementIds?: string[];
  assistantEnabled?: boolean;
}

const DAY_TARGET = 3;
const WEEK_TARGET = 12;
type TamagotchiText = Record<keyof typeof I18N.uk.tamagotchi, string>;
type MoodFace = "happy" | "smile" | "neutral" | "sleepy";

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

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

const STORY_W = 1080;
const STORY_H = 1920;
const STORY_BOTTOM_TEXT_H = 228;
const STORY_EXPORT_DPR = 2;
const STORY_CAPTURE_CAMERA_PULL = 1.52;

function canvasToPngBlob(canvas: HTMLCanvasElement, quality?: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", quality);
  });
}

async function buildInstagramStoryPng(
  sourceCanvas: HTMLCanvasElement,
  opts: {
    headline: string;
    canvasFrom: string;
    canvasTo: string;
    familyXp: number;
    familyXpLabel: string;
    achievementsLabel: string;
    achievementLines: string[];
    achievementsMoreText: string | null;
    siteLabel: string;
  }
) {
  const iw = STORY_W * STORY_EXPORT_DPR;
  const ih = STORY_H * STORY_EXPORT_DPR;
  const out = document.createElement("canvas");
  out.width = iw;
  out.height = ih;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.scale(STORY_EXPORT_DPR, STORY_EXPORT_DPR);
  const g = ctx.createLinearGradient(0, 0, 0, STORY_H);
  g.addColorStop(0, opts.canvasFrom);
  g.addColorStop(1, opts.canvasTo);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  const slotH = STORY_H - STORY_BOTTOM_TEXT_H;
  const inset = 12;
  const slotW = STORY_W - inset * 2;
  const cw = sourceCanvas.width;
  const ch = Math.max(1, sourceCanvas.height);
  const scaleContain = Math.min(slotW / cw, slotH / ch);
  const scaleCover = Math.max(slotW / cw, slotH / ch);
  const zoomBlend = 0.52;
  const scale = scaleContain + (scaleCover - scaleContain) * zoomBlend;
  const drawW = Math.round(cw * scale);
  const drawH = Math.round(ch * scale);
  const dx = Math.round(inset + (slotW - drawW) / 2);
  const dy = Math.round((slotH - drawH) / 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(inset, 0, slotW, slotH);
  ctx.clip();
  ctx.drawImage(sourceCanvas, dx, dy, drawW, drawH);
  ctx.restore();

  const gradH = 72;
  const textFade = ctx.createLinearGradient(0, slotH - gradH, 0, slotH);
  textFade.addColorStop(0, "rgba(255,255,255,0)");
  textFade.addColorStop(1, "rgba(255,255,255,0.38)");
  ctx.fillStyle = textFade;
  ctx.fillRect(0, slotH - gradH, STORY_W, gradH);

  const textPadX = 56;
  const maxTextW = STORY_W - textPadX * 2;
  const footerY = STORY_H - 24;
  const ruleY = footerY - 34;
  const achLineH = 22;
  const maxAchLines = 5;
  ctx.textAlign = "center";
  ctx.font = "18px system-ui, -apple-system, Segoe UI, sans-serif";
  const achLines: string[] = [];
  if (opts.achievementLines.length > 0) {
    let ach = opts.achievementLines.join(" · ");
    if (opts.achievementsMoreText) {
      ach = `${ach}  ${opts.achievementsMoreText}`;
    }
    const achFull = `${opts.achievementsLabel}: ${ach}`;
    const words = achFull.split(/\s+/);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (ctx.measureText(next).width > maxTextW && line) {
        achLines.push(line);
        line = w;
      } else {
        line = next;
      }
    }
    if (line) achLines.push(line);
    while (achLines.length > maxAchLines) {
      achLines.pop();
    }
    if (achLines.length === maxAchLines) {
      const last = achLines[maxAchLines - 1]!;
      let t = last;
      while (t.length > 8 && ctx.measureText(`${t}…`).width > maxTextW) {
        t = t.slice(0, -1);
      }
      achLines[maxAchLines - 1] = `${t}…`;
    }
  }
  const padAboveRule = 14;
  const gapXpAch = 10;
  const gapHeadXp = 34;
  let baselineXp: number;
  if (achLines.length > 0) {
    let b = ruleY - padAboveRule;
    ctx.fillStyle = "rgba(41,37,36,0.88)";
    for (let i = achLines.length - 1; i >= 0; i -= 1) {
      ctx.fillText(achLines[i]!, STORY_W / 2, b);
      b -= achLineH;
    }
    baselineXp = b - gapXpAch;
  } else {
    baselineXp = ruleY - padAboveRule - 4;
  }
  const baselineHead = Math.max(slotH + 16, baselineXp - gapHeadXp);
  ctx.fillStyle = "#6d28d9";
  ctx.font = "bold 30px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(opts.headline, STORY_W / 2, baselineHead);
  ctx.fillStyle = "#5b21b6";
  ctx.font = "600 19px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(`${opts.familyXpLabel}: ${opts.familyXp} XP`, STORY_W / 2, baselineXp);
  ctx.strokeStyle = "rgba(120,113,108,0.28)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(textPadX, ruleY);
  ctx.lineTo(STORY_W - textPadX, ruleY);
  ctx.stroke();
  ctx.fillStyle = "#57534e";
  ctx.font = "600 26px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(opts.siteLabel, STORY_W / 2, footerY);
  const final = document.createElement("canvas");
  final.width = STORY_W;
  final.height = STORY_H;
  const f = final.getContext("2d");
  if (!f) return canvasToPngBlob(out, 0.92);
  f.imageSmoothingEnabled = true;
  f.imageSmoothingQuality = "high";
  f.drawImage(out, 0, 0, iw, ih, 0, 0, STORY_W, STORY_H);
  return canvasToPngBlob(final, 0.92);
}

function resolveMood(doneToday: number, doneWeek: number, t: TamagotchiText) {
  const stage = nibbyChargeStage(doneToday, doneWeek);
  if (stage === 4) {
    return {
      title: t.superForm,
      subtitle: t.superFormSubtitle,
      face: "happy" as const,
      body: "#7c3aed",
      glow: "#a78bfa",
      ear: "#ec4899",
      bloom: "from-violet-500/20 via-indigo-400/15 to-rose-400/20",
      speed: 1.8,
      distort: 0.25,
      canvasFrom: "#ede9fe",
      canvasTo: "#ddd6fe",
      bobAmp: 0.07,
    };
  }
  if (stage === 3) {
    return {
      title: t.goodRhythm,
      subtitle: t.goodRhythmSubtitle,
      face: "smile" as const,
      body: "#0ea5e9",
      glow: "#38bdf8",
      ear: "#22c55e",
      bloom: "from-sky-400/20 via-cyan-300/15 to-sage-400/20",
      speed: 1.35,
      distort: 0.19,
      canvasFrom: "#ecfeff",
      canvasTo: "#cffafe",
      bobAmp: 0.062,
    };
  }
  if (stage === 2) {
    return {
      title: t.stable,
      subtitle: t.stableSubtitle,
      face: "neutral" as const,
      body: "#fb923c",
      glow: "#fda4af",
      ear: "#f43f5e",
      bloom: "from-orange-400/20 via-rose-300/15 to-pink-300/20",
      speed: 1.1,
      distort: 0.14,
      canvasFrom: "#fff7ed",
      canvasTo: "#ffe4e6",
      bobAmp: 0.054,
    };
  }
  return {
    title: t.needsMove,
    subtitle: t.needsMoveSubtitle,
    face: "sleepy" as const,
    body: "#94a3b8",
    glow: "#cbd5e1",
    ear: "#64748b",
    bloom: "from-slate-300/25 via-zinc-200/15 to-rose-200/20",
    speed: 0.85,
    distort: 0.08,
    canvasFrom: "#f8fafc",
    canvasTo: "#e2e8f0",
    bobAmp: 0.046,
  };
}

export default function TaskTamagotchi3D({
  familyId,
  doneToday,
  doneWeek,
  myOpen,
  doneTotal,
  familyXp = 0,
  unlockedAchievementIds = [],
  assistantEnabled = false,
}: TaskTamagotchi3DProps) {
  const { config } = useCozyConfig();
  const { openBuddy } = useAssistantBuddy();
  const { language } = useAppLanguage();
  const t = I18N[language].tamagotchi;
  const lang = language as AppLanguage;
  const mascotName = config.mascot.slice(0, 1).toUpperCase() + config.mascot.slice(1);
  const mood = resolveMood(doneToday, doneWeek, t);
  const unlockedOrderedIds = useMemo(
    () => listAchievementsSorted().map((a) => a.id).filter((id) => unlockedAchievementIds.includes(id)),
    [unlockedAchievementIds]
  );
  const dayProgress = clamp((doneToday / DAY_TARGET) * 100);
  const weekProgress = clamp((doneWeek / WEEK_TARGET) * 100);
  const activityLevel = clamp((doneToday * 7 + doneWeek * 2) / 60, 0, 1);
  const intensity = useMemo(
    () => clamp((doneWeek + doneToday * 1.5 + Math.max(0, doneTotal - myOpen) * 0.25) / 30, 0, 1),
    [doneToday, doneWeek, doneTotal, myOpen]
  );
  const mascotDna = useMemo(() => createMascotDNA(familyId), [familyId]);

  const moodRef = useRef(mood);
  const activityRef = useRef(activityLevel);
  const configRef = useRef(config);
  moodRef.current = mood;
  activityRef.current = activityLevel;
  configRef.current = config;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const storyGlRef = useRef<{
    captureFrame: (w: number, h: number) => HTMLCanvasElement | null;
  } | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  const shareToInstagramStory = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || shareBusy) return;
    const tb = I18N[language].tamagotchi;
    setShareBusy(true);
    const busyId = toast.loading(tb.sharePreparing);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      const achievementLines = unlockedOrderedIds
        .slice(0, 4)
        .map((id) => familyAchievementLabel(id, lang));
      const achievementsMoreText =
        unlockedOrderedIds.length > 4
          ? tb.achievementsMore.replace("{count}", String(unlockedOrderedIds.length - 4))
          : null;
      const achShareNames = unlockedOrderedIds.map((id) => familyAchievementLabel(id, lang));
      const headline = tb.cardMotto.replace("{name}", mascotName);
      const shareFullText = `${headline}. ${tb.familyXpLabel}: ${familyXp} XP${
        achShareNames.length ? `. ${tb.achievementsLabel}: ${achShareNames.join(", ")}` : ""
      }. ${tb.storySite}`;
      const inset = 18;
      const slotW = STORY_W - inset * 2;
      const slotH = STORY_H - STORY_BOTTOM_TEXT_H;
      const maxSide = 3200;
      let snapW = 1920;
      let snapH = Math.round((snapW * slotH) / slotW);
      if (snapH > maxSide) {
        snapH = maxSide;
        snapW = Math.round((snapH * slotW) / slotH);
      }
      const hi = storyGlRef.current?.captureFrame(snapW, snapH) ?? null;
      const source = hi ?? canvas;
      const blob = await buildInstagramStoryPng(source, {
        headline,
        canvasFrom: mood.canvasFrom,
        canvasTo: mood.canvasTo,
        familyXp,
        familyXpLabel: tb.familyXpLabel,
        achievementsLabel: tb.achievementsLabel,
        achievementLines,
        achievementsMoreText,
        siteLabel: tb.storySite,
      });
      if (!blob) {
        toast.error(tb.shareFailed, { id: busyId });
        return;
      }
      const file = new File([blob], "nibby-nibbo-story.png", { type: "image/png" });
      const payload = { files: [file], title: headline, text: shareFullText };
      if (typeof navigator !== "undefined" && navigator.canShare?.(payload)) {
        await navigator.share(payload);
        toast.dismiss(busyId);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "nibby-nibbo-story.png";
        a.rel = "noopener";
        a.click();
        URL.revokeObjectURL(url);
        toast.success(tb.shareSaved, { id: busyId, duration: 4500 });
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        toast.dismiss(busyId);
      } else {
        toast.error(I18N[language].tamagotchi.shareFailed, { id: busyId });
      }
    } finally {
      setShareBusy(false);
    }
  }, [
    shareBusy,
    language,
    lang,
    mascotName,
    mood.canvasFrom,
    mood.canvasTo,
    familyXp,
    unlockedOrderedIds,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
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
    const fill = new THREE.DirectionalLight(new THREE.Color(moodRef.current.glow), 0.9);
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
    scene.add(modelRoot);

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
      color: new THREE.Color(moodRef.current.glow),
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
      color: new THREE.Color(moodRef.current.glow),
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

    const captureStoryFrame = (w: number, h: number): HTMLCanvasElement | null => {
      const lim = renderer.capabilities.maxTextureSize;
      const rw = Math.max(32, Math.min(lim, Math.round(w)));
      const rh = Math.max(32, Math.min(lim, Math.round(h)));
      const prevAspect = camera.aspect;
      const prevRt = renderer.getRenderTarget();
      const rt = new THREE.WebGLRenderTarget(rw, rh, {
        depthBuffer: true,
        stencilBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
      rt.texture.colorSpace = THREE.SRGBColorSpace;
      const prevPos = camera.position.clone();
      const prevQuat = camera.quaternion.clone();
      const look = new THREE.Vector3(0, 0.04, 0);
      const arm = prevPos.clone().sub(look);
      const armLen = arm.length();
      if (armLen > 1e-6) {
        arm.normalize();
        camera.position.copy(look).addScaledVector(arm, armLen * STORY_CAPTURE_CAMERA_PULL);
        camera.lookAt(look);
      }
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      const px = new Uint8Array(rw * rh * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, rw, rh, px);
      renderer.setRenderTarget(prevRt);
      rt.dispose();
      camera.position.copy(prevPos);
      camera.quaternion.copy(prevQuat);
      camera.aspect = prevAspect;
      camera.updateProjectionMatrix();
      resize();
      const outC = document.createElement("canvas");
      outC.width = rw;
      outC.height = rh;
      const c2 = outC.getContext("2d", { alpha: true });
      if (!c2) return null;
      const img = c2.createImageData(rw, rh);
      const rowStride = rw * 4;
      for (let y = 0; y < rh; y += 1) {
        const srcStart = (rh - 1 - y) * rowStride;
        img.data.set(px.subarray(srcStart, srcStart + rowStride), y * rowStride);
      }
      c2.putImageData(img, 0, 0);
      return outC;
    };
    storyGlRef.current = { captureFrame: captureStoryFrame };

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
      reportMascotBlobTap();
      void playMascotBlobTapVoice(familyId).catch(() => {});
    };
    canvas.style.cursor = "pointer";
    canvas.addEventListener("pointerdown", onPointerDown);

    let frameId = 0;
    const start = performance.now();
    const animate = () => {
      const now = performance.now();
      applyLiquidRipple(now);
      const t = (now - start) / 1000;
      const m = moodRef.current;
      const cfg = configRef.current;
      const act = activityRef.current;
      const ap = mascotAnimProfile(m.face as MoodFace);
      const s = m.speed * cfg.speed;
      const bob = mascotDna.bobSpeed * s * ap.bobFreqMul;
      const bobAmp = (m.bobAmp + mascotDna.bobAmp * 0.55) * ap.bobAmpMul;
      sparkles.rotation.y = t * ap.sparkleSpin;
      sparklesMaterial.color.set(m.glow);
      sparklesMaterial.size = 0.055 + act * 0.07;
      sparklesMaterial.opacity = 0.45 + cfg.intensity * 0.4;
      fill.color.set(m.glow);
      floorGlowMat.color.set(m.glow);
      const face = m.face as MoodFace;
      const isSmile = face === "smile";
      const isHappy = face === "happy";
      const isNeutral = face === "neutral";
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
      modelRoot.rotation.x = isHappy
        ? Math.sin(t * bob * 0.88 + 0.4) * 0.11 + Math.sin(t * bob * 1.55 + 1.1) * 0.055
        : isSmile
          ? Math.sin(t * bob * 0.72 + 0.45) * 0.048 + Math.sin(t * bob * 1.35 + 0.1) * 0.018
          : isNeutral
            ? Math.sin(t * bob * 0.36 + 0.25) * 0.014 - 0.018
            : 0;
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
      mascot.leftEye.visible = true;
      mascot.rightEye.visible = true;
      mascot.sleepyEyelids.visible = false;
      mascot.mouthNeutral.visible = m.face === "neutral";
      mascot.mouthSmile.visible = m.face === "smile" || m.face === "happy";
      mascot.mouthSleepy.visible = isSleepy;
      mascot.mouthSmile.scale.setScalar(m.face === "happy" ? 1.24 : 1);
      const smileBaseZ = Math.PI + mascotDna.mouthRotZ;
      if (isSmile || isHappy) {
        const mk = isHappy ? 1.55 : 0.65;
        mascot.mouthSmile.rotation.z =
          smileBaseZ +
          Math.sin(t * bob * (isHappy ? 1.85 : 1.05) + 0.3) * 0.11 * mk +
          Math.sin(t * bob * (isHappy ? 3.2 : 1.6)) * (isHappy ? 0.07 : 0.025) * mk;
      } else {
        mascot.mouthSmile.rotation.z = smileBaseZ;
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
      storyGlRef.current = null;
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
  }, [mascotDna]);

  return (
    <div className={`bg-white/75 rounded-3xl border border-warm-100 shadow-cozy p-5 relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${mood.bloom} pointer-events-none`} />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-3">
        <div className="relative z-10 min-w-0 md:flex-1">
          <h3 className="text-sm font-semibold text-warm-800">{mascotName}</h3>
          <p className="mt-1 text-xs leading-snug text-warm-500">{mood.subtitle}</p>
        </div>
        <div className="relative z-10 flex w-full flex-wrap items-center gap-2 md:w-auto md:shrink-0 md:justify-end">
          {assistantEnabled ? (
            <button
              type="button"
              onClick={() => openBuddy()}
              className="inline-flex items-center gap-1.5 rounded-full border border-sage-200 bg-sage-50/95 px-3 py-1.5 text-xs font-semibold text-sage-800 shadow-sm transition hover:bg-sage-100"
            >
              <MessageCircle size={15} className="text-sage-600" aria-hidden />
              {t.chatButton}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void shareToInstagramStory()}
            disabled={shareBusy}
            aria-label={t.shareAria}
            className="inline-flex items-center gap-1.5 rounded-full border border-warm-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-warm-800 shadow-sm transition hover:bg-white disabled:opacity-50"
          >
            <Share2 size={15} className="text-warm-600" aria-hidden />
            {t.shareButton}
          </button>
          <Sparkles size={18} className="text-warm-500" aria-hidden />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center relative z-10">
        <div
          className="relative h-60 rounded-3xl border border-warm-100 overflow-hidden"
          style={{ background: `linear-gradient(180deg, ${mood.canvasFrom}, ${mood.canvasTo})` }}
        >
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-warm-100 p-3 bg-warm-50/60">
            <p className="text-xs text-warm-500 mb-1">{t.state}</p>
            <p className="text-sm font-semibold text-warm-800">{mood.title}</p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-warm-600">{t.day}</span>
              <span className="text-warm-500">{doneToday}/{DAY_TARGET}</span>
            </div>
            <div className="h-2.5 rounded-full bg-warm-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${dayProgress}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-peach-400 to-rose-400"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-warm-600">{t.week}</span>
              <span className="text-warm-500">{doneWeek}/{WEEK_TARGET}</span>
            </div>
            <div className="h-2.5 rounded-full bg-warm-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${weekProgress}%` }}
                transition={{ duration: 1.1, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-sage-400 to-sky-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-warm-100 bg-white/70 p-2.5">
              <p className="text-[11px] text-warm-500">{t.myActive}</p>
              <p className="text-sm font-semibold text-warm-800">{myOpen}</p>
            </div>
            <div className="rounded-xl border border-warm-100 bg-white/70 p-2.5">
              <p className="text-[11px] text-warm-500">{t.doneTotal}</p>
              <p className="text-sm font-semibold text-warm-800">{doneTotal}</p>
            </div>
          </div>

          <p className="text-xs text-warm-500">
            {t.hint}
          </p>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${intensity * 100}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="h-1.5 rounded-full bg-gradient-to-r from-rose-400 via-lavender-400 to-sky-400"
          />
        </div>
      </div>
    </div>
  );
}
