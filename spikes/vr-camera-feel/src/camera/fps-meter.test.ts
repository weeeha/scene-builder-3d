import { describe, expect, it } from "vitest";
import { createFpsMeter, pushFrame, readFpsMeter, resetFpsMeter } from "./fps-meter";

describe("fps meter", () => {
  it("has no rolling fps before the first full second", () => {
    const m = createFpsMeter();
    for (let i = 0; i < 10; i++) pushFrame(m, 1 / 90);
    expect(readFpsMeter(m).recentFps).toBe(0);
  });

  // 100 frames, not 90: summing 1/90 ninety times can land a hair under 1.0,
  // which delays the one-second rollover by a frame.
  it("reports 90 fps average, rolling 90 fps and an 11.1 ms worst frame at a steady 90 Hz", () => {
    const m = createFpsMeter();
    for (let i = 0; i < 100; i++) pushFrame(m, 1 / 90);
    const read = readFpsMeter(m);
    expect(read.frames).toBe(100);
    expect(read.avgFps).toBeCloseTo(90, 5);
    expect(read.recentFps).toBeCloseTo(90, 5);
    expect(read.worstMs).toBeCloseTo(11.111, 2);
  });

  it("remembers the single worst frame", () => {
    const m = createFpsMeter();
    for (let i = 0; i < 50; i++) pushFrame(m, 1 / 90);
    pushFrame(m, 0.04);
    for (let i = 0; i < 50; i++) pushFrame(m, 1 / 90);
    expect(readFpsMeter(m).worstMs).toBeCloseTo(40, 6);
  });

  it("reset clears the since-reset numbers and keeps the rolling fps", () => {
    const m = createFpsMeter();
    for (let i = 0; i < 100; i++) pushFrame(m, 1 / 90);
    resetFpsMeter(m);
    const read = readFpsMeter(m);
    expect(read.frames).toBe(0);
    expect(read.avgFps).toBe(0);
    expect(read.worstMs).toBe(0);
    expect(read.recentFps).toBeCloseTo(90, 5);
  });
});
