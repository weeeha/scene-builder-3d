import { render } from "@testing-library/react";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { CubeCamera } from "three";
import { describe, expect, it, vi } from "vitest";

import { Lighting, StageCanvas } from "./StageCanvas";

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

describe("Lighting", () => {
  // drei's <Environment> re-captures its cube camera whenever its children
  // change identity, and each capture forces three to rebuild the PMREM
  // environment map on the next frame. The lighting never changes, yet it
  // re-renders with every stage render (every document edit). On software
  // WebGL (CI runners without a GPU) one PMREM rebuild costs seconds, which
  // pushed the S1 smoke test past its 30 s limit in Chromium.
  it("captures the environment once, not again on each re-render", async () => {
    const update = vi.spyOn(CubeCamera.prototype, "update").mockImplementation(() => {});
    try {
      const renderer = await ReactThreeTestRenderer.create(<Lighting />);
      expect(update).toHaveBeenCalledTimes(1);

      await renderer.update(<Lighting />);
      await renderer.update(<Lighting />);
      await renderer.update(<Lighting />);

      expect(update).toHaveBeenCalledTimes(1);
      await renderer.unmount();
    } finally {
      update.mockRestore();
    }
  });
});
