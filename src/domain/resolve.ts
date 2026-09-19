import type { Framing, Keyframe, Scene, Shot, ShotCamera, StageObject, Vec3 } from "@/domain/types";

function cloneTransform(transform: StageObject["transform"]): StageObject["transform"] {
  return { ...transform, position: [...transform.position] as Vec3 };
}

/**
 * Merges a shot's overrides on top of the set's defaults, per object id,
 * keeping the set's array order, without dropping anything: every object
 * in scene.set.objects appears exactly once in the result, each with an
 * independent copy of its transform, so gizmo drags never mutate the
 * document directly. Ported from Film Planner's stage/resolve.ts
 * resolveObjects, except Film Planner's version dropped an object
 * entirely once its override said visible: false; this version keeps it
 * and sets its own visible field to false instead, because the thumbnail
 * worker (Task 21) needs to mount a shot's hidden objects too while
 * rendering that shot's framing from a different page. A null shot
 * applies no overrides, so the result mirrors the set's own defaults
 * exactly.
 *
 * t is accepted for forward compatibility with S3's per-object keyframe
 * tracks; no StageObject carries a track of its own yet, so t has no
 * effect in S1 or S2.
 */
export function resolveSceneAll(scene: Scene, shot: Shot | null, t: number): StageObject[] {
  // t is unused until S3 adds per-object keyframe tracks (see docblock
  // above); referencing it here keeps it as a real parameter without
  // tripping noUnusedParameters/no-unused-vars.
  void t;
  return scene.set.objects.map((object) => {
    const override = shot ? shot.overrides[object.id] : undefined;
    const visible = override?.visible ?? object.visible;

    const merged: StageObject = { ...object, transform: cloneTransform(object.transform), visible };
    if (override?.transform !== undefined) {
      merged.transform = cloneTransform(override.transform);
    }
    if (merged.kind === "doll" && override?.pose !== undefined) {
      merged.pose = override.pose;
    }
    return merged;
  });
}

/**
 * resolveSceneAll filtered down to the objects that are actually visible.
 * This is what the viewport renders for whichever page is on screen;
 * resolveSceneAll itself exists for the thumbnail worker, which needs
 * every object mounted, hidden ones included.
 */
export function resolveScene(scene: Scene, shot: Shot | null, t: number): StageObject[] {
  return resolveSceneAll(scene, shot, t).filter((object) => object.visible);
}

function lerp(a: number, b: number, ratio: number): number {
  return a + (b - a) * ratio;
}

function lerpVec3(a: Vec3, b: Vec3, ratio: number): Vec3 {
  return [lerp(a[0], b[0], ratio), lerp(a[1], b[1], ratio), lerp(a[2], b[2], ratio)];
}

/** Samples a sorted keyframe track at time t. One key is constant; t before the first key or after the last clamps. */
function sampleTrack(track: Keyframe[], t: number): Vec3 {
  if (track.length === 1) {
    return track[0].value;
  }

  const first = track[0];
  if (t <= first.t) {
    return first.value;
  }
  const last = track[track.length - 1];
  if (t >= last.t) {
    return last.value;
  }

  for (let i = 0; i < track.length - 1; i += 1) {
    const from = track[i];
    const to = track[i + 1];
    if (t >= from.t && t <= to.t) {
      const ratio = to.t === from.t ? 0 : (t - from.t) / (to.t - from.t);
      return lerpVec3(from.value, to.value, ratio);
    }
  }

  return last.value;
}

/**
 * Samples the shot camera at time t (seconds), sampling the position and
 * aim tracks independently. Ported from Film Planner's stage/resolve.ts
 * cameraAt: linear interpolation with clamping at both ends. Film
 * Planner's camera had exactly two fixed keys (start/end); ShotCamera's
 * position and aim are each an arbitrary-length Keyframe[], so this
 * samples a general track instead of lerping two fixed fields. In S1 and
 * S2 every track holds exactly one key, so cameraAt always returns that
 * key's value regardless of t.
 */
export function cameraAt(camera: ShotCamera, t: number): Framing {
  return {
    position: sampleTrack(camera.position, t),
    aim: sampleTrack(camera.aim, t),
  };
}
