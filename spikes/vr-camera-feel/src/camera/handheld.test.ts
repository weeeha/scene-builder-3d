import { describe, expect, it } from "vitest";
import { HANDHELD_IMPLEMENTED, handheld } from "./handheld";
import { angleBetweenDeg, yawQuat, type CameraPose } from "./pose";

const START: CameraPose = { position: [0, 1.5, 0], rotation: yawQuat(0) };
const HAND: CameraPose = { position: [0.5, 1.5, 0], rotation: yawQuat(30) };

function distance(a: CameraPose, b: CameraPose): number {
  return Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]);
}

/** Steps the rig from START toward a hand held still at HAND and returns where the camera ends up. */
function run(hz: number, seconds: number, smoothing: number, onStep?: (pose: CameraPose) => void): CameraPose {
  let pose = START;
  const steps = Math.round(hz * seconds);
  for (let i = 0; i < steps; i++) {
    pose = handheld(HAND, pose, 1 / hz, smoothing);
    onStep?.(pose);
  }
  return pose;
}

/** Share of the way from START to HAND covered by one 1/72 s step. */
function progressInOneStep(smoothing: number): number {
  return distance(handheld(HAND, START, 1 / 72, smoothing), START) / distance(HAND, START);
}

describe("handheld, for any filter", () => {
  it("is welded to the hand when smoothing is 0", () => {
    expect(handheld(HAND, START, 1 / 72, 0)).toEqual(HAND);
  });

  it("converges on a hand that holds still", () => {
    const end = run(72, 5, 0.9);
    expect(distance(end, HAND)).toBeLessThan(0.005);
    expect(angleBetweenDeg(end.rotation, HAND.rotation)).toBeLessThan(0.5);
  });

  it("always returns a unit quaternion", () => {
    run(72, 3, 0.66, (pose) => {
      const r = pose.rotation;
      expect(Math.abs(Math.hypot(r[0], r[1], r[2], r[3]) - 1)).toBeLessThan(1e-6);
    });
  });

  it("feels the same at 72 Hz and 90 Hz", () => {
    const at72 = run(72, 0.5, 0.9);
    const at90 = run(90, 0.5, 0.9);
    expect(distance(at72, at90)).toBeLessThan(0.001);
    expect(angleBetweenDeg(at72.rotation, at90.rotation)).toBeLessThan(0.1);
  });
});

describe.skipIf(!HANDHELD_IMPLEMENTED)("handheld, with Nick's smoothing", () => {
  it("lags behind the hand when smoothing is heavy", () => {
    const progress = progressInOneStep(0.9);
    expect(progress).toBeGreaterThan(0.001);
    expect(progress).toBeLessThan(0.5);
  });

  it("lags more as smoothing grows", () => {
    expect(progressInOneStep(0.33)).toBeGreaterThan(progressInOneStep(0.66));
    expect(progressInOneStep(0.66)).toBeGreaterThan(progressInOneStep(0.9));
  });
});
