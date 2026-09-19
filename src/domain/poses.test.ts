// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DOLL, POSES } from "@/domain/poses";
import type { PoseName } from "@/domain/types";

const POSE_NAMES: PoseName[] = ["stand", "walk", "run", "sit", "crouch", "point"];
const JOINTS = [
  "neck",
  "shoulderL",
  "shoulderR",
  "elbowL",
  "elbowR",
  "hipL",
  "hipR",
  "kneeL",
  "kneeR",
] as const;

describe("POSES", () => {
  it("has exactly the six PoseName keys", () => {
    expect(Object.keys(POSES).sort()).toEqual([...POSE_NAMES].sort());
  });

  it("defines all 9 joints for every pose as [number,number,number]", () => {
    for (const poseName of POSE_NAMES) {
      const pose = POSES[poseName];
      for (const joint of JOINTS) {
        const value = pose[joint];
        expect(value, `${poseName}.${joint}`).toBeDefined();
        expect(value).toHaveLength(3);
        for (const component of value) {
          expect(typeof component).toBe("number");
        }
      }
    }
  });

  it("stand is all zeros", () => {
    for (const joint of JOINTS) {
      expect(POSES.stand[joint]).toEqual([0, 0, 0]);
    }
  });

  it("walk mirrors left/right for shoulders and hips (non-zero)", () => {
    const walk = POSES.walk;
    expect(walk.shoulderL[0]).not.toBe(0);
    expect(walk.shoulderL[0]).toBe(-walk.shoulderR[0]);
    expect(walk.hipL[0]).not.toBe(0);
    expect(walk.hipL[0]).toBe(-walk.hipR[0]);
  });

  it("run mirrors left/right for shoulders and hips (non-zero)", () => {
    const run = POSES.run;
    expect(run.shoulderL[0]).not.toBe(0);
    expect(run.shoulderL[0]).toBe(-run.shoulderR[0]);
    expect(run.hipL[0]).not.toBe(0);
    expect(run.hipL[0]).toBe(-run.hipR[0]);
  });

  it("sit bends hips and knees", () => {
    const sit = POSES.sit;
    expect(sit.hipL[0]).toBeLessThan(0);
    expect(sit.hipR[0]).toBeLessThan(0);
    expect(sit.kneeL[0]).toBeGreaterThan(0);
    expect(sit.kneeR[0]).toBeGreaterThan(0);
  });

  it("crouch bends hips and knees", () => {
    const crouch = POSES.crouch;
    expect(crouch.hipL[0]).toBeLessThan(0);
    expect(crouch.hipR[0]).toBeLessThan(0);
    expect(crouch.kneeL[0]).toBeGreaterThan(0);
    expect(crouch.kneeR[0]).toBeGreaterThan(0);
  });

  it("point raises the right arm forward", () => {
    const point = POSES.point;
    expect(point.shoulderR[0]).toBeLessThan(-1);
  });
});

describe("DOLL", () => {
  it("sums to a plausible total height around 1.75m", () => {
    const totalHeight =
      DOLL.hipHeight + DOLL.torso.height + DOLL.headRadius * 2 - 0.05;
    // hipHeight (0.88) + torso (0.55) + head (~0.22) roughly covers the body;
    // just sanity check the numbers are in a believable range.
    expect(totalHeight).toBeGreaterThan(1.4);
    expect(totalHeight).toBeLessThan(2.0);
  });

  it("matches the exact spec numbers", () => {
    expect(DOLL).toEqual({
      headRadius: 0.11,
      torso: { height: 0.55, radius: 0.14 },
      upperArm: { length: 0.3, radius: 0.045 },
      foreArm: { length: 0.27, radius: 0.04 },
      thigh: { length: 0.45, radius: 0.065 },
      shin: { length: 0.43, radius: 0.055 },
      hipHeight: 0.88,
    });
  });
});
