import { describe, expect, it } from "vitest";
import { measureJitter } from "./jitter";
import { yawQuat } from "./pose";
import { pushSample } from "./take";

describe("measureJitter", () => {
  it("returns zeros for an empty capture", () => {
    expect(measureJitter([])).toEqual({ angularRmsDeg: 0, positionRmsMm: 0, sampleCount: 0 });
  });

  it("returns zero jitter for a perfectly still camera", () => {
    const samples: number[] = [];
    for (let i = 0; i < 100; i++) pushSample(samples, i / 72, { position: [0, 1.5, 0], rotation: yawQuat(20) });
    const result = measureJitter(samples);
    expect(result.sampleCount).toBe(100);
    expect(result.angularRmsDeg).toBeCloseTo(0, 4);
    expect(result.positionRmsMm).toBeCloseTo(0, 6);
  });

  it("reports half a degree for a look direction shaking half a degree each way", () => {
    const samples: number[] = [];
    for (let i = 0; i < 100; i++) pushSample(samples, i / 72, { position: [0, 1.5, 0], rotation: yawQuat(i % 2 === 0 ? 0.5 : -0.5) });
    expect(measureJitter(samples).angularRmsDeg).toBeCloseTo(0.5, 3);
  });

  it("reports one millimetre for a position shaking one millimetre each way", () => {
    const samples: number[] = [];
    for (let i = 0; i < 100; i++) pushSample(samples, i / 72, { position: [i % 2 === 0 ? 0.001 : -0.001, 1.5, 0], rotation: yawQuat(0) });
    expect(measureJitter(samples).positionRmsMm).toBeCloseTo(1, 3);
  });
});
