import type { EditTarget } from "@/state/object-actions";
import type { WriteTarget } from "@/state/editor-store";
import type { Framing, Vec3 } from "@/domain/types";

/** The scene page always writes to the set, regardless of the write-target
 * switch (that switch only exists on the shot page). On the shot page,
 * "set" writes the object's defaults and "shot" writes an override in the
 * current shot; if no shot id is available, fall back to the set rather
 * than writing to a shot that does not exist. */
export function editTargetFor(page: "scene" | "shot", writeTarget: WriteTarget, shotId: string | null): EditTarget {
  if (page === "scene") return { kind: "set" };
  if (writeTarget === "shot" && shotId !== null) return { kind: "shot", shotId };
  return { kind: "set" };
}

/** Rounds each axis of p to the nearest multiple of step, unless disabled
 * (Alt held) or step is not a positive number, in which case p passes
 * through unchanged. */
export function snapPosition(p: Vec3, step: number, enabled: boolean): Vec3 {
  if (!enabled || step <= 0) return p;
  const snap = (v: number) => Math.round(v / step) * step;
  return [snap(p[0]), snap(p[1]), snap(p[2])];
}

/** Builds a Framing from a live camera position and an OrbitControls
 * target, rounding both to 3 decimals so tiny floating-point drift from
 * an orbit/pan/dolly drag does not turn into a no-op-looking history
 * entry that still bumps updatedAt. */
export function framingFromControls(cameraPosition: Vec3, target: Vec3): Framing {
  const round3 = (v: number) => Math.round(v * 1000) / 1000;
  return {
    position: [round3(cameraPosition[0]), round3(cameraPosition[1]), round3(cameraPosition[2])],
    aim: [round3(target[0]), round3(target[1]), round3(target[2])],
  };
}
