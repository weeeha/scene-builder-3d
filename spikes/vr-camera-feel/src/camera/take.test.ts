import { describe, expect, it } from "vitest";
import { yawQuat, type CameraPose } from "./pose";
import { durationOf, makeTake, parseTake, poseAt, pushSample, sampleCount, serializeTake, type Take } from "./take";

function twoSamples(): number[] {
  const samples: number[] = [];
  pushSample(samples, 0, { position: [0, 1, 0], rotation: yawQuat(0) });
  pushSample(samples, 1, { position: [2, 1, 0], rotation: yawQuat(90) });
  return samples;
}

function expectPoseClose(actual: CameraPose, expected: CameraPose): void {
  for (let i = 0; i < 3; i++) expect(actual.position[i]).toBeCloseTo(expected.position[i], 6);
  for (let i = 0; i < 4; i++) expect(actual.rotation[i]).toBeCloseTo(expected.rotation[i], 6);
}

function exampleTake(samples: number[] = twoSamples()): Take {
  return makeTake({ id: "take-1-1000", number: 1, createdAt: 1000, lensMm: 35, smoothing: 0.33, samples });
}

describe("sampling", () => {
  it("counts samples and reports the duration as the last timestamp", () => {
    expect(sampleCount(twoSamples())).toBe(2);
    expect(durationOf(twoSamples())).toBe(1);
    expect(durationOf([])).toBe(0);
  });
});

describe("poseAt", () => {
  it("returns a sample exactly at its timestamp", () => {
    expectPoseClose(poseAt(twoSamples(), 0), { position: [0, 1, 0], rotation: yawQuat(0) });
    expectPoseClose(poseAt(twoSamples(), 1), { position: [2, 1, 0], rotation: yawQuat(90) });
  });

  it("lerps position and slerps rotation between samples", () => {
    expectPoseClose(poseAt(twoSamples(), 0.5), { position: [1, 1, 0], rotation: yawQuat(45) });
  });

  it("clamps before the first and after the last sample", () => {
    expectPoseClose(poseAt(twoSamples(), -3), { position: [0, 1, 0], rotation: yawQuat(0) });
    expectPoseClose(poseAt(twoSamples(), 9), { position: [2, 1, 0], rotation: yawQuat(90) });
  });

  it("finds the right interval when sample times are uneven", () => {
    const samples: number[] = [];
    pushSample(samples, 0, { position: [0, 0, 0], rotation: yawQuat(0) });
    pushSample(samples, 0.1, { position: [1, 0, 0], rotation: yawQuat(0) });
    pushSample(samples, 1, { position: [3, 0, 0], rotation: yawQuat(0) });
    expectPoseClose(poseAt(samples, 0.55), { position: [2, 0, 0], rotation: yawQuat(0) });
  });

  it("throws on an empty take", () => {
    expect(() => poseAt([], 0)).toThrow("Take has no samples");
  });
});

describe("makeTake", () => {
  it("fills the fixed spike fields and the duration", () => {
    const take = exampleTake();
    expect(take).toMatchObject({
      v: 1, id: "take-1-1000", number: 1, createdAt: 1000, bodyId: "full-frame", formatId: "21:9",
      lensMm: 35, rig: { rig: "handheld", smoothing: 0.33 }, durationSec: 1,
    });
    expect(take.move.kind).toBe("path");
  });
});

describe("serializeTake and parseTake", () => {
  it("round-trips a take within one millionth", () => {
    const take = exampleTake();
    const parsed = parseTake(serializeTake(take));
    expect(parsed.id).toBe(take.id);
    expect(parsed.lensMm).toBe(35);
    expect(parsed.move.samples).toHaveLength(take.move.samples.length);
    parsed.move.samples.forEach((n, i) => expect(n).toBeCloseTo(take.move.samples[i], 6));
  });

  it("keeps a 900-sample take under 120000 characters", () => {
    const samples: number[] = [];
    for (let i = 0; i < 900; i++) {
      pushSample(samples, i / 90, { position: [Math.sin(i) * 3, 1.5 + Math.cos(i) * 0.2, -3 + Math.sin(i / 7)], rotation: yawQuat(i / 5) });
    }
    expect(serializeTake(exampleTake(samples)).length).toBeLessThan(120000);
  });

  it("rejects input that is not a playable take", () => {
    const good = JSON.parse(serializeTake(exampleTake()));
    const bad: unknown[] = [
      "this is not json",
      JSON.stringify({ ...good, v: 2 }),
      JSON.stringify({ ...good, id: "../x" }),
      JSON.stringify({ ...good, move: { kind: "framings" } }),
      JSON.stringify({ ...good, move: { kind: "path", samples: [0, 1, 2, 3, 4, 5, 6, 7, 8] } }),
      JSON.stringify({ ...good, move: { kind: "path", samples: [0, 0, 0, 0, 0, 0, 0, null] } }),
      JSON.stringify({ ...good, lensMm: 0 }),
    ];
    for (const json of bad) {
      expect(() => parseTake(json as string)).toThrow(/^Invalid take:/);
    }
  });
});
