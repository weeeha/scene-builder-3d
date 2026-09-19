import type { Vec3 } from "./stage/types";

export const LENSES_MM = [18, 24, 35, 50, 85, 135] as const;

export const SMOOTHING_LEVELS = [
  { name: "off", value: 0 },
  { name: "light", value: 0.33 },
  { name: "medium", value: 0.66 },
  { name: "heavy", value: 0.9 },
] as const;

/** Viewfinder render-target sizes, all 21:9. Question 1 of the spike steps through them. */
export const VF_RESOLUTIONS = [
  [640, 274],
  [960, 412],
  [1280, 548],
] as const;

/** MSAA samples on the viewfinder target. 0 is cheapest. Try 4 in the headset if edges crawl. */
export const VF_MSAA_SAMPLES = 0;

export const BODY_MONITOR_WIDTH_M = 0.16;
export const HAND_MONITOR_WIDTH_M = 0.3;
export const HUD_MONITOR_WIDTH_M = 0.5;
export const GRAB_DISTANCE_M = 0.25;
export const JITTER_TEST_SEC = 10;
export const CLIP_ASPECT = 21 / 9;

/** Clip planes of the lens. The live camera and the replay page share them, so a take replays exactly. */
export const LENS_NEAR_M = 0.05;
export const LENS_FAR_M = 200;

/** The set sits three metres in front of the operator, who starts at the world origin facing -Z. */
export const SET_CENTER: Vec3 = [0, 0, -3];

/** The flat page's overview camera. */
export const OVERVIEW_CAMERA_POSITION: Vec3 = [3, 2.2, 1];
export const OVERVIEW_LOOK_AT: Vec3 = [0, 1, -3];

/** Where the camera body waits when a VR session starts: within reach, looking at the doll. */
export const XR_CAMERA_SPAWN: Vec3 = [0.3, 1.2, -0.6];
