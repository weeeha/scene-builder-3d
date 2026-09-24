import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import { renderShotPixels } from "./thumbnails";
import type { Framing } from "@/domain/types";

// renderShotPixels only needs an object structurally shaped like a
// WebGLRenderer (getRenderTarget/setRenderTarget/render/readRenderTargetPixels),
// so this exercises the render-target restore/dispose behavior without a
// real WebGL context: gl.render is stubbed to throw, standing in for a
// shader compile failure or a lost context.
function makeThrowingGl(previousTarget: THREE.WebGLRenderTarget) {
  return {
    getRenderTarget: vi.fn(() => previousTarget),
    setRenderTarget: vi.fn(),
    render: vi.fn(() => {
      throw new Error("shader compile failure");
    }),
    readRenderTargetPixels: vi.fn(),
  } as unknown as THREE.WebGLRenderer;
}

const framing: Framing = { position: [0, 1.6, 6], aim: [0, 1, 0] };

describe("renderShotPixels", () => {
  it("restores the previous render target and disposes its own target even when render throws", () => {
    const previousTarget = new THREE.WebGLRenderTarget(1, 1);
    const gl = makeThrowingGl(previousTarget);
    const disposeSpy = vi.spyOn(THREE.WebGLRenderTarget.prototype, "dispose");

    expect(() => renderShotPixels(gl, new THREE.Scene(), framing, 35)).toThrow(
      "shader compile failure"
    );

    expect(gl.setRenderTarget).toHaveBeenLastCalledWith(previousTarget);
    expect(disposeSpy).toHaveBeenCalledTimes(1);

    disposeSpy.mockRestore();
  });
});
