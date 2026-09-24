import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import { createScene, createShot } from "@/domain/factories";
import { processStaleShot } from "./thumbnail-render";

// processStaleShot's own render/store failure handling is the thing under
// test here, not rendering itself, so thumbnails.ts (which needs a real
// WebGL context) and blob-store.ts (which needs a real IndexedDB write) are
// both replaced with fakes: renderShotPixels/pixelsToPngBlob succeed
// trivially, and putBlob rejects the way WebKit's ephemeral IndexedDB does
// for a stored Blob value.
vi.mock("@/viewport/thumbnails", () => ({
  renderShotPixels: vi.fn(() => ({ pixels: new Uint8Array(4), width: 1, height: 1 })),
  pixelsToPngBlob: vi.fn(async () => new Blob(["thumb"], { type: "image/png" })),
}));

vi.mock("@/storage/blob-store", () => ({
  putBlob: vi.fn(async () => {
    throw new Error("UnknownError: Error preparing Blob/File data to be stored in object store.");
  }),
  deleteBlob: vi.fn(async () => {}),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("processStaleShot", () => {
  it("does not reject when putBlob fails, and leaves the shot without committing a new thumbnail", async () => {
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
});
