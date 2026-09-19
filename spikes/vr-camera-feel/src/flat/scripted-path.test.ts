import { describe, expect, it } from "vitest";
import { forwardOf } from "../camera/pose";
import { SET_CENTER } from "../constants";
import { scriptedHandPose } from "./scripted-path";

describe("scriptedHandPose", () => {
  it.each([0, 5, 13])("orbits 3 m from the set centre at 1.5 m height (t = %d s)", (t) => {
    const pose = scriptedHandPose(t);
    const dx = pose.position[0] - SET_CENTER[0];
    const dz = pose.position[2] - SET_CENTER[2];
    expect(Math.hypot(dx, dz)).toBeCloseTo(3, 6);
    expect(pose.position[1]).toBeCloseTo(1.5, 6);
  });

  it.each([0, 5, 13])("always looks at the doll's chest (t = %d s)", (t) => {
    const pose = scriptedHandPose(t);
    const toTarget = [SET_CENTER[0] - pose.position[0], 1.2 - pose.position[1], SET_CENTER[2] - pose.position[2]];
    const length = Math.hypot(toTarget[0], toTarget[1], toTarget[2]);
    const forward = forwardOf(pose.rotation);
    const dot = (forward[0] * toTarget[0] + forward[1] * toTarget[1] + forward[2] * toTarget[2]) / length;
    expect(dot).toBeGreaterThan(0.999);
  });
});
