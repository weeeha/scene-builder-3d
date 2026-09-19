import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useXR, useXRInputSourceState } from "@react-three/xr";
import { Matrix4, Quaternion, Vector3, type Object3D } from "three";
import type { CameraPose } from "../camera/pose";
import { GRAB_DISTANCE_M, XR_CAMERA_SPAWN } from "../constants";
import { createButtonEdge, createStickFlick } from "../input/edges";
import { runtime } from "../runtime";
import { useSpikeStore } from "../store";
import { startJitterTest, startReplay, toggleRecording } from "./Recorder";
import { runMicProbe } from "./probe";
// ANCHOR:imports

type PadComponent = { state: "default" | "touched" | "pressed"; button?: number; xAxis?: number; yAxis?: number };
type ControllerLike = { inputSource: XRInputSource; gamepad: Record<string, PadComponent | undefined> } | undefined;

const scratchMatrix = new Matrix4();
const scratchPosition = new Vector3();
const scratchQuaternion = new Quaternion();
const scratchScale = new Vector3();

function pressed(controller: ControllerLike, id: string): boolean {
  return controller?.gamepad[id]?.state === "pressed";
}

/** World pose of a controller's grip, or null when any piece of the chain is missing this frame. */
function gripWorldPose(
  frame: XRFrame | undefined,
  referenceSpace: XRReferenceSpace | null,
  controller: ControllerLike,
  origin: Object3D | undefined,
): CameraPose | null {
  const gripSpace = controller?.inputSource.gripSpace;
  if (!frame || !referenceSpace || !gripSpace || !origin) return null;
  const pose = frame.getPose(gripSpace, referenceSpace);
  if (!pose) return null;
  scratchMatrix.fromArray(pose.transform.matrix).premultiply(origin.matrixWorld); // world = origin x local
  scratchMatrix.decompose(scratchPosition, scratchQuaternion, scratchScale);
  return {
    position: [scratchPosition.x, scratchPosition.y, scratchPosition.z],
    rotation: [scratchQuaternion.x, scratchQuaternion.y, scratchQuaternion.z, scratchQuaternion.w],
  };
}

export function ControllerInput() {
  const right = useXRInputSourceState("controller", "right");
  const left = useXRInputSourceState("controller", "left");
  const origin = useXR((s) => s.origin);
  const mode = useXR((s) => s.mode);
  const wasInXR = useRef(false);

  const edges = useMemo(
    () => ({
      trigger: createButtonEdge(),
      a: createButtonEdge(),
      b: createButtonEdge(),
      x: createButtonEdge(),
      y: createButtonEdge(),
      lens: createStickFlick(),
      viewfinderSize: createStickFlick(),
      leftSqueeze: createButtonEdge(),
      // ANCHOR:edges
    }),
    [],
  );

  useFrame((state, _delta, frame) => {
    const inXR = mode === "immersive-vr";
    runtime.inXR = inXR;
    if (!inXR) {
      wasInXR.current = false;
      runtime.handPose = null;
      runtime.leftHandPose = null;
      return; // VirtualCamera runs the scripted path and owns `grabbed` on the flat page
    }

    if (!wasInXR.current) {
      // Session start: park the camera within reach, looking at the doll, and let go of it.
      wasInXR.current = true;
      runtime.grabbed = false;
      runtime.cameraPose = { position: [XR_CAMERA_SPAWN[0], XR_CAMERA_SPAWN[1], XR_CAMERA_SPAWN[2]], rotation: [0, 0, 0, 1] };
    }

    const referenceSpace = state.gl.xr.getReferenceSpace();
    runtime.handPose = gripWorldPose(frame, referenceSpace, right, origin);
    runtime.leftHandPose = gripWorldPose(frame, referenceSpace, left, origin);

    // Grab: squeeze while the hand is on the camera. Once grabbed it stays grabbed until the squeeze ends.
    const squeezing = pressed(right, "xr-standard-squeeze");
    if (!squeezing || !runtime.handPose) {
      runtime.grabbed = false;
    } else if (!runtime.grabbed) {
      const h = runtime.handPose.position;
      const c = runtime.cameraPose.position;
      runtime.grabbed = Math.hypot(h[0] - c[0], h[1] - c[1], h[2] - c[2]) < GRAB_DISTANCE_M;
    }

    const store = useSpikeStore.getState();
    if (edges.trigger(pressed(right, "xr-standard-trigger"))) toggleRecording();

    const stick = right?.gamepad["xr-standard-thumbstick"];
    const lensStep = edges.lens(stick?.xAxis ?? 0);
    if (lensStep !== 0) store.stepLens(lensStep);
    const sizeStep = edges.viewfinderSize(-(stick?.yAxis ?? 0)); // stick away from you is negative yAxis
    if (sizeStep !== 0) store.stepVfRes(sizeStep);

    if (edges.a(pressed(right, "a-button"))) startReplay();
    if (edges.b(pressed(right, "b-button"))) startJitterTest();
    if (edges.x(pressed(left, "x-button"))) store.cycleSmoothing();
    if (edges.y(pressed(left, "y-button"))) store.togglePanel();
    // The left trigger and the left stick belong to the library: teleport and snap turn. They are not read here.
    if (edges.leftSqueeze(pressed(left, "xr-standard-squeeze"))) void runMicProbe();
    // ANCHOR:left-hand
  }, -4);

  return null;
}
