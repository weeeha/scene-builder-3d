import type { Framing, Stage, ShotCamera, ShotOverrides, StageObject } from "@/stage/types";

function cloneTransform(transform: StageObject["transform"]): StageObject["transform"] {
  return { ...transform, position: [...transform.position] };
}

/**
 * Merges shot overrides on top of stage defaults, per object id.
 * Order of truth: stage defaults -> shot overrides.
 * An override with `visible: false` drops the object from the result.
 * Overrides for unknown ids are ignored. Inputs are never mutated, and every
 * returned StageObject is an independently-owned deep copy (callers may
 * freely mutate transforms in place, e.g. during gizmo drags).
 */
export function resolveObjects(stage: Stage, overrides: ShotOverrides): StageObject[] {
  const result: StageObject[] = [];

  for (const object of stage.objects) {
    const override = overrides.objects[object.id];
    if (override?.visible === false) {
      continue;
    }

    const merged: StageObject = { ...object, transform: cloneTransform(object.transform) };
    if (override?.transform !== undefined) {
      merged.transform = cloneTransform(override.transform);
    }
    if (override?.pose !== undefined) {
      merged.pose = override.pose;
    }
    result.push(merged);
  }

  return result;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Linearly interpolates position and aim between camera start and end; clamps t01 to [0,1]. */
export function cameraAt(camera: ShotCamera, t01: number): Framing {
  const t = Math.min(1, Math.max(0, t01));
  return {
    position: lerpVec3(camera.start.position, camera.end.position, t),
    aim: lerpVec3(camera.start.aim, camera.end.aim, t),
  };
}
