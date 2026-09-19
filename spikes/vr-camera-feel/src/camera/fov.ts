export type CameraBody = { id: string; name: string; sensorWmm: number; sensorHmm: number };
export type FrameFormat = { id: string; name: string; aspect: number };

export const FULL_FRAME: CameraBody = { id: "full-frame", name: "Full frame", sensorWmm: 36, sensorHmm: 24 };
export const FORMAT_21_9: FrameFormat = { id: "21:9", name: "21:9", aspect: 21 / 9 };

/** Sensor height actually used once the frame format is cropped out of the sensor. */
export function usedSensorHeightMm(body: CameraBody, format: FrameFormat): number {
  return Math.min(body.sensorHmm, body.sensorWmm / format.aspect);
}

/** Vertical field of view in degrees for a lens on a body, framed for a format. */
export function vFovDeg(lensMm: number, body: CameraBody, format: FrameFormat): number {
  const usedHeight = usedSensorHeightMm(body, format);
  return (2 * Math.atan(usedHeight / (2 * lensMm)) * 180) / Math.PI;
}
