import { describe, expect, it } from "vitest";
import { cameraAt, resolveObjects } from "@/stage/resolve";
import type { Stage, ShotCamera, ShotOverrides, StageObject } from "@/stage/types";

function makeStage(objects: StageObject[]): Stage {
  return { v: 1, objects };
}

const BOX: StageObject = {
  id: "obj_1",
  name: "Table",
  kind: "primitive",
  shape: "box",
  color: "#ff0000",
  transform: { position: [0, 0, 0], rotationY: 0, scale: 1 },
};

const DOLL: StageObject = {
  id: "obj_2",
  name: "Actor",
  kind: "doll",
  color: "#00ff00",
  transform: { position: [1, 0, 1], rotationY: 90, scale: 1 },
  pose: "stand",
};

describe("resolveObjects", () => {
  it("returns stage defaults unchanged when overrides are empty", () => {
    const stage = makeStage([BOX, DOLL]);
    const overrides: ShotOverrides = { v: 1, objects: {} };
    const result = resolveObjects(stage, overrides);
    expect(result).toEqual([BOX, DOLL]);
  });

  it("replaces transform and pose per override precedence", () => {
    const stage = makeStage([DOLL]);
    const overrides: ShotOverrides = {
      v: 1,
      objects: {
        obj_2: {
          transform: { position: [5, 0, 5], rotationY: 180, scale: 2 },
          pose: "run",
        },
      },
    };
    const result = resolveObjects(stage, overrides);
    expect(result).toHaveLength(1);
    expect(result[0].transform).toEqual({ position: [5, 0, 5], rotationY: 180, scale: 2 });
    expect(result[0].pose).toBe("run");
    // untouched fields survive
    expect(result[0].name).toBe("Actor");
    expect(result[0].color).toBe("#00ff00");
  });

  it("drops an object entirely when overridden with visible: false", () => {
    const stage = makeStage([BOX, DOLL]);
    const overrides: ShotOverrides = {
      v: 1,
      objects: { obj_1: { visible: false } },
    };
    const result = resolveObjects(stage, overrides);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("obj_2");
  });

  it("ignores overrides for unknown object ids", () => {
    const stage = makeStage([BOX]);
    const overrides: ShotOverrides = {
      v: 1,
      objects: { obj_does_not_exist: { pose: "sit" } },
    };
    const result = resolveObjects(stage, overrides);
    expect(result).toEqual([BOX]);
  });

  it("does not mutate the stage or overrides inputs", () => {
    const stage = makeStage([DOLL]);
    const overrides: ShotOverrides = {
      v: 1,
      objects: {
        obj_2: {
          transform: { position: [9, 9, 9], rotationY: 45, scale: 3 },
        },
      },
    };
    const stageBefore = JSON.parse(JSON.stringify(stage));
    const overridesBefore = JSON.parse(JSON.stringify(overrides));

    resolveObjects(stage, overrides);

    expect(stage).toEqual(stageBefore);
    expect(overrides).toEqual(overridesBefore);
  });

  it("applies pose-only override without touching transform", () => {
    const stage = makeStage([DOLL]);
    const overrides: ShotOverrides = {
      v: 1,
      objects: { obj_2: { pose: "crouch" } },
    };
    const result = resolveObjects(stage, overrides);
    expect(result[0].pose).toBe("crouch");
    expect(result[0].transform).toEqual(DOLL.transform);
  });

  it("returns independently-owned objects: mutating a result's transform does not affect the stage or overrides", () => {
    const stage = makeStage([BOX, DOLL]);
    const overrides: ShotOverrides = {
      v: 1,
      objects: { obj_2: { transform: { position: [5, 0, 5], rotationY: 180, scale: 2 } } },
    };
    const result = resolveObjects(stage, overrides);

    // no-override path (BOX) and override path (DOLL) both get mutated
    result[0].transform.position[0] = 999;
    result[1].transform.position[0] = 999;

    expect(stage.objects[0].transform.position[0]).toBe(0);
    expect(stage.objects[1].transform.position[0]).toBe(1);
    expect(overrides.objects.obj_2!.transform!.position[0]).toBe(5);
  });
});

describe("cameraAt", () => {
  const camera: ShotCamera = {
    v: 1,
    lensMm: 35,
    start: { position: [0, 0, 0], aim: [0, 0, -1] },
    end: { position: [10, 20, 30], aim: [10, 0, -1] },
  };

  it("returns start framing at t=0", () => {
    expect(cameraAt(camera, 0)).toEqual(camera.start);
  });

  it("returns end framing at t=1", () => {
    expect(cameraAt(camera, 1)).toEqual(camera.end);
  });

  it("linearly interpolates position and aim at t=0.5", () => {
    const result = cameraAt(camera, 0.5);
    expect(result.position).toEqual([5, 10, 15]);
    expect(result.aim).toEqual([5, 0, -1]);
  });

  it("clamps t below 0 to the start framing", () => {
    expect(cameraAt(camera, -1)).toEqual(camera.start);
  });

  it("clamps t above 1 to the end framing", () => {
    expect(cameraAt(camera, 2)).toEqual(camera.end);
  });
});
