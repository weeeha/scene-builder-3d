// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createPrimitive, createScene, createShot } from "@/domain/factories";
import { hashShotState, stableStringify } from "@/domain/hash";
import type { PropAsset, PropObject, Scene, Vec3 } from "@/domain/types";

describe("stableStringify", () => {
  it("sorts object keys recursively but preserves array order", () => {
    const a = { b: 1, a: 2, c: { z: 1, y: 2 } };
    const b = { c: { y: 2, z: 1 }, a: 2, b: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("preserves array element order", () => {
    const value = { list: [3, 1, 2] };
    expect(stableStringify(value)).toContain("[3,1,2]");
  });
});

function withObjects(scene: Scene, objects: Scene["set"]["objects"]): Scene {
  return { ...scene, set: { objects } };
}

describe("hashShotState", () => {
  it("is stable across key order in the inputs", async () => {
    const box = createPrimitive("box");
    const sceneA: Scene = { id: "s1", name: "Set", notes: "", set: { objects: [box] }, shots: [] };
    const sceneB: Scene = { notes: "", id: "s1", set: { objects: [box] }, name: "Set", shots: [] };
    const shot = createShot("Shot 01");

    const hashA = await hashShotState(sceneA, shot);
    const hashB = await hashShotState(sceneB, shot);
    expect(hashA).toBe(hashB);
  });

  it("returns a 64-character hex sha-256 digest", async () => {
    const scene = withObjects(createScene("Set"), [createPrimitive("box")]);
    const shot = createShot("Shot 01");
    const hash = await hashShotState(scene, shot);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when an object's transform changes", async () => {
    const box = createPrimitive("box");
    const scene = withObjects(createScene("Set"), [box]);
    const shot = createShot("Shot 01");
    const before = await hashShotState(scene, shot);

    const movedBox = { ...box, transform: { ...box.transform, position: [1, 0, 0] as Vec3 } };
    const after = await hashShotState(withObjects(scene, [movedBox]), shot);
    expect(after).not.toBe(before);
  });

  it("changes when the camera changes", async () => {
    const scene = withObjects(createScene("Set"), [createPrimitive("box")]);
    const shot = createShot("Shot 01");
    const before = await hashShotState(scene, shot);

    const changedShot = { ...shot, camera: { ...shot.camera, lensMm: 50 } };
    const after = await hashShotState(scene, changedShot);
    expect(after).not.toBe(before);
  });

  it("changes when durationSec changes", async () => {
    const scene = withObjects(createScene("Set"), [createPrimitive("box")]);
    const shot = createShot("Shot 01");
    const before = await hashShotState(scene, shot);

    const changedShot = { ...shot, durationSec: 8 };
    const after = await hashShotState(scene, changedShot);
    expect(after).not.toBe(before);
  });

  it("does not change when an object is renamed", async () => {
    const box = createPrimitive("box");
    const scene = withObjects(createScene("Set"), [box]);
    const shot = createShot("Shot 01");
    const before = await hashShotState(scene, shot);

    const renamedBox = { ...box, name: "Renamed box" };
    const after = await hashShotState(withObjects(scene, [renamedBox]), shot);
    expect(after).toBe(before);
  });

  it("does not change when the shot is renamed or scene notes change", async () => {
    const scene = withObjects(createScene("Set"), [createPrimitive("box")]);
    const shot = createShot("Shot 01");
    const before = await hashShotState(scene, shot);

    const renamedShot = { ...shot, name: "Renamed shot" };
    const notedScene = { ...scene, notes: "Remember the getaway car." };
    const after = await hashShotState(notedScene, renamedShot);
    expect(after).toBe(before);
  });

  it("changes when a prop's assetId changes", async () => {
    const propA: PropObject = {
      id: "obj_1",
      name: "Prop",
      kind: "prop",
      assetId: "asset_a",
      transform: { position: [0, 0, 0], rotationY: 0, scale: 1 },
      visible: true,
    };
    const propB: PropObject = { ...propA, assetId: "asset_b" };
    const shot = createShot("Shot 01");
    const assets: PropAsset[] = [
      { id: "asset_a", name: "Chair", tags: [], source: "kit", bounds: [1, 1, 1], unitScale: 1 },
      { id: "asset_b", name: "Table", tags: [], source: "kit", bounds: [1, 1, 1], unitScale: 1 },
    ];

    const hashA = await hashShotState(withObjects(createScene("Set"), [propA]), shot, assets);
    const hashB = await hashShotState(withObjects(createScene("Set"), [propB]), shot, assets);
    expect(hashA).not.toBe(hashB);
  });

  it("changes when the matching asset's unitScale changes", async () => {
    const prop: PropObject = {
      id: "obj_1",
      name: "Prop",
      kind: "prop",
      assetId: "asset_a",
      transform: { position: [0, 0, 0], rotationY: 0, scale: 1 },
      visible: true,
    };
    const scene = withObjects(createScene("Set"), [prop]);
    const shot = createShot("Shot 01");
    const assetsBefore: PropAsset[] = [
      { id: "asset_a", name: "Chair", tags: [], source: "kit", bounds: [1, 1, 1], unitScale: 1 },
    ];
    const assetsAfter: PropAsset[] = [
      { id: "asset_a", name: "Chair", tags: [], source: "kit", bounds: [1, 1, 1], unitScale: 1.5 },
    ];

    const before = await hashShotState(scene, shot, assetsBefore);
    const after = await hashShotState(scene, shot, assetsAfter);
    expect(before).not.toBe(after);
  });
});
