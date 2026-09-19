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
