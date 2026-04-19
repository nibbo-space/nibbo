import type { MascotDNA } from "@/lib/mascot-dna";
import {
  createMascotSurfaceNoise3D,
  sampleMascotSurfaceFbm,
} from "@/lib/mascot-surface-noise";
import type { NoiseFunction3D } from "simplex-noise";
import * as THREE from "three";

function hsl(h: number, s: number, l: number) {
  return new THREE.Color().setHSL(((h % 1) + 1) % 1, s, l);
}

function buildEyeGroup(
  dna: MascotDNA,
  irisHueShift: number,
  mirrored: boolean,
): THREE.Group {
  const g = new THREE.Group();
  const S = dna.eyeSize;
  const mx = mirrored ? -1 : 1;
  const scleraR = S * 0.86;
  const scleraGeo = new THREE.SphereGeometry(scleraR, 28, 22);
  const scleraMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#dce4f2"),
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.38,
    clearcoatRoughness: 0.38,
    sheen: 0.18,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color("#f2f6ff"),
  });
  const sclera = new THREE.Mesh(scleraGeo, scleraMat);
  sclera.renderOrder = 0;
  g.add(sclera);

  const irisHue = (((dna.eyeIrisHue + irisHueShift) % 1) + 1) % 1;
  const irisCol = hsl(irisHue, dna.eyeIrisSat, dna.eyeIrisLight);
  const irisR = S * 0.39;
  const irisGeo = new THREE.SphereGeometry(irisR, 24, 20);
  const irisMat = new THREE.MeshPhysicalMaterial({
    color: irisCol,
    roughness: 0.35,
    metalness: 0.06,
    clearcoat: 0.45,
    clearcoatRoughness: 0.32,
    emissive: irisCol.clone().multiplyScalar(0.18),
    emissiveIntensity: 0.35,
  });
  const iris = new THREE.Mesh(irisGeo, irisMat);
  iris.renderOrder = 1;
  iris.position.z = S * 0.76;
  iris.scale.set(1, 1.06, 0.62);
  g.add(iris);

  const pupil = new THREE.Mesh(
    new THREE.SphereGeometry(S * 0.2, 18, 16),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#03050a"),
      roughness: 0.28,
      metalness: 0.18,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
    }),
  );
  pupil.renderOrder = 2;
  pupil.position.z = S * 0.91;
  pupil.scale.set(1, 1.08, 0.74);
  g.add(pupil);

  const ringGeo = new THREE.RingGeometry(S * 0.19, S * 0.245, 22);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.renderOrder = 3;
  ring.position.set(S * 0.05 * mx, S * 0.04, S * 0.9);
  ring.rotation.x = -0.32;
  ring.rotation.y = 0.22 * mx;
  g.add(ring);

  const catchHi = new THREE.Mesh(
    new THREE.SphereGeometry(S * 0.055, 10, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    }),
  );
  catchHi.renderOrder = 4;
  catchHi.position.set(S * 0.18 * mx, S * 0.14, S * 0.96);
  g.add(catchHi);

  const catchLo = new THREE.Mesh(
    new THREE.SphereGeometry(S * 0.028, 8, 6),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  catchLo.renderOrder = 4;
  catchLo.position.set(S * -0.07 * mx, S * -0.11, S * 0.93);
  g.add(catchLo);

  return g;
}

function disposeGroup(root: THREE.Group) {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      geos.add(obj.geometry);
      const ms = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of ms) mats.add(m);
    }
  });
  for (const g of geos) g.dispose();
  for (const m of mats) m.dispose();
  root.clear();
}

function buildBlobGeometry(
  dna: MascotDNA,
  noise3D: NoiseFunction3D,
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.72, 64, 48);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const rx = 0.72 * dna.beanXZ;
  const ry = 0.72 * dna.beanY;
  const rz = 0.72 * dna.beanZD;
  const rotQ = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      dna.surfaceNoiseEulerX,
      dna.surfaceNoiseEulerY,
      dna.surfaceNoiseEulerZ,
      "XYZ",
    ),
  );
  const u = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const base = new THREE.Vector3();
  const gn = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    u.fromBufferAttribute(pos, i).normalize();
    const nx = u.x;
    const ny = u.y;
    const nz = u.z;
    dir.copy(u).applyQuaternion(rotQ);
    const fbm = sampleMascotSurfaceFbm(noise3D, dir.x, dir.y, dir.z, dna);
    const puddle =
      THREE.MathUtils.smoothstep(-ny, -0.06, 0.68) * dna.puddleStrength;
    const spread = 1 + dna.klyaksaSpread * puddle;
    const lift = dna.klyaksaFlat * puddle * ry * 0.52;
    base.set(nx * rx * spread, ny * ry + lift, nz * rz * spread);
    gn.set(base.x / (rx * rx), base.y / (ry * ry), base.z / (rz * rz));
    if (gn.lengthSq() < 1e-12) gn.copy(base).normalize();
    else gn.normalize();
    const disp = THREE.MathUtils.clamp(fbm, -1, 1) * dna.surfaceNoiseAmp;
    pos.setXYZ(
      i,
      base.x + gn.x * disp,
      base.y + gn.y * disp,
      base.z + gn.z * disp,
    );
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function inflateAlongNormal(
  geo: THREE.BufferGeometry,
  delta: number,
): THREE.BufferGeometry {
  const g = geo.clone();
  g.computeVertexNormals();
  const pos = g.attributes.position as THREE.BufferAttribute;
  const norm = g.attributes.normal as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(norm, i);
    p.addScaledVector(n, delta);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  return g;
}

function shellAxes(dna: MascotDNA) {
  const e =
    1 +
    dna.surfaceNoiseAmp * 0.55 +
    dna.klyaksaSpread * dna.puddleStrength * 0.14;
  return {
    rx: 0.72 * dna.beanXZ * e,
    ry: 0.72 * dna.beanY * e,
    rz: 0.72 * dna.beanZD * e,
  };
}

function surfaceZ(rx: number, ry: number, rz: number, x: number, y: number) {
  const u = (x / rx) ** 2 + (y / ry) ** 2;
  if (u >= 1) return rz * 0.55;
  return rz * Math.sqrt(Math.max(0, 1 - u));
}

export interface ProceduralMascotHandles {
  root: THREE.Group;
  body: THREE.Group;
  bodyCore: THREE.Group;
  blobMesh: THREE.Mesh;
  leftEye: THREE.Group;
  rightEye: THREE.Group;
  sleepyEyelids: THREE.Group;
  mouthNeutral: THREE.Group;
  mouthSmile: THREE.Mesh;
  mouthSleepy: THREE.Mesh;
  bellyGlow: THREE.Mesh;
  armLMesh: THREE.Mesh;
  armRMesh: THREE.Mesh;
  footLMesh: THREE.Mesh;
  footRMesh: THREE.Mesh;
  dispose: () => void;
}

export function buildProceduralMascot(
  dna: MascotDNA,
  familyId: string,
): ProceduralMascotHandles {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const bodyCore = new THREE.Group();

  const noise3D = createMascotSurfaceNoise3D(familyId || "nibbo");
  const blobGeo = buildBlobGeometry(dna, noise3D);
  blobGeo.computeBoundingBox();
  const bb = blobGeo.boundingBox!;
  blobGeo.computeVertexNormals();
  const basePosAttr = blobGeo.attributes.position as THREE.BufferAttribute;
  const baseNormAttr = blobGeo.attributes.normal as THREE.BufferAttribute;
  const vCount = basePosAttr.count;
  const baseBlobPositions = new Float32Array(vCount * 3);
  baseBlobPositions.set(basePosAttr.array as Float32Array);
  const baseBlobNormals = new Float32Array(vCount * 3);
  baseBlobNormals.set(baseNormAttr.array as Float32Array);
  blobGeo.userData.baseBlobPositions = baseBlobPositions;
  blobGeo.userData.baseBlobNormals = baseBlobNormals;

  const rimGeo = inflateAlongNormal(blobGeo, 0.034);
  const rimCol = hsl((dna.hueRim + 0.04) % 1, 0.75, 0.58);
  const rimMat = new THREE.MeshBasicMaterial({
    color: rimCol,
    side: THREE.BackSide,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.renderOrder = -1;

  const bodyCol = hsl(dna.hueBody, dna.satBody, dna.lightBody);
  const deepCol = hsl(
    dna.hueBody,
    Math.min(0.95, dna.satBody + 0.08),
    dna.lightBody * 0.62,
  );
  const glowEdge = hsl(
    (dna.hueRim + 0.36) % 1,
    Math.min(0.9, 0.52 + dna.satBody * 0.22),
    Math.min(0.7, 0.44 + dna.lightBody * 0.2),
  );
  const pearl = hsl((dna.hueRim + 0.55) % 1, 0.45, 0.72);
  const specPearl = hsl((dna.hueRim + 0.59) % 1, 0.5, 0.74);

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: bodyCol,
    roughness: 0.22,
    metalness: 0,
    transmission: 0.26,
    thickness: 1.85,
    ior: 1.42,
    dispersion: 0.18,
    attenuationColor: glowEdge,
    attenuationDistance: 0.62,
    clearcoat: 0.72,
    clearcoatRoughness: 0.22,
    iridescence: 0.92,
    iridescenceIOR: dna.iridescenceIOR,
    iridescenceThicknessRange: [
      dna.iridescenceThicknessMin,
      dna.iridescenceThicknessMax,
    ],
    sheen: 0.85,
    sheenRoughness: 0.38,
    sheenColor: pearl,
    specularIntensity: 1.15,
    specularColor: specPearl,
    emissive: deepCol.clone().multiplyScalar(0.08),
  });

  const blobMesh = new THREE.Mesh(blobGeo, skinMat);
  blobMesh.castShadow = true;
  blobMesh.receiveShadow = true;
  blobMesh.renderOrder = 0;

  bodyCore.add(rimMesh, blobMesh);
  body.add(bodyCore);

  const matteMat = new THREE.MeshStandardMaterial({
    color: bodyCol,
    roughness: 0.48,
    metalness: 0.02,
  });

  const footGeo = new THREE.SphereGeometry(dna.footRadius, 18, 14);
  const yFoot = bb.min.y + dna.footRadius * 0.5;
  const footLMesh = new THREE.Mesh(footGeo, matteMat.clone());
  footLMesh.position.set(-dna.footSpread, yFoot, dna.footZ);
  footLMesh.scale.set(1.05, 0.72, 1.1);
  const footRMesh = new THREE.Mesh(footGeo, matteMat.clone());
  footRMesh.position.set(dna.footSpread, yFoot, dna.footZ);
  footRMesh.scale.set(1.05, 0.72, 1.1);
  body.add(footLMesh, footRMesh);

  const { rx, ry, rz } = shellAxes(dna);
  const armRad = dna.footRadius * 0.88;
  const armGeo = new THREE.SphereGeometry(armRad, 12, 10);
  const armLMesh = new THREE.Mesh(armGeo, matteMat.clone());
  const armY = (dna.eyeY + dna.eyeLift) * 0.42;
  armLMesh.position.set(-rx * 0.86, armY, rz * 0.42);
  const armRMesh = new THREE.Mesh(armGeo, matteMat.clone());
  armRMesh.position.set(rx * 0.86, armY, rz * 0.42);
  body.add(armLMesh, armRMesh);

  if (dna.sideNub > 0.1) {
    const r = dna.sideNub * 0.42;
    const nubGeo = new THREE.SphereGeometry(r, 12, 10);
    const nx = bb.max.x * 0.9;
    const ny = bb.min.y + (bb.max.y - bb.min.y) * 0.56;
    const nz = bb.max.z * 0.62;
    const nL = new THREE.Mesh(nubGeo, matteMat.clone());
    nL.position.set(-nx, ny, nz);
    const nR = new THREE.Mesh(nubGeo, matteMat.clone());
    nR.position.set(nx, ny, nz);
    body.add(nL, nR);
  }

  const halfGap = dna.eyeGap * 0.5;
  const eyeY0 = dna.eyeY + dna.eyeLift;
  const eyeXL = -halfGap + dna.eyeLeftX;
  const eyeXR = halfGap + dna.eyeRightX;
  const eyeYL = eyeY0 + dna.eyeLeftY;
  const eyeYR = eyeY0 + dna.eyeRightY;
  const ezL =
    surfaceZ(rx, ry, rz, Math.abs(eyeXL), eyeYL) +
    dna.eyeSize * 0.28 +
    dna.eyeZPuff;
  const ezR =
    surfaceZ(rx, ry, rz, Math.abs(eyeXR), eyeYR) +
    dna.eyeSize * 0.28 +
    dna.eyeZPuff;

  const leftEye = buildEyeGroup(dna, dna.eyeIrisHueShiftL, false);
  leftEye.position.set(eyeXL, eyeYL, ezL);
  leftEye.scale.set(dna.eyeScaleL, dna.eyeOvalY * dna.eyeOvalL, dna.eyeSquashZ);
  leftEye.rotation.order = "XYZ";
  leftEye.rotation.x = dna.eyeRotX;
  leftEye.rotation.z = dna.eyeTilt + dna.eyeTiltAsym;
  const rightEye = buildEyeGroup(dna, dna.eyeIrisHueShiftR, true);
  rightEye.position.set(eyeXR, eyeYR, ezR);
  rightEye.scale.set(
    dna.eyeScaleR,
    dna.eyeOvalY * dna.eyeOvalR,
    dna.eyeSquashZ,
  );
  rightEye.rotation.order = "XYZ";
  rightEye.rotation.x = dna.eyeRotX;
  rightEye.rotation.z = -dna.eyeTilt + dna.eyeTiltAsym;

  body.add(leftEye, rightEye);

  const mouthY =
    eyeY0 - dna.mouthDrop + dna.mouthLift - Math.max(0.038, dna.eyeSize * 0.11);
  const mouthMz =
    surfaceZ(rx, ry, rz, 0, mouthY) +
    dna.eyeSize * 0.44 +
    dna.mouthZPuff +
    dna.mouthForward +
    Math.max(rz, ry) * 0.06 +
    0.052;
  const mouthCol = hsl(dna.mouthHue, dna.mouthSat, dna.mouthLight);
  const mouthMat = new THREE.MeshStandardMaterial({
    color: mouthCol,
    roughness: 0.26,
    metalness: 0.05,
    emissive: mouthCol.clone().multiplyScalar(0.12),
    emissiveIntensity: 0.16,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    side: THREE.DoubleSide,
  });
  const lipR = THREE.MathUtils.clamp(dna.mouthWidth * 0.175, 0.009, 0.032);
  const lipAlong = dna.mouthWidth * 0.96;
  const lipCyl = Math.max(lipAlong - 2 * lipR, 0.016);
  const lipInner = new THREE.CapsuleGeometry(lipR, lipCyl, 6, 16);
  const lipOuter = new THREE.CapsuleGeometry(
    lipR * 1.28,
    lipCyl + lipR * 0.2,
    5,
    12,
  );
  const outlineMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#1a050d"),
    polygonOffset: true,
    polygonOffsetFactor: -6,
    polygonOffsetUnits: -6,
    depthWrite: false,
  });
  const mouthNeutral = new THREE.Group();
  mouthNeutral.position.set(0, mouthY, mouthMz);
  mouthNeutral.renderOrder = 4;
  const lipOut = new THREE.Mesh(lipOuter, outlineMat);
  const lipIn = new THREE.Mesh(lipInner, mouthMat);
  const lipTilt = 0.09 + dna.mouthRotZ * 0.08;
  lipOut.rotation.set(lipTilt, 0, Math.PI / 2 + dna.mouthRotZ);
  lipOut.position.z = -0.007;
  lipIn.rotation.set(lipTilt, 0, Math.PI / 2 + dna.mouthRotZ);
  lipIn.position.z = 0.004;
  mouthNeutral.add(lipOut, lipIn);

  const smileR = dna.mouthWidth * 0.56;
  const arc = 0.58 * dna.mouthSmileArc;
  const mouthSmileMat = mouthMat.clone();
  const mouthSmile = new THREE.Mesh(
    new THREE.TorusGeometry(
      smileR,
      dna.mouthTube * 1.38,
      12,
      40,
      -Math.PI * arc,
      Math.PI * arc,
    ),
    mouthSmileMat,
  );
  mouthSmile.position.set(0, mouthY - 0.018, mouthMz + 0.018);
  mouthSmile.rotation.set(Math.PI * 0.5, 0.06, Math.PI + dna.mouthRotZ);
  mouthSmile.renderOrder = 4;

  const sleepyLine = dna.mouthWidth * 0.62;
  const sleepyTube = 0.0058;
  const sleepyCyl = Math.max(sleepyLine - 2 * sleepyTube, 0.024);
  const sleepyMouthMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#4a3d52"),
    roughness: 0.78,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const mouthSleepy = new THREE.Mesh(
    new THREE.CapsuleGeometry(sleepyTube, sleepyCyl, 4, 12),
    sleepyMouthMat,
  );
  mouthSleepy.rotation.set(0.06, 0, Math.PI / 2 + dna.mouthRotZ * 0.25);
  mouthSleepy.position.set(0, mouthY - 0.03, mouthMz + 0.014);
  mouthSleepy.renderOrder = 4;

  mouthNeutral.visible = true;
  mouthSmile.visible = false;
  mouthSleepy.visible = false;
  body.add(mouthNeutral, mouthSmile, mouthSleepy);

  const sleepyEyelids = new THREE.Group();
  sleepyEyelids.visible = false;
  body.add(sleepyEyelids);

  const bellyMat = new THREE.MeshStandardMaterial({
    color: glowEdge,
    emissive: glowEdge.clone().multiplyScalar(1.8),
    emissiveIntensity: 0.9,
    roughness: 0.35,
    transparent: true,
    opacity: 0.92,
  });
  const bellyGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), bellyMat);
  bellyGlow.position.set(0, bb.min.y + (bb.max.y - bb.min.y) * 0.28, rz * 0.72);
  bellyGlow.visible = false;
  body.add(bellyGlow);

  root.add(body);

  return {
    root,
    body,
    bodyCore,
    blobMesh,
    leftEye,
    rightEye,
    sleepyEyelids,
    mouthNeutral,
    mouthSmile,
    mouthSleepy,
    bellyGlow,
    armLMesh,
    armRMesh,
    footLMesh,
    footRMesh,
    dispose: () => disposeGroup(root),
  };
}
