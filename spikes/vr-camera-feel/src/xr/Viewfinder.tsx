import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { Group, Matrix4, MeshBasicMaterial, Object3D, Quaternion, Vector3, WebGLRenderTarget } from "three";
import {
  BODY_MONITOR_WIDTH_M, CLIP_ASPECT, HAND_MONITOR_WIDTH_M, HUD_MONITOR_WIDTH_M, JITTER_TEST_SEC, LENSES_MM,
  OVERVIEW_CAMERA_POSITION, OVERVIEW_LOOK_AT, VF_MSAA_SAMPLES, VF_RESOLUTIONS,
} from "../constants";
import { runtime } from "../runtime";
import { useSpikeStore } from "../store";
import { createTextCanvas, type TextCanvas } from "../ui/text-canvas";
import { sceneRefs } from "./scene-refs";

const READOUT_PX_W = 512;
const READOUT_PX_H = 48;

// One readout strip shared by every monitor, created on first use (needs the DOM).
let readout: TextCanvas | null = null;
function getReadout(): TextCanvas {
  return (readout ??= createTextCanvas(READOUT_PX_W, READOUT_PX_H, 30));
}

const hide = (o: Object3D) => {
  o.visible = false;
};
const show = (o: Object3D) => {
  o.visible = true;
};

/** Registers an object to be switched off while the lens renders. Use an OUTER group: inner groups keep their own visibility. */
function useHiddenFromLens(ref: RefObject<Object3D | null>): void {
  useEffect(() => {
    const object = ref.current;
    if (!object) return;
    sceneRefs.hideFromLens.add(object);
    return () => {
      sceneRefs.hideFromLens.delete(object);
    };
  }, [ref]);
}

/**
 * Renders the scene through the lens into a texture, once per frame, before the main render.
 * While a VR session is presenting, three.js swaps in the headset's cameras on EVERY render call,
 * so this pass switches `xr.enabled` off, renders, and restores the flag and the previous target.
 */
export function Viewfinder() {
  const vfResIndex = useSpikeStore((s) => s.vfResIndex);
  const origin = useXR((s) => s.origin);
  const readoutClock = useRef(1);
  const lastLabel = useRef("");

  const target = useMemo(() => {
    const [width, height] = VF_RESOLUTIONS[vfResIndex];
    return new WebGLRenderTarget(width, height, { samples: VF_MSAA_SAMPLES });
  }, [vfResIndex]);

  useEffect(() => {
    sceneRefs.viewfinderTexture = target.texture;
    sceneRefs.monitorMaterials.forEach((material) => {
      material.map = target.texture;
      material.needsUpdate = true;
    });
    return () => target.dispose();
  }, [target]);

  useFrame(({ gl, scene }, delta) => {
    const lensCamera = sceneRefs.lensCamera;
    if (!lensCamera) return;

    const previousTarget = gl.getRenderTarget(); // during a session this is three's XR target, not null
    const previousXrEnabled = gl.xr.enabled;
    // Without an <XROrigin> the library reports the scene itself as the origin. Hiding that would blank the lens.
    const xrOrigin = origin && origin !== scene ? origin : null;
    const originWasVisible = xrOrigin ? xrOrigin.visible : false;
    sceneRefs.hideFromLens.forEach(hide); // also prevents sampling the texture we are rendering into
    if (xrOrigin) xrOrigin.visible = false; // controller models and the teleport arc
    gl.xr.enabled = false;
    gl.setRenderTarget(target);
    gl.render(scene, lensCamera);
    gl.setRenderTarget(previousTarget);
    gl.xr.enabled = previousXrEnabled;
    if (xrOrigin) xrOrigin.visible = originWasVisible;
    sceneRefs.hideFromLens.forEach(show);

    // Readout text, ten times a second at most, and only when it changed.
    readoutClock.current += delta;
    if (readoutClock.current < 0.1) return;
    readoutClock.current = 0;
    const { lensIndex, phase } = useSpikeStore.getState();
    const lens = `${LENSES_MM[lensIndex]}mm`;
    const t = runtime.phaseClock;
    let label = lens;
    let color = "#e6e8ec";
    if (phase === "recording") {
      label = `${lens}   REC ${t.toFixed(1)}s`;
      color = "#ff5555";
    } else if (phase === "replaying") {
      label = `${lens}   PLAY ${t.toFixed(1)}s`;
      color = "#8fbcbb";
    } else if (phase === "jitter") {
      label = `${lens}   HOLD STILL ${Math.max(0, JITTER_TEST_SEC - t).toFixed(1)}s`;
      color = "#ebcb8b";
    }
    if (label !== lastLabel.current) {
      lastLabel.current = label;
      getReadout().draw([label], [color]);
    }
  }, -1);

  return null;
}

/** The picture, a white frame line, a centre cross and the readout strip underneath. */
function MonitorFace({ widthM }: { widthM: number }) {
  const material = useRef<MeshBasicMaterial>(null);
  const heightM = widthM / CLIP_ASPECT;
  const stripHeightM = widthM * (READOUT_PX_H / READOUT_PX_W);

  useEffect(() => {
    const m = material.current;
    if (!m) return;
    sceneRefs.monitorMaterials.add(m);
    if (sceneRefs.viewfinderTexture) {
      m.map = sceneRefs.viewfinderTexture;
      m.needsUpdate = true;
    }
    return () => {
      sceneRefs.monitorMaterials.delete(m);
    };
  }, []);

  const frame = useMemo(() => {
    const w = widthM / 2;
    const h = heightM / 2;
    return new Float32Array([-w, -h, 0, w, -h, 0, w, h, 0, -w, h, 0]);
  }, [widthM, heightM]);

  const cross = useMemo(() => {
    const c = widthM * 0.02;
    return new Float32Array([-c, 0, 0, c, 0, 0, 0, -c, 0, 0, c, 0]);
  }, [widthM]);

  return (
    <group>
      <mesh>
        <planeGeometry args={[widthM, heightM]} />
        <meshBasicMaterial ref={material} toneMapped={false} />
      </mesh>
      <lineLoop position={[0, 0, 0.0005]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[frame, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" toneMapped={false} />
      </lineLoop>
      <lineSegments position={[0, 0, 0.0005]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[cross, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" toneMapped={false} />
      </lineSegments>
      <mesh position={[0, -(heightM / 2) - stripHeightM / 2 - 0.004, 0]}>
        <planeGeometry args={[widthM, stripHeightM]} />
        <meshBasicMaterial map={getReadout().texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** On-camera monitor: top rear of the body, tilted 20 degrees up toward the operator. Mount it inside VirtualCamera. */
export function BodyMonitor() {
  const outer = useRef<Group>(null);
  useHiddenFromLens(outer);
  return (
    <group ref={outer} position={[0, 0.11, 0.2]} rotation={[-0.35, 0, 0]}>
      <MonitorFace widthM={BODY_MONITOR_WIDTH_M} />
    </group>
  );
}

/** Left-hand monitor: follows `runtime.leftHandPose`, invisible outside VR. Children sit above the picture. */
export function HandMonitor({ children }: { children?: ReactNode }) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  useHiddenFromLens(outer);
  const heightM = HAND_MONITOR_WIDTH_M / CLIP_ASPECT;

  useFrame(() => {
    const group = outer.current;
    const face = inner.current;
    if (!group || !face) return;
    const pose = runtime.leftHandPose;
    face.visible = runtime.inXR && pose !== null;
    if (!pose) return;
    group.position.set(pose.position[0], pose.position[1], pose.position[2]);
    group.quaternion.set(pose.rotation[0], pose.rotation[1], pose.rotation[2], pose.rotation[3]);
  });

  return (
    <group ref={outer}>
      <group ref={inner} visible={false} position={[0, 0.16, -0.04]} rotation={[-0.5, 0, 0]}>
        <MonitorFace widthM={HAND_MONITOR_WIDTH_M} />
        <group position={[0, heightM / 2 + 0.015, 0]}>{children}</group>
      </group>
    </group>
  );
}

/** Flat-page monitor: parked in the lower right of the overview camera's view, invisible in VR. */
export function HudMonitor({ children }: { children?: ReactNode }) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  useHiddenFromLens(outer);
  const heightM = HUD_MONITOR_WIDTH_M / CLIP_ASPECT;

  const placement = useMemo(() => {
    const eye = new Vector3(OVERVIEW_CAMERA_POSITION[0], OVERVIEW_CAMERA_POSITION[1], OVERVIEW_CAMERA_POSITION[2]);
    const lookAt = new Vector3(OVERVIEW_LOOK_AT[0], OVERVIEW_LOOK_AT[1], OVERVIEW_LOOK_AT[2]);
    const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(eye, lookAt, new Vector3(0, 1, 0)));
    const offset = new Vector3(0.5, -0.42, -1.4).applyQuaternion(quaternion); // right, down, forward of the camera (fits a 4:3 window)
    return { position: eye.add(offset), quaternion };
  }, []);

  useFrame(() => {
    if (inner.current) inner.current.visible = !runtime.inXR;
  });

  return (
    <group ref={outer} position={placement.position} quaternion={placement.quaternion}>
      <group ref={inner}>
        <MonitorFace widthM={HUD_MONITOR_WIDTH_M} />
        <group position={[0, heightM / 2 + 0.015, 0]}>{children}</group>
      </group>
    </group>
  );
}
