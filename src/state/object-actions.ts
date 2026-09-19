import type { ObjectOverride, Project, StageObject } from "@/domain/types";

export type EditTarget = { kind: "set" } | { kind: "shot"; shotId: string };

export function addObject(
  draft: Project,
  sceneId: string,
  object: StageObject,
  opts?: { onlyInShotId?: string }
): void {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  if (opts?.onlyInShotId) {
    scene.set.objects.push({ ...object, visible: false });
    const shot = scene.shots.find((sh) => sh.id === opts.onlyInShotId);
    if (shot) {
      shot.overrides[object.id] = { ...shot.overrides[object.id], visible: true };
    }
    return;
  }
  scene.set.objects.push(object);
}

export function updateObject(
  draft: Project,
  sceneId: string,
  objectId: string,
  patch: ObjectOverride,
  target: EditTarget
): void {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return;

  if (target.kind === "shot") {
    const shot = scene.shots.find((sh) => sh.id === target.shotId);
    if (!shot) return;
    shot.overrides[objectId] = { ...shot.overrides[objectId], ...patch };
    return;
  }

  const object = scene.set.objects.find((o) => o.id === objectId);
  if (!object) return;
  if (patch.transform) object.transform = patch.transform;
  if (patch.visible !== undefined) object.visible = patch.visible;
  if (patch.pose !== undefined && object.kind === "doll") object.pose = patch.pose;
  reconcileOnlyInShot(draft, sceneId, objectId);
}

export function renameObject(draft: Project, sceneId: string, objectId: string, name: string): void {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  const object = scene.set.objects.find((o) => o.id === objectId);
  if (!object) return;
  object.name = name;
}

export function deleteObject(draft: Project, sceneId: string, objectId: string): void {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  scene.set.objects = scene.set.objects.filter((o) => o.id !== objectId);
  for (const shot of scene.shots) {
    delete shot.overrides[objectId];
  }
}

/**
 * An object added with "only in this shot" has default visible false and a
 * visible true override in one shot. Later, on the scene page, the user edits
 * it with the set target. This decides what that edit does to visibility.
 * Options: (a) leave visibility alone, so the object stays a one-shot object
 * that can be moved from the scene page only while "show hidden" is on;
 * (b) promote it, setting default visible true and removing the now redundant
 * override, because editing it from the scene page signals it belongs to the set.
 */
export function reconcileOnlyInShot(draft: Project, sceneId: string, objectId: string): void {
  // Controller ruling (see task-13-brief.md, "Reserved for Nick"): option
  // (a), a documented no-op. Editing an only-in-this-shot object from the
  // scene page leaves its visibility alone; it stays a one-shot object.
  // Option (b) would promote it instead: set the object's default visible
  // to true in the set and delete the now redundant override in the shot
  // it was added to. Nick reviews this as a one function edit if he wants
  // (b) instead.
  void draft;
  void sceneId;
  void objectId;
}
