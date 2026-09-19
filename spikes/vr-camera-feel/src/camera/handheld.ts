import type { CameraPose } from "./pose";
// Helpers for the body: import { lerpVec3, slerpQuat } from "./pose";

/** Flip to true in the same commit that gives handheld() a real body. It switches on the last two property tests. */
export const HANDHELD_IMPLEMENTED = false;

/**
 * The handheld rig: how the camera follows the operator's hand.
 * `smoothing` runs from 0 (camera welded to the hand) to 1 (heaviest smoothing).
 * `previous` is the camera pose this function returned last frame. `dtSec` is the frame time.
 *
 * Trade-offs to weigh. This function decides how operating feels:
 * - Lag against steadiness. More smoothing calms long lenses and makes the camera trail the hand.
 * - Position against rotation. Rotation shake is what ruins an 85 mm frame. Position lag is what makes the
 *   camera feel detached from your hand. They can take different strengths.
 * - Frame-rate independence. A fixed blend per frame feels different at 72 Hz and 90 Hz. Blend by time:
 *   alpha = 1 - Math.exp(-dtSec / tau), with tau in seconds growing with `smoothing`.
 * - Roll. Extra damping on roll keeps horizons level. It needs a swing-twist split, so treat it as optional.
 * - A One Euro filter adapts to speed (steady when still, quick when moving). About 30 lines. A possible follow-up.
 */
export function handheld(hand: CameraPose, previous: CameraPose, dtSec: number, smoothing: number): CameraPose {
  // TODO(Nick): about ten lines. Until then the camera is welded to the hand.
  return hand;
}
