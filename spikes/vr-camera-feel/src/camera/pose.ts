import { Quaternion, Vector3 } from "three";
import type { Vec3 } from "../stage/types.ts";

export type Quat = [number, number, number, number]; // x, y, z, w
export type CameraPose = { position: Vec3; rotation: Quat };

export const IDENTITY_POSE: CameraPose = { position: [0, 0, 0], rotation: [0, 0, 0, 1] };

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const qa = new Quaternion();
const qb = new Quaternion();
const fwd = new Vector3();

/** Spherical interpolation between two unit quaternions. The result is normalized. */
export function slerpQuat(a: Quat, b: Quat, t: number): Quat {
  qa.set(a[0], a[1], a[2], a[3]);
  qb.set(b[0], b[1], b[2], b[3]);
  qa.slerp(qb, t).normalize();
  return [qa.x, qa.y, qa.z, qa.w];
}

/** Direction a camera with this rotation looks along. three.js cameras look down -Z. */
export function forwardOf(rotation: Quat): Vec3 {
  qa.set(rotation[0], rotation[1], rotation[2], rotation[3]);
  fwd.set(0, 0, -1).applyQuaternion(qa);
  return [fwd.x, fwd.y, fwd.z];
}

/** Angle in degrees between two unit quaternions' forward directions. */
export function angleBetweenDeg(a: Quat, b: Quat): number {
  const fa = forwardOf(a);
  const fb = forwardOf(b);
  const dot = Math.min(1, Math.max(-1, fa[0] * fb[0] + fa[1] * fb[1] + fa[2] * fb[2]));
  return (Math.acos(dot) * 180) / Math.PI;
}

/** Unit quaternion for a rotation of `deg` degrees about the world Y axis (yaw). */
export function yawQuat(deg: number): Quat {
  const half = (deg * Math.PI) / 360;
  return [0, Math.sin(half), 0, Math.cos(half)];
}
