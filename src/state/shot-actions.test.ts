import { beforeEach, describe, expect, it } from "vitest";

import { createProject } from "@/domain/factories";
import type { Project } from "@/domain/types";
import {
  addScene,
  addShot,
  deleteScene,
  deleteShot,
  duplicateShot,
  moveShot,
  renameScene,
  setSceneNotes,
  setShotFraming,
  setShotLens,
  setShotThumb,
  updateShot,
} from "@/state/shot-actions";

let project: Project;

beforeEach(() => {
  project = createProject("Test");
});

describe("scene actions", () => {
  it("adds, renames, deletes a scene and sets its notes", () => {
    const sceneId = addScene(project, "Scene 1");
    expect(project.scenes).toHaveLength(1);
    expect(project.scenes[0].id).toBe(sceneId);
    expect(project.scenes[0].name).toBe("Scene 1");

    renameScene(project, sceneId, "Scene One");
    expect(project.scenes[0].name).toBe("Scene One");

    setSceneNotes(project, sceneId, "Opens on the porch.");
    expect(project.scenes[0].notes).toBe("Opens on the porch.");

    deleteScene(project, sceneId);
    expect(project.scenes).toHaveLength(0);
  });
});

describe("shot actions: create, duplicate, delete, move", () => {
  it("addShot appends with defaults and returns the id, names run Shot 01, Shot 02", () => {
    const sceneId = addScene(project, "Scene 1");
    const firstId = addShot(project, sceneId);
    const secondId = addShot(project, sceneId);
    const scene = project.scenes[0];

    expect(scene.shots.map((s) => s.id)).toEqual([firstId, secondId]);
    expect(scene.shots.map((s) => s.name)).toEqual(["Shot 01", "Shot 02"]);
    expect(scene.shots[0].camera.lensMm).toBe(35);
    expect(scene.shots[0].durationSec).toBe(4);
  });

  it("duplicateShot inserts right after the source with a new id, equal camera and overrides, and no thumb", () => {
    const sceneId = addScene(project, "Scene 1");
    const shotId = addShot(project, sceneId);
    const scene = project.scenes[0];
    const source = scene.shots[0];
    source.overrides["obj-1"] = { visible: false };
    source.thumb = { blobKey: "thumb:1", stateHash: "abc" };

    const copyId = duplicateShot(project, sceneId, shotId);

    expect(scene.shots.map((s) => s.id)).toEqual([shotId, copyId]);
    const copy = scene.shots[1];
    expect(copy.id).not.toBe(shotId);
    expect(copy.camera).toEqual(source.camera);
    expect(copy.camera).not.toBe(source.camera);
    expect(copy.overrides).toEqual(source.overrides);
    expect(copy.overrides).not.toBe(source.overrides);
    expect(copy.thumb).toBeUndefined();
  });

  it("deleteShot removes it", () => {
    const sceneId = addScene(project, "Scene 1");
    const shotId = addShot(project, sceneId);
    deleteShot(project, sceneId, shotId);
    expect(project.scenes[0].shots).toHaveLength(0);
  });

  it("moveShot reorders and clamps toIndex", () => {
    const sceneId = addScene(project, "Scene 1");
    const a = addShot(project, sceneId);
    const b = addShot(project, sceneId);
    const c = addShot(project, sceneId);

    moveShot(project, sceneId, a, 2);
    expect(project.scenes[0].shots.map((s) => s.id)).toEqual([b, c, a]);

    moveShot(project, sceneId, a, 99);
    expect(project.scenes[0].shots.map((s) => s.id)).toEqual([b, c, a]);

    moveShot(project, sceneId, c, -5);
    expect(project.scenes[0].shots.map((s) => s.id)).toEqual([c, b, a]);
  });
});

describe("shot actions: fields, framing, lens, thumb", () => {
  it("updateShot patches name, type and durationSec", () => {
    const sceneId = addScene(project, "Scene 1");
    const shotId = addShot(project, sceneId);
    updateShot(project, sceneId, shotId, { name: "Wide open", type: "WIDE", durationSec: 6 });
    const shot = project.scenes[0].shots[0];
    expect(shot.name).toBe("Wide open");
    expect(shot.type).toBe("WIDE");
    expect(shot.durationSec).toBe(6);
  });

  it("setShotFraming writes key 0 of both position and aim", () => {
    const sceneId = addScene(project, "Scene 1");
    const shotId = addShot(project, sceneId);
    setShotFraming(project, sceneId, shotId, { position: [1, 2, 3], aim: [0, 1, 0] });
    const shot = project.scenes[0].shots[0];
    expect(shot.camera.position[0]).toEqual({ t: 0, value: [1, 2, 3] });
    expect(shot.camera.aim[0]).toEqual({ t: 0, value: [0, 1, 0] });
    expect(shot.camera.position).toHaveLength(1);
    expect(shot.camera.aim).toHaveLength(1);
  });

  it("setShotLens clamps to 12 and 200", () => {
    const sceneId = addScene(project, "Scene 1");
    const shotId = addShot(project, sceneId);
    setShotLens(project, sceneId, shotId, 5);
    expect(project.scenes[0].shots[0].camera.lensMm).toBe(12);
    setShotLens(project, sceneId, shotId, 400);
    expect(project.scenes[0].shots[0].camera.lensMm).toBe(200);
    setShotLens(project, sceneId, shotId, 50);
    expect(project.scenes[0].shots[0].camera.lensMm).toBe(50);
  });

  it("setShotThumb records the blob key and state hash", () => {
    const sceneId = addScene(project, "Scene 1");
    const shotId = addShot(project, sceneId);
    setShotThumb(project, sceneId, shotId, { blobKey: "thumb:1:abc", stateHash: "abc" });
    expect(project.scenes[0].shots[0].thumb).toEqual({ blobKey: "thumb:1:abc", stateHash: "abc" });
  });
});
