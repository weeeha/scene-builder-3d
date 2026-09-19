// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createDoll, createPrimitive, createScene, createShot } from "@/domain/factories";
import { cameraAt, resolveScene, resolveSceneAll } from "@/domain/resolve";
import type { Scene, ShotCamera } from "@/domain/types";

function withObjects(scene: Scene, objects: Scene["set"]["objects"]): Scene {
  return { ...scene, set: { objects } };
}

describe("resolveScene", () => {
  it("keeps set order and returns the bare visible set when shot is null", () => {
    const box = createPrimitive("box");
    const doll = createDoll();
    const scene = withObjects(createScene("Set"), [box, doll]);

    const result = resolveScene(scene, null, 0);
    expect(result.map((o) => o.id)).toEqual([box.id, doll.id]);
  });

  it("a set-default-invisible object stays out of the bare set and out of a shot with no override for it", () => {
    const hidden = createPrimitive("box");
    hidden.visible = false;
    const scene = withObjects(createScene("Set"), [hidden]);
    const shot = createShot("Shot 01");

    expect(resolveScene(scene, null, 0)).toEqual([]);
    expect(resolveScene(scene, shot, 0)).toEqual([]);
  });

  it("a set-default-invisible object appears only in the shot whose override sets visible: true", () => {
    const hidden = createPrimitive("box");
    hidden.visible = false;
    const scene = withObjects(createScene("Set"), [hidden]);
    const shotWithOverride = createShot("Shot 01");
    shotWithOverride.overrides[hidden.id] = { visible: true };
    const otherShot = createShot("Shot 02");

    expect(resolveScene(scene, shotWithOverride, 0).map((o) => o.id)).toEqual([hidden.id]);
    expect(resolveScene(scene, otherShot, 0)).toEqual([]);
    expect(resolveScene(scene, null, 0)).toEqual([]);
  });

  it("an override with visible: false drops a default-visible object from just that shot", () => {
    const box = createPrimitive("box");
    const scene = withObjects(createScene("Set"), [box]);
    const shot = createShot("Shot 01");
    shot.overrides[box.id] = { visible: false };

    expect(resolveScene(scene, shot, 0)).toEqual([]);
    expect(resolveScene(scene, null, 0).map((o) => o.id)).toEqual([box.id]);
  });

  it("an override replaces transform for just that shot, leaving the set default and other shots untouched", () => {
    const box = createPrimitive("box");
    const scene = withObjects(createScene("Set"), [box]);
    const shot = createShot("Shot 01");
    const otherShot = createShot("Shot 02");
    shot.overrides[box.id] = { transform: { position: [5, 0, 5], rotationY: 90, scale: 2 } };

    expect(resolveScene(scene, shot, 0)[0].transform).toEqual({ position: [5, 0, 5], rotationY: 90, scale: 2 });
    expect(resolveScene(scene, otherShot, 0)[0].transform).toEqual(box.transform);
    expect(resolveScene(scene, null, 0)[0].transform).toEqual(box.transform);
  });

  it("an override replaces pose for a doll in just that shot", () => {
    const doll = createDoll();
    const scene = withObjects(createScene("Set"), [doll]);
    const shot = createShot("Shot 01");
    shot.overrides[doll.id] = { pose: "run" };

    const inShot = resolveScene(scene, shot, 0)[0];
    expect(inShot.kind).toBe("doll");
    if (inShot.kind === "doll") {
      expect(inShot.pose).toBe("run");
    }

    const inSet = resolveScene(scene, null, 0)[0];
    expect(inSet.kind).toBe("doll");
    if (inSet.kind === "doll") {
      expect(inSet.pose).toBe("stand");
    }
  });

  it("does not mutate the scene or shot inputs, and returns independently-owned transforms", () => {
    const box = createPrimitive("box");
    const scene = withObjects(createScene("Set"), [box]);
    const shot = createShot("Shot 01");
    shot.overrides[box.id] = { transform: { position: [9, 9, 9], rotationY: 0, scale: 1 } };
    const sceneBefore = JSON.parse(JSON.stringify(scene));
    const shotBefore = JSON.parse(JSON.stringify(shot));

    const result = resolveScene(scene, shot, 0);
    result[0].transform.position[0] = 999;

    expect(scene).toEqual(sceneBefore);
    expect(shot).toEqual(shotBefore);
  });
});

describe("resolveSceneAll", () => {
  it("keeps a default-visible object hidden by a visible: false override, marked visible: false", () => {
    const box = createPrimitive("box");
    const scene = withObjects(createScene("Set"), [box]);
    const shot = createShot("Shot 01");
    shot.overrides[box.id] = { visible: false };

    const result = resolveSceneAll(scene, shot, 0);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(box.id);
    expect(result[0].visible).toBe(false);
  });

  it("a default-invisible object with a visible: true override is visible only for that shot", () => {
    const hidden = createPrimitive("box");
    hidden.visible = false;
    const scene = withObjects(createScene("Set"), [hidden]);
    const shotA = createShot("Shot A");
    shotA.overrides[hidden.id] = { visible: true };
    const shotB = createShot("Shot B");

    expect(resolveSceneAll(scene, shotA, 0)[0].visible).toBe(true);
    expect(resolveSceneAll(scene, shotB, 0)[0].visible).toBe(false);
    expect(resolveSceneAll(scene, null, 0)[0].visible).toBe(false);
  });

  it("applies a transform override to a hidden object too", () => {
    const box = createPrimitive("box");
    const scene = withObjects(createScene("Set"), [box]);
    const shot = createShot("Shot 01");
    shot.overrides[box.id] = {
      visible: false,
      transform: { position: [5, 0, 5], rotationY: 90, scale: 2 },
    };

    const result = resolveSceneAll(scene, shot, 0);
    expect(result[0].visible).toBe(false);
    expect(result[0].transform).toEqual({ position: [5, 0, 5], rotationY: 90, scale: 2 });
  });

  it("returns exactly one entry per object in the set, regardless of visibility", () => {
    const visible = createPrimitive("box");
    const hidden = createPrimitive("wall");
    hidden.visible = false;
    const scene = withObjects(createScene("Set"), [visible, hidden]);
    const shot = createShot("Shot 01");

    expect(resolveSceneAll(scene, shot, 0)).toHaveLength(scene.set.objects.length);
    expect(resolveSceneAll(scene, null, 0)).toHaveLength(scene.set.objects.length);
  });

  it("resolveScene's output equals resolveSceneAll's output filtered to visible: true", () => {
    const visible = createPrimitive("box");
    const hidden = createPrimitive("wall");
    hidden.visible = false;
    const scene = withObjects(createScene("Set"), [visible, hidden]);
    const shot = createShot("Shot 01");
    shot.overrides[visible.id] = { visible: false };
    shot.overrides[hidden.id] = { visible: true };

    const all = resolveSceneAll(scene, shot, 0);
    const filtered = all.filter((o) => o.visible);
    expect(resolveScene(scene, shot, 0)).toEqual(filtered);
  });
});

describe("cameraAt", () => {
  function makeCamera(): ShotCamera {
    return {
      lensMm: 35,
      position: [
        { t: 0, value: [0, 0, 0] },
        { t: 2, value: [10, 20, 30] },
      ],
      aim: [
        { t: 0, value: [0, 0, -1] },
        { t: 2, value: [10, 0, -1] },
      ],
    };
  }

  it("returns a constant framing for a single key, regardless of t", () => {
    const camera: ShotCamera = {
      lensMm: 35,
      position: [{ t: 0, value: [1, 2, 3] }],
      aim: [{ t: 0, value: [0, 1, 0] }],
    };
    expect(cameraAt(camera, 0)).toEqual({ position: [1, 2, 3], aim: [0, 1, 0] });
    expect(cameraAt(camera, 5)).toEqual({ position: [1, 2, 3], aim: [0, 1, 0] });
  });

  it("linearly interpolates position and aim at the midpoint between two keys", () => {
    const camera = makeCamera();
    const result = cameraAt(camera, 1);
    expect(result.position).toEqual([5, 10, 15]);
    expect(result.aim).toEqual([5, 0, -1]);
  });

  it("clamps to the first key before its t", () => {
    const camera = makeCamera();
    expect(cameraAt(camera, -1)).toEqual({ position: [0, 0, 0], aim: [0, 0, -1] });
  });

  it("clamps to the last key after its t", () => {
    const camera = makeCamera();
    expect(cameraAt(camera, 10)).toEqual({ position: [10, 20, 30], aim: [10, 0, -1] });
  });
});
