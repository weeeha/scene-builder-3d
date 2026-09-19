/** Half-height of a full-frame 36x24mm sensor, in mm. */
const HALF_SENSOR_HEIGHT_MM = 12;

/**
 * Vertical field of view (degrees) for a given lens focal length (mm),
 * assuming a full-frame 36x24mm sensor.
 */
export function lensToVFovDeg(lensMm: number): number {
  return 2 * Math.atan(HALF_SENSOR_HEIGHT_MM / lensMm) * (180 / Math.PI);
}

/** Inverse of lensToVFovDeg: focal length (mm) for a given vertical FOV (degrees). */
export function vFovToLensMm(vFovDeg: number): number {
  const halfAngleRad = (vFovDeg / 2) * (Math.PI / 180);
  return HALF_SENSOR_HEIGHT_MM / Math.tan(halfAngleRad);
}
