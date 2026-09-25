// @vitest-environment node
import { describe, expect, it } from "vitest";
import { lensToVFovDeg, vFovToLensMm } from "@/domain/lens";

describe("lensToVFovDeg", () => {
  it("50mm gives ~27.0 degrees vertical FOV on a full-frame sensor", () => {
    expect(lensToVFovDeg(50)).toBeGreaterThan(27.0 - 0.5);
    expect(lensToVFovDeg(50)).toBeLessThan(27.0 + 0.5);
  });

  it("wider lenses (smaller mm) produce a larger vertical FOV", () => {
    expect(lensToVFovDeg(24)).toBeGreaterThan(lensToVFovDeg(50));
    expect(lensToVFovDeg(50)).toBeGreaterThan(lensToVFovDeg(85));
  });
});

describe("vFovToLensMm", () => {
  it.each([24, 35, 50, 85])("round-trips lensToVFovDeg -> vFovToLensMm for %dmm", (lensMm) => {
    const vFov = lensToVFovDeg(lensMm);
    const roundTripped = vFovToLensMm(vFov);
    expect(roundTripped).toBeCloseTo(lensMm, 9);
  });
});
