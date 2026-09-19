// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createDoll, createPrimitive, createProject, createScene, createShot } from "@/domain/factories";

describe("createProject", () => {
  it("creates a project with schemaVersion 1, empty scenes and props, and matching createdAt/updatedAt", () => {
    const project = createProject("Heist");
    expect(project.name).toBe("Heist");
    expect(project.schemaVersion).toBe(1);
    expect(project.scenes).toEqual([]);
    expect(project.props).toEqual([]);
    expect(project.createdAt).toBe(project.updatedAt);
    expect(project.lastExportedAt).toBeUndefined();
  });

  it("gives every project a unique id", () => {
    const a = createProject("A");
    const b = createProject("B");
    expect(a.id).not.toBe(b.id);
  });
});

describe("createScene", () => {
  it("creates a scene with empty notes, an empty set and no shots", () => {
    const scene = createScene("Warehouse");
    expect(scene.name).toBe("Warehouse");
    expect(scene.notes).toBe("");
    expect(scene.set).toEqual({ objects: [] });
    expect(scene.shots).toEqual([]);
  });
});

describe("createShot", () => {
  it("defaults lensMm 35, a single camera keyframe at [0, 1.6, 6] aimed at [0, 1, 0], and durationSec 4", () => {
    const shot = createShot("Shot 01");
    expect(shot.name).toBe("Shot 01");
    expect(shot.camera.lensMm).toBe(35);
    expect(shot.camera.position).toEqual([{ t: 0, value: [0, 1.6, 6] }]);
    expect(shot.camera.aim).toEqual([{ t: 0, value: [0, 1, 0] }]);
    expect(shot.durationSec).toBe(4);
    expect(shot.overrides).toEqual({});
  });

  it("gives every shot a unique id", () => {
    const a = createShot("Shot 01");
    const b = createShot("Shot 02");
    expect(a.id).not.toBe(b.id);
  });
});

describe("createPrimitive", () => {
  it("defaults a box to a 1 m cube", () => {
    const box = createPrimitive("box");
    expect(box.kind).toBe("primitive");
    expect(box.shape).toBe("box");
    expect(box.size).toEqual([1, 1, 1]);
    expect(box.visible).toBe(true);
    expect(box.transform).toEqual({ position: [0, 0, 0], rotationY: 0, scale: 1 });
  });

  it("defaults a cylinder and a sphere to a 1 m cube's size as well", () => {
    expect(createPrimitive("cylinder").size).toEqual([1, 1, 1]);
    expect(createPrimitive("sphere").size).toEqual([1, 1, 1]);
  });

  it("defaults a wall to [4, 2.5, 0.2]", () => {
    expect(createPrimitive("wall").size).toEqual([4, 2.5, 0.2]);
  });

  it("defaults a plane to [4, 0.02, 4]", () => {
    expect(createPrimitive("plane").size).toEqual([4, 0.02, 4]);
  });

  it("gives every primitive a unique id", () => {
    const a = createPrimitive("box");
    const b = createPrimitive("box");
    expect(a.id).not.toBe(b.id);
  });
});

describe("createDoll", () => {
  it("defaults to the stand pose, is visible, and sits at the origin", () => {
    const doll = createDoll();
    expect(doll.kind).toBe("doll");
    expect(doll.pose).toBe("stand");
    expect(doll.visible).toBe(true);
    expect(doll.transform).toEqual({ position: [0, 0, 0], rotationY: 0, scale: 1 });
  });
});
