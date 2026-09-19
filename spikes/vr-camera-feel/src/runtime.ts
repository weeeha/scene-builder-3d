import { createFpsMeter } from "./camera/fps-meter";
import type { CameraPose } from "./camera/pose";

/**
 * Values that change every frame live here, outside React and outside Zustand,
 * so that a 90 Hz loop never triggers a re-render. Components read and write them inside useFrame.
 */
export const runtime = {
  /** World pose of the lens (the camera body group's origin is the optical centre). This is what a take records. */
  cameraPose: { position: [0, 1.5, 0], rotation: [0, 0, 0, 1] } as CameraPose,
  /** World pose of the right grip this frame. Null when untracked or outside VR. */
  handPose: null as CameraPose | null,
  /** World pose of the left grip: carries the hand monitor and the debug panel. */
  leftHandPose: null as CameraPose | null,
  grabbed: false,
  /** Sample buffer of the take or jitter test in progress (stride 8, see take.ts). */
  samples: [] as number[],
  /** Seconds since the current phase began. */
  phaseClock: 0,
  fps: createFpsMeter(),
  /** Seconds since page load. Drives the scripted path in flat mode. */
  flatClock: 0,
  inXR: false,
};
