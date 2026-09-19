import { describe, expect, it } from "vitest";
import { createButtonEdge, createStickFlick } from "./edges";

describe("createButtonEdge", () => {
  it("fires only on the frame the button goes down", () => {
    const edge = createButtonEdge();
    const seen = [false, true, true, false, true].map((pressed) => edge(pressed));
    expect(seen).toEqual([false, true, false, false, true]);
  });
});

describe("createStickFlick", () => {
  it("fires once per flick and re-arms near the centre", () => {
    const flick = createStickFlick();
    const seen = [0, 0.5, 0.8, 0.9, 0.2, -0.75, -0.9, 0.1, 0.71].map((value) => flick(value));
    expect(seen).toEqual([0, 0, 1, 0, 0, -1, 0, 0, 1]);
  });

  it("does not fire again when the stick swings across without resting at the centre", () => {
    const flick = createStickFlick();
    expect([0.9, -0.9].map((value) => flick(value))).toEqual([1, 0]);
  });
});
