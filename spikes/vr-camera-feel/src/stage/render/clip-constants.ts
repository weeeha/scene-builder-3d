/**
 * Clip-export constants, dependency-free so the "use server" upload action
 * can import them without pulling three/mp4-muxer into its module graph.
 */
export const CLIP_WIDTH = 2520;
export const CLIP_HEIGHT = 1080;
export const CLIP_FPS = 30;

/** Stage background, shared by the R3F viewport and the clip renderer. */
export const STAGE_BACKGROUND = "#15171c";
