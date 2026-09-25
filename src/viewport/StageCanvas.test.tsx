import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StageCanvas } from "./StageCanvas";

const captured = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock("@react-three/fiber", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@react-three/fiber")>();
  return {
    ...actual,
    Canvas: (props: Record<string, unknown>) => {
      captured.props = props;
      return null;
    },
  };
});

describe("StageCanvas", () => {
  // A continuous render loop redraws the whole stage every frame even when
  // nothing changed. On a machine without a GPU (CI runners, where Chromium
  // falls back to software WebGL) that starves the main thread and doubles
  // the S1 smoke test's run time. Rendering on demand draws only after a
  // prop change, a controls drag or a resize.
  it("renders on demand, not in a continuous loop", () => {
    render(<StageCanvas sceneId="scene-1" shotId={null} />);
    expect(captured.props?.frameloop).toBe("demand");
  });
});
