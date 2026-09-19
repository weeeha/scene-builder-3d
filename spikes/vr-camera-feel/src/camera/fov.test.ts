import { describe, expect, it } from "vitest";
import { FORMAT_21_9, FULL_FRAME, usedSensorHeightMm, vFovDeg, type FrameFormat } from "./fov";

describe("usedSensorHeightMm", () => {
  it("crops the sensor height when the format is wider than the sensor", () => {
    expect(usedSensorHeightMm(FULL_FRAME, FORMAT_21_9)).toBeCloseTo(15.4286, 3);
  });

  it("uses the full sensor height when the format is narrower than the sensor", () => {
    const fourByThree: FrameFormat = { id: "4:3", name: "4:3", aspect: 4 / 3 };
    expect(usedSensorHeightMm(FULL_FRAME, fourByThree)).toBe(24);
  });
});

describe("vFovDeg on full frame at 21:9", () => {
  const fixtures: [number, number][] = [
    [18, 46.4],
    [24, 35.64],
    [35, 24.86],
    [50, 17.54],
    [85, 10.37],
    [135, 6.54],
  ];

  it.each(fixtures)("%d mm gives %d degrees vertical", (lensMm, expected) => {
    expect(vFovDeg(lensMm, FULL_FRAME, FORMAT_21_9)).toBeCloseTo(expected, 1);
  });

  it("matches the lens-chart horizontal field of view for 35 mm on full frame", () => {
    const vFovRad = (vFovDeg(35, FULL_FRAME, FORMAT_21_9) * Math.PI) / 180;
    const hFovDeg = (2 * Math.atan(FORMAT_21_9.aspect * Math.tan(vFovRad / 2)) * 180) / Math.PI;
    expect(hFovDeg).toBeCloseTo(54.43, 1);
  });
});

describe("vFovDeg on a format narrower than the sensor", () => {
  it("50 mm on full frame at 4:3 uses the whole 24 mm height", () => {
    const fourByThree: FrameFormat = { id: "4:3", name: "4:3", aspect: 4 / 3 };
    expect(vFovDeg(50, FULL_FRAME, fourByThree)).toBeCloseTo(26.99, 1);
  });
});
