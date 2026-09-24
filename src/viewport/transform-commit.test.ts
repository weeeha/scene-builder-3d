import { describe, expect, it } from "vitest";

import { editTargetFor, snapPosition } from "@/viewport/transform-commit";

describe("editTargetFor", () => {
  it("is always the set on the scene page, regardless of the write-target switch", () => {
    expect(editTargetFor("scene", "set", null)).toEqual({ kind: "set" });
    expect(editTargetFor("scene", "shot", "shot-1")).toEqual({ kind: "set" });
  });

  it("follows the write-target switch on the shot page", () => {
    expect(editTargetFor("shot", "shot", "shot-1")).toEqual({ kind: "shot", shotId: "shot-1" });
    expect(editTargetFor("shot", "set", "shot-1")).toEqual({ kind: "set" });
  });

  it("falls back to the set on the shot page if no shot id is available", () => {
    expect(editTargetFor("shot", "shot", null)).toEqual({ kind: "set" });
  });
});

describe("snapPosition", () => {
  it("snaps to the nearest step when enabled", () => {
    const snapped = snapPosition([0.4, 0.9, -0.3], 0.25, true);
    expect(snapped[0]).toBeCloseTo(0.5, 5);
    expect(snapped[1]).toBeCloseTo(1, 5);
    expect(snapped[2]).toBeCloseTo(-0.25, 5);
  });

  it("returns the position unchanged when disabled", () => {
    expect(snapPosition([0.4, 0.9, -0.3], 0.25, false)).toEqual([0.4, 0.9, -0.3]);
  });

  it("returns the position unchanged for a non-positive step", () => {
    expect(snapPosition([0.4, 0.9, -0.3], 0, true)).toEqual([0.4, 0.9, -0.3]);
  });
});
