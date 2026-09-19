import { useEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { FORMAT_21_9, FULL_FRAME, vFovDeg } from "../camera/fov";
import { handheld } from "../camera/handheld";
import type { CameraPose } from "../camera/pose";
import { poseAt } from "../camera/take";
import { CLIP_ASPECT, LENSES_MM, LENS_FAR_M, LENS_NEAR_M, SMOOTHING_LEVELS } from "../constants";
import { scriptedHandPose } from "../flat/scripted-path";
import { runtime } from "../runtime";
import { useSpikeStore } from "../store";
import { sceneRefs } from "./scene-refs";

// Scratch objects: nothing three.js is allocated inside the frame loop.
const handMatrix = new Matrix4();
const bodyMatrix = new Matrix4();
const offsetMatrix = new Matrix4();
const targetMatrix = new Matrix4();
const pos = new Vector3();
const quat = new Quaternion();
const scale = new Vector3();
const ONE = new Vector3(1, 1, 1);

function poseToMatrix(pose: CameraPose, out: Matrix4): Matrix4 {
  pos.set(pose.position[0], pose.position[1], pose.position[2]);
  quat.set(pose.rotation[0], pose.rotation[1], pose.rotation[2], pose.rotation[3]);
  return out.compose(pos, quat, ONE);
}

function matrixToPose(m: Matrix4): CameraPose {
  m.decompose(pos, quat, scale);
  return { position: [pos.x, pos.y, pos.z], rotation: [quat.x, quat.y, quat.z, quat.w] };
}

/**
 * The camera body. The group's origin is the optical centre, so `runtime.cameraPose` is the lens pose
 * and a recorded take replays exactly. The visible body sits behind the origin (+Z).
 */
export function VirtualCamera({ children }: { children?: ReactNode }) {
  const body = useRef<Group>(null);
  const bodyMesh = useRef<Group>(null);
  const lens = useRef<PerspectiveCamera>(null);
  const wasGrabbed = useRef(false);
  const lensIndex = useSpikeStore((s) => s.lensIndex);

  useEffect(() => {
    const cam = lens.current;
    if (!cam) return;
    cam.fov = vFovDeg(LENSES_MM[lensIndex], FULL_FRAME, FORMAT_21_9);
    cam.aspect = CLIP_ASPECT;
    cam.updateProjectionMatrix();
  }, [lensIndex]);

  useEffect(() => {
    const mesh = bodyMesh.current;
    sceneRefs.lensCamera = lens.current;
    if (mesh) sceneRefs.hideFromLens.add(mesh);
    return () => {
      sceneRefs.lensCamera = null;
      if (mesh) sceneRefs.hideFromLens.delete(mesh);
    };
  }, []);

  useFrame((_state, delta) => {
    const { phase, lastTake, smoothingIndex } = useSpikeStore.getState();
    runtime.flatClock += delta;

    let hand: CameraPose | null;
    if (runtime.inXR) {
      hand = runtime.handPose;
    } else {
      hand = scriptedHandPose(runtime.flatClock); // no headset: the camera flies a scripted orbit
      runtime.grabbed = true;
    }

    if (phase === "replaying" && lastTake) {
      runtime.cameraPose = poseAt(lastTake.move.samples, runtime.phaseClock);
      wasGrabbed.current = false;
    } else if (runtime.grabbed && hand) {
      poseToMatrix(hand, handMatrix);
      if (!wasGrabbed.current) {
        // First frame of a grab: remember where the camera sits relative to the hand, so it does not jump.
        poseToMatrix(runtime.cameraPose, bodyMatrix);
        offsetMatrix.copy(handMatrix).invert().multiply(bodyMatrix);
        if (!runtime.inXR) offsetMatrix.identity(); // flat mode: the scripted pose is the camera pose
      }
      targetMatrix.multiplyMatrices(handMatrix, offsetMatrix);
      runtime.cameraPose = handheld(matrixToPose(targetMatrix), runtime.cameraPose, delta, SMOOTHING_LEVELS[smoothingIndex].value);
      wasGrabbed.current = true;
    } else {
      wasGrabbed.current = false; // released: the camera floats where it was left, like a locked-off tripod
    }

    const group = body.current;
    if (group) {
      const p = runtime.cameraPose;
      group.position.set(p.position[0], p.position[1], p.position[2]);
      group.quaternion.set(p.rotation[0], p.rotation[1], p.rotation[2], p.rotation[3]);
    }
  }, -3);

  return (
    <group ref={body}>
      <group ref={bodyMesh}>
        <mesh position={[0, 0, 0.13]}>
          <boxGeometry args={[0.14, 0.1, 0.18]} />
          <meshStandardMaterial color="#2e3440" />
        </mesh>
        <mesh position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.045, 0.06, 24]} />
          <meshStandardMaterial color="#111318" />
        </mesh>
      </group>
      <perspectiveCamera ref={lens} near={LENS_NEAR_M} far={LENS_FAR_M} />
      {children}
    </group>
  );
}
