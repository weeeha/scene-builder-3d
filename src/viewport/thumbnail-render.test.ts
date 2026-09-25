import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import { createScene, createShot } from "@/domain/factories";
import { processStaleShot } from "./thumbnail-render";
import { renderShotPixels } from "@/viewport/thumbnails";
import { putBlob, deleteBlob } from "@/storage/blob-store";

// processStaleShot's own render/store failure handling is the thing under
// test here, not rendering itself, so thumbnails.ts (which needs a real
// WebGL context) and blob-store.ts (which needs a real IndexedDB write) are
// both replaced with fakes: renderShotPixels/pixelsToPngBlob succeed
// trivially by default, and individual tests override putBlob to reject
// the way WebKit's ephemeral IndexedDB does for a stored Blob value.
vi.mock("@/viewport/thumbnails", () => ({
  renderShotPixels: vi.fn(() => ({ pixels: new Uint8Array(4), width: 1, height: 1 })),
  pixelsToPngBlob: vi.fn(async () => new Blob(["thumb"], { type: "image/png" })),
}));

vi.mock("@/storage/blob-store", () => ({
  putBlob: vi.fn(async () => {}),
  deleteBlob: vi.fn(async () => {}),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("processStaleShot", () => {
  it("does not reject when putBlob fails, and leaves the shot without committing a new thumbnail", async () => {
    vi.mocked(putBlob).mockRejectedValueOnce(
      new Error("UnknownError: Error preparing Blob/File data to be stored in object store.")
    );
    const scene = createScene("Kitchen");
    const shot = createShot("Shot 01");
    scene.shots.push(shot);
    const applyTransient = vi.fn();

    await expect(
      processStaleShot({
        gl: {} as THREE.WebGLRenderer,
        scene3d: new THREE.Scene(),
        scene,
        shot,
        hash: "abc",
        projectId: "proj_1",
        sceneId: scene.id,
        applyTransient,
      })
    ).resolves.toBeUndefined();

    expect(applyTransient).not.toHaveBeenCalled();
  });

  it("does not render or write to storage when the project is read-only", async () => {
    const scene = createScene("Kitchen");
    const shot = createShot("Shot 01");
    scene.shots.push(shot);
    const applyTransient = vi.fn();

    await processStaleShot({
      gl: {} as THREE.WebGLRenderer,
      scene3d: new THREE.Scene(),
      scene,
      shot,
      hash: "abc",
      projectId: "proj_1",
      sceneId: scene.id,
      readOnly: true,
      applyTransient,
    });

    expect(renderShotPixels).not.toHaveBeenCalled();
    expect(putBlob).not.toHaveBeenCalled();
    expect(deleteBlob).not.toHaveBeenCalled();
    expect(applyTransient).not.toHaveBeenCalled();
  });
});
