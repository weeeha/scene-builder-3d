import type { CameraPose } from "./pose.ts";
import { lerpVec3, slerpQuat } from "./pose.ts";

export const TAKE_STRIDE = 8; // t, px, py, pz, qx, qy, qz, qw

/** The spike's subset of the spec's Take (section 5.1): path moves on the handheld rig only. */
export type Take = {
  v: 1;
  id: string;
  number: number;
  createdAt: number;
  bodyId: string;
  formatId: string;
  lensMm: number;
  rig: { rig: "handheld"; smoothing: number };
  move: { kind: "path"; samples: number[] };
  durationSec: number;
};

export function sampleCount(samples: number[]): number {
  return Math.floor(samples.length / TAKE_STRIDE);
}

export function pushSample(samples: number[], tSec: number, pose: CameraPose): void {
  samples.push(tSec, pose.position[0], pose.position[1], pose.position[2],
    pose.rotation[0], pose.rotation[1], pose.rotation[2], pose.rotation[3]);
}

export function durationOf(samples: number[]): number {
  const n = sampleCount(samples);
  return n === 0 ? 0 : samples[(n - 1) * TAKE_STRIDE];
}

function readPose(samples: number[], i: number): CameraPose {
  const o = i * TAKE_STRIDE;
  return {
    position: [samples[o + 1], samples[o + 2], samples[o + 3]],
    rotation: [samples[o + 4], samples[o + 5], samples[o + 6], samples[o + 7]],
  };
}

/** Camera pose at tSec: clamps outside the take, lerps position and slerps rotation inside it. */
export function poseAt(samples: number[], tSec: number): CameraPose {
  const n = sampleCount(samples);
  if (n === 0) throw new Error("Take has no samples");
  if (tSec <= samples[0]) return readPose(samples, 0);
  const last = n - 1;
  if (tSec >= samples[last * TAKE_STRIDE]) return readPose(samples, last);
  let lo = 0;
  let hi = last; // invariant: t[lo] <= tSec < t[hi]
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid * TAKE_STRIDE] <= tSec) lo = mid;
    else hi = mid;
  }
  const t0 = samples[lo * TAKE_STRIDE];
  const t1 = samples[hi * TAKE_STRIDE];
  const u = t1 > t0 ? (tSec - t0) / (t1 - t0) : 0;
  const a = readPose(samples, lo);
  const b = readPose(samples, hi);
  return { position: lerpVec3(a.position, b.position, u), rotation: slerpQuat(a.rotation, b.rotation, u) };
}

export function makeTake(args: {
  id: string; number: number; createdAt: number; lensMm: number; smoothing: number; samples: number[];
}): Take {
  return {
    v: 1, id: args.id, number: args.number, createdAt: args.createdAt,
    bodyId: "full-frame", formatId: "21:9", lensMm: args.lensMm,
    rig: { rig: "handheld", smoothing: args.smoothing },
    move: { kind: "path", samples: args.samples },
    durationSec: durationOf(args.samples),
  };
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** JSON with numbers rounded to 6 decimals, which keeps a 10 s take under about 100 KB. */
export function serializeTake(take: Take): string {
  return JSON.stringify({ ...take, move: { kind: "path", samples: take.move.samples.map(round6) } });
}

function fail(reason: string): never {
  throw new Error("Invalid take: " + reason);
}

export function parseTake(json: string): Take {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { fail("not JSON"); }
  const t = raw as Partial<Take>;
  if (typeof t !== "object" || t === null) fail("not an object");
  if (t.v !== 1) fail("unsupported version");
  if (typeof t.id !== "string" || !/^[A-Za-z0-9_-]+$/.test(t.id)) fail("bad id");
  if (typeof t.number !== "number" || typeof t.createdAt !== "number") fail("bad number or createdAt");
  if (typeof t.lensMm !== "number" || !(t.lensMm > 0)) fail("bad lensMm");
  if (typeof t.bodyId !== "string" || typeof t.formatId !== "string") fail("bad body or format");
  if (!t.rig || t.rig.rig !== "handheld" || typeof t.rig.smoothing !== "number") fail("bad rig");
  if (!t.move || t.move.kind !== "path" || !Array.isArray(t.move.samples)) fail("bad move");
  const samples = t.move.samples;
  if (samples.length === 0 || samples.length % TAKE_STRIDE !== 0) fail("samples length");
  if (!samples.every((n) => typeof n === "number" && Number.isFinite(n))) fail("non-finite sample");
  if (typeof t.durationSec !== "number") fail("bad durationSec");
  return t as Take;
}
