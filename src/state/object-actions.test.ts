import { beforeEach, describe, expect, it } from "vitest";

import { createDoll, createPrimitive, createProject, createScene, createShot } from "@/domain/factories";
import type { Project } from "@/domain/types";
import { setAutosaver, useDocumentStore } from "@/state/document-store";
import {
  addObject,
  deleteObject,
  type EditTarget,
  reconcileOnlyInShot,
  renameObject,
  updateObject,
} from "@/state/object-actions";

let project: Project;
let sceneId: string;

beforeEach(() => {
  project = createProject("Test");
  const scene = createScene("Scene 1");
  project.scenes.push(scene);
  sceneId = scene.id;
});

describe("addObject", () => {
  it("adds the object to the set as given, with no options", () => {
    const obj = createPrimitive("box");
    addObject(project, sceneId, obj);
    expect(project.scenes[0].set.objects).toEqual([obj]);
  });

  it("with onlyInShotId stores default visible false plus a visible true override in that shot only", () => {
    const scene = project.scenes[0];
    const shot1 = createShot("Shot 01");
    const shot2 = createShot("Shot 02");
    scene.shots.push(shot1, shot2);
    const obj = createPrimitive("box");

    addObject(project, sceneId, obj, { onlyInShotId: shot1.id });

    const stored = scene.set.objects.find((o) => o.id === obj.id)!;
    expect(stored.visible).toBe(false);
    expect(shot1.overrides[obj.id]).toEqual({ visible: true });
    expect(shot2.overrides[obj.id]).toBeUndefined();
  });
});

describe("updateObject", () => {
  it("with the set target edits defaults seen by a shot without an override", () => {
    const scene = project.scenes[0];
    const obj = createPrimitive("box");
    scene.set.objects.push(obj);
    const shot = createShot("Shot 01");
    scene.shots.push(shot);
    const newTransform = { position: [2, 0, 0] as const, rotationY: 0.5, scale: 1 };

    updateObject(project, sceneId, obj.id, { transform: { ...newTransform, position: [2, 0, 0] } }, { kind: "set" });

    expect(scene.set.objects[0].transform.position).toEqual([2, 0, 0]);
    expect(scene.shots[0].overrides[obj.id]).toBeUndefined();
  });

  it("with a shot target writes overrides[objectId] and leaves the set and other shots unchanged", () => {
    const scene = project.scenes[0];
    const obj = createPrimitive("box");
    const originalTransform = obj.transform;
    scene.set.objects.push(obj);
    const shot1 = createShot("Shot 01");
    const shot2 = createShot("Shot 02");
    scene.shots.push(shot1, shot2);
    const target: EditTarget = { kind: "shot", shotId: shot1.id };

    updateObject(project, sceneId, obj.id, { transform: { position: [5, 0, 0], rotationY: 0, scale: 1 } }, target);

    expect(scene.set.objects[0].transform).toEqual(originalTransform);
    expect(shot1.overrides[obj.id]).toEqual({ transform: { position: [5, 0, 0], rotationY: 0, scale: 1 } });
    expect(shot2.overrides[obj.id]).toBeUndefined();
  });

  it("merges patches into an existing override", () => {
    const scene = project.scenes[0];
    const obj = createPrimitive("box");
    scene.set.objects.push(obj);
    const shot = createShot("Shot 01");
    shot.overrides[obj.id] = { visible: false };
    scene.shots.push(shot);

    updateObject(project, sceneId, obj.id, { transform: { position: [1, 0, 0], rotationY: 0, scale: 1 } }, { kind: "shot", shotId: shot.id });

    expect(shot.overrides[obj.id]).toEqual({
      visible: false,
      transform: { position: [1, 0, 0], rotationY: 0, scale: 1 },
    });
  });
});

describe("renameObject", () => {
  it("renames the object in the set", () => {
    const scene = project.scenes[0];
    const obj = createDoll();
    scene.set.objects.push(obj);
    renameObject(project, sceneId, obj.id, "Extra 1");
    expect(scene.set.objects[0].name).toBe("Extra 1");
  });
});

describe("deleteObject", () => {
  it("removes the object and its overrides in every shot, and one undo restores all of it", () => {
    const scene = project.scenes[0];
    const obj = createPrimitive("box");
    scene.set.objects.push(obj);
    const shot1 = createShot("Shot 01");
    shot1.overrides[obj.id] = { visible: false };
    const shot2 = createShot("Shot 02");
    shot2.overrides[obj.id] = { transform: { position: [1, 0, 0], rotationY: 0, scale: 1 } };
    scene.shots.push(shot1, shot2);

    setAutosaver(null);
    useDocumentStore.getState().load(project);
    useDocumentStore.getState().apply((draft) => {
      deleteObject(draft, sceneId, obj.id);
    });

    const afterDelete = useDocumentStore.getState().project!;
    const sceneAfter = afterDelete.scenes.find((s) => s.id === sceneId)!;
    expect(sceneAfter.set.objects.find((o) => o.id === obj.id)).toBeUndefined();
    expect(sceneAfter.shots[0].overrides[obj.id]).toBeUndefined();
    expect(sceneAfter.shots[1].overrides[obj.id]).toBeUndefined();

    useDocumentStore.getState().undo();
    const restored = useDocumentStore.getState().project!;
    const sceneRestored = restored.scenes.find((s) => s.id === sceneId)!;
    expect(sceneRestored.set.objects.find((o) => o.id === obj.id)).toEqual(obj);
    expect(sceneRestored.shots[0].overrides[obj.id]).toEqual({ visible: false });
    expect(sceneRestored.shots[1].overrides[obj.id]).toEqual({
      transform: { position: [1, 0, 0], rotationY: 0, scale: 1 },
    });
  });
});

describe("reconcileOnlyInShot", () => {
  it("leaves an ordinary object untouched", () => {
    const scene = project.scenes[0];
    const obj = createPrimitive("box"); // visible: true by default, no overrides anywhere
    scene.set.objects.push(obj);
    const shot = createShot("Shot 01");
    scene.shots.push(shot);

    reconcileOnlyInShot(project, sceneId, obj.id);

    expect(scene.set.objects[0].visible).toBe(true);
    expect(shot.overrides).toEqual({});
  });

  it("leaves an object untouched when it is not only in one shot", () => {
    const scene = project.scenes[0];
    const obj = createPrimitive("box");
    obj.visible = false;
    scene.set.objects.push(obj);
    // visible true in two shots, not one, so this is not the "only in
    // this shot" pattern reconcileOnlyInShot reacts to.
    const shot1 = createShot("Shot 01");
    shot1.overrides[obj.id] = { visible: true };
    const shot2 = createShot("Shot 02");
    shot2.overrides[obj.id] = { visible: true };
    scene.shots.push(shot1, shot2);

    reconcileOnlyInShot(project, sceneId, obj.id);

    expect(scene.set.objects[0].visible).toBe(false);
    expect(shot1.overrides[obj.id]).toEqual({ visible: true });
    expect(shot2.overrides[obj.id]).toEqual({ visible: true });
  });
});
