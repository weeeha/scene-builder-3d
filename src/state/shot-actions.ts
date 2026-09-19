import { newId } from "@/domain/ids";
import { createScene, createShot } from "@/domain/factories";
import type { Framing, Project, Shot } from "@/domain/types";

export function addScene(draft: Project, name: string): string {
  const scene = createScene(name);
  draft.scenes.push(scene);
  return scene.id;
}

export function renameScene(draft: Project, sceneId: string, name: string): void {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  scene.name = name;
}

export function deleteScene(draft: Project, sceneId: string): void {
  draft.scenes = draft.scenes.filter((s) => s.id !== sceneId);
}

export function setSceneNotes(draft: Project, sceneId: string, notes: string): void {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  scene.notes = notes;
}

export function addShot(draft: Project, sceneId: string): string {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return "";
  const shot = createShot(`Shot ${String(scene.shots.length + 1).padStart(2, "0")}`);
  scene.shots.push(shot);
  return shot.id;
}

export function duplicateShot(draft: Project, sceneId: string, shotId: string): string {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return "";
  const index = scene.shots.findIndex((s) => s.id === shotId);
  if (index === -1) return "";
  const source = scene.shots[index];
  const copy: Shot = {
    id: newId(),
    name: `${source.name} copy`,
    type: source.type,
    durationSec: source.durationSec,
    camera: {
      lensMm: source.camera.lensMm,
      position: source.camera.position.map((k) => ({ t: k.t, value: [...k.value] as [number, number, number] })),
      aim: source.camera.aim.map((k) => ({ t: k.t, value: [...k.value] as [number, number, number] })),
    },
    overrides: structuredClone(source.overrides),
  };
  scene.shots.splice(index + 1, 0, copy);
  return copy.id;
}

export function deleteShot(draft: Project, sceneId: string, shotId: string): void {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  scene.shots = scene.shots.filter((s) => s.id !== shotId);
}

export function moveShot(draft: Project, sceneId: string, shotId: string, toIndex: number): void {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  const fromIndex = scene.shots.findIndex((s) => s.id === shotId);
  if (fromIndex === -1) return;
  const clamped = Math.max(0, Math.min(toIndex, scene.shots.length - 1));
  const [shot] = scene.shots.splice(fromIndex, 1);
  scene.shots.splice(clamped, 0, shot);
}

export function updateShot(
  draft: Project,
  sceneId: string,
  shotId: string,
  patch: Partial<Pick<Shot, "name" | "type" | "durationSec">>
): void {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  const shot = scene.shots.find((s) => s.id === shotId);
  if (!shot) return;
  if (patch.name !== undefined) shot.name = patch.name;
  if (patch.type !== undefined) shot.type = patch.type;
  if (patch.durationSec !== undefined) shot.durationSec = patch.durationSec;
}

export function setShotFraming(draft: Project, sceneId: string, shotId: string, framing: Framing): void {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  const shot = scene.shots.find((s) => s.id === shotId);
  if (!shot) return;
  if (shot.camera.position[0]) {
    shot.camera.position[0].value = framing.position;
  } else {
    shot.camera.position[0] = { t: 0, value: framing.position };
  }
  if (shot.camera.aim[0]) {
    shot.camera.aim[0].value = framing.aim;
  } else {
    shot.camera.aim[0] = { t: 0, value: framing.aim };
  }
}

export function setShotLens(draft: Project, sceneId: string, shotId: string, lensMm: number): void {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  const shot = scene.shots.find((s) => s.id === shotId);
  if (!shot) return;
  shot.camera.lensMm = Math.max(12, Math.min(200, lensMm));
}

export function setShotThumb(
  draft: Project,
  sceneId: string,
  shotId: string,
  thumb: { blobKey: string; stateHash: string }
): void {
  const scene = draft.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  const shot = scene.shots.find((s) => s.id === shotId);
  if (!shot) return;
  shot.thumb = thumb;
}
