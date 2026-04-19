import { createNoise3D } from "simplex-noise";
import type { NoiseFunction3D } from "simplex-noise";
import { createSeededRandom } from "@/lib/mascot-dna";
import type { MascotDNA } from "@/lib/mascot-dna";

const SURFACE_NOISE_OCTAVES = 2;

export function createMascotSurfaceNoise3D(familyId: string): NoiseFunction3D {
  return createNoise3D(createSeededRandom(`${familyId}\0nibbo-surface-noise`));
}

export function sampleMascotSurfaceFbm(
  noise: NoiseFunction3D,
  nx: number,
  ny: number,
  nz: number,
  dna: MascotDNA
): number {
  let sum = 0;
  let weight = 1;
  let freq = dna.surfaceNoiseFreq;
  let norm = 0;
  for (let o = 0; o < SURFACE_NOISE_OCTAVES; o += 1) {
    sum += weight * noise(nx * freq, ny * freq, nz * freq);
    norm += weight;
    weight *= dna.surfaceNoisePersistence;
    freq *= dna.surfaceNoiseLacunarity;
  }
  return norm > 0 ? sum / norm : 0;
}
