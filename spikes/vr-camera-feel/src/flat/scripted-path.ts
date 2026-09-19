import { Matrix4, Quaternion, Vector3 } from "three";
import type { CameraPose } from "../camera/pose";
import { SET_CENTER } from "../constants";

const eye = new Vector3();
const target = new Vector3(SET_CENTER[0], 1.2, SET_CENTER[2]);
const up = new Vector3(0, 1, 0);
const m = new Matrix4();
const q = new Quaternion();

/** A slow orbit around the doll, 3 m out and 1.5 m up, one lap per 20 s, always looking at its chest. */
export function scriptedHandPose(tSec: number): CameraPose {
  const a = (tSec / 20) * Math.PI * 2;
  eye.set(SET_CENTER[0] + Math.sin(a) * 3, 1.5, SET_CENTER[2] + Math.cos(a) * 3);
  m.lookAt(eye, target, up); // camera convention: -Z points from the eye to the target
  q.setFromRotationMatrix(m);
  return { position: [eye.x, eye.y, eye.z], rotation: [q.x, q.y, q.z, q.w] };
}
