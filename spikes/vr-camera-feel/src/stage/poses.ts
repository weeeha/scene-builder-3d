import type { PoseName, Vec3 } from "@/stage/types";

/** Skeleton joints animated by a pose. Each maps to a Euler rotation [x, y, z] in radians. */
export type Joint =
  | "neck"
  | "shoulderL"
  | "shoulderR"
  | "elbowL"
  | "elbowR"
  | "hipL"
  | "hipR"
  | "kneeL"
  | "kneeR";

const HALF_PI = Math.PI / 2;

/**
 * Frozen-silhouette pose presets for the mannequin doll. Values are Euler
 * rotations in radians per joint. The x component is the primary swing/bend
 * axis (forward/back for limbs, flex for hips and knees).
 */
export const POSES: Record<PoseName, Record<Joint, Vec3>> = {
  stand: {
    neck: [0, 0, 0],
    shoulderL: [0, 0, 0],
    shoulderR: [0, 0, 0],
    elbowL: [0, 0, 0],
    elbowR: [0, 0, 0],
    hipL: [0, 0, 0],
    hipR: [0, 0, 0],
    kneeL: [0, 0, 0],
    kneeR: [0, 0, 0],
  },
  walk: {
    neck: [0, 0, 0],
    shoulderL: [0.5, 0, 0],
    shoulderR: [-0.5, 0, 0],
    elbowL: [0.25, 0, 0],
    elbowR: [0.25, 0, 0],
    hipL: [-0.4, 0, 0],
    hipR: [0.4, 0, 0],
    kneeL: [0.2, 0, 0],
    kneeR: [0.45, 0, 0],
  },
  run: {
    neck: [0.1, 0, 0],
    shoulderL: [0.9, 0, 0],
    shoulderR: [-0.9, 0, 0],
    elbowL: [0.9, 0, 0],
    elbowR: [0.9, 0, 0],
    hipL: [-0.7, 0, 0],
    hipR: [0.7, 0, 0],
    kneeL: [0.35, 0, 0],
    kneeR: [1.1, 0, 0],
  },
  sit: {
    neck: [0, 0, 0],
    shoulderL: [0, 0, 0],
    shoulderR: [0, 0, 0],
    elbowL: [0, 0, 0],
    elbowR: [0, 0, 0],
    hipL: [-HALF_PI, 0, 0],
    hipR: [-HALF_PI, 0, 0],
    kneeL: [HALF_PI, 0, 0],
    kneeR: [HALF_PI, 0, 0],
  },
  crouch: {
    neck: [0.15, 0, 0],
    shoulderL: [0.3, 0, 0],
    shoulderR: [0.3, 0, 0],
    elbowL: [0.5, 0, 0],
    elbowR: [0.5, 0, 0],
    hipL: [-1.0, 0, 0],
    hipR: [-1.0, 0, 0],
    kneeL: [1.8, 0, 0],
    kneeR: [1.8, 0, 0],
  },
  point: {
    neck: [0, 0, 0],
    shoulderL: [0, 0, 0],
    shoulderR: [-HALF_PI, 0, 0],
    elbowL: [0, 0, 0],
    elbowR: [0, 0, 0],
    hipL: [0, 0, 0],
    hipR: [0, 0, 0],
    kneeL: [0, 0, 0],
    kneeR: [0, 0, 0],
  },
};

/** Mannequin part dimensions in meters. Total standing height is ~1.75m. */
export const DOLL = {
  headRadius: 0.11,
  torso: { height: 0.55, radius: 0.14 },
  upperArm: { length: 0.3, radius: 0.045 },
  foreArm: { length: 0.27, radius: 0.04 },
  thigh: { length: 0.45, radius: 0.065 },
  shin: { length: 0.43, radius: 0.055 },
  hipHeight: 0.88,
};
