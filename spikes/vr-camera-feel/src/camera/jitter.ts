import { forwardOf } from "./pose";
import { TAKE_STRIDE, sampleCount } from "./take";

export type JitterResult = { angularRmsDeg: number; positionRmsMm: number; sampleCount: number };

/** RMS deviation of the look direction (degrees) and of the position (mm) from their means. */
export function measureJitter(samples: number[]): JitterResult {
  const n = sampleCount(samples);
  if (n === 0) return { angularRmsDeg: 0, positionRmsMm: 0, sampleCount: 0 };
  const forwards: [number, number, number][] = [];
  const mean = [0, 0, 0];
  const meanPos = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const o = i * TAKE_STRIDE;
    const f = forwardOf([samples[o + 4], samples[o + 5], samples[o + 6], samples[o + 7]]);
    forwards.push(f);
    mean[0] += f[0]; mean[1] += f[1]; mean[2] += f[2];
    meanPos[0] += samples[o + 1]; meanPos[1] += samples[o + 2]; meanPos[2] += samples[o + 3];
  }
  const len = Math.hypot(mean[0], mean[1], mean[2]) || 1;
  mean[0] /= len; mean[1] /= len; mean[2] /= len;
  meanPos[0] /= n; meanPos[1] /= n; meanPos[2] /= n;
  let angSq = 0;
  let posSq = 0;
  for (let i = 0; i < n; i++) {
    const o = i * TAKE_STRIDE;
    const f = forwards[i];
    const dot = Math.min(1, Math.max(-1, f[0] * mean[0] + f[1] * mean[1] + f[2] * mean[2]));
    const deg = (Math.acos(dot) * 180) / Math.PI;
    angSq += deg * deg;
    const dx = samples[o + 1] - meanPos[0];
    const dy = samples[o + 2] - meanPos[1];
    const dz = samples[o + 3] - meanPos[2];
    posSq += dx * dx + dy * dy + dz * dz;
  }
  return { angularRmsDeg: Math.sqrt(angSq / n), positionRmsMm: Math.sqrt(posSq / n) * 1000, sampleCount: n };
}
