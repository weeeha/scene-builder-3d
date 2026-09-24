import { describe, expect, it } from "vitest";
import { angleBetweenDeg, forwardOf, lerpVec3, slerpQuat, yawQuat, type Quat } from "./pose";

function expectQuatClose(actual: Quat, expected: Quat): void {
  for (let i = 0; i < 4; i++) expect(actual[i]).toBeCloseTo(expected[i], 6);
}

describe("lerpVec3", () => {
  it("returns the ends at t = 0 and t = 1 and the midpoint at t = 0.5", () => {
    expect(lerpVec3([0, 0, 0], [2, 4, -6], 0)).toEqual([0, 0, 0]);
    expect(lerpVec3([0, 0, 0], [2, 4, -6], 1)).toEqual([2, 4, -6]);
    expect(lerpVec3([0, 0, 0], [2, 4, -6], 0.5)).toEqual([1, 2, -3]);
  });
});

describe("slerpQuat", () => {
  it("returns the ends at t = 0 and t = 1", () => {
    expectQuatClose(slerpQuat(yawQuat(0), yawQuat(90), 0), yawQuat(0));
    expectQuatClose(slerpQuat(yawQuat(0), yawQuat(90), 1), yawQuat(90));
  });

  it("is yaw 45 halfway between yaw 0 and yaw 90", () => {
    expectQuatClose(slerpQuat(yawQuat(0), yawQuat(90), 0.5), yawQuat(45));
  });

  it("returns a unit quaternion", () => {
    const q = slerpQuat(yawQuat(10), yawQuat(170), 0.37);
    expect(Math.hypot(q[0], q[1], q[2], q[3])).toBeCloseTo(1, 9);
  });
});

describe("forwardOf", () => {
  it("looks down -Z for the identity rotation", () => {
    const f = forwardOf([0, 0, 0, 1]);
    expect(f[0]).toBeCloseTo(0, 6);
    expect(f[1]).toBeCloseTo(0, 6);
    expect(f[2]).toBeCloseTo(-1, 6);
  });

  it("looks down -X after a 90 degree yaw", () => {
    const f = forwardOf(yawQuat(90));
    expect(f[0]).toBeCloseTo(-1, 6);
    expect(f[1]).toBeCloseTo(0, 6);
    expect(f[2]).toBeCloseTo(0, 6);
  });
});

describe("angleBetweenDeg", () => {
  it("measures the angle between two look directions", () => {
    expect(angleBetweenDeg(yawQuat(0), yawQuat(10))).toBeCloseTo(10, 6);
    expect(angleBetweenDeg(yawQuat(25), yawQuat(25))).toBeCloseTo(0, 4);
  });
});
