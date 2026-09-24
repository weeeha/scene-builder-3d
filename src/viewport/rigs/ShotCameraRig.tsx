import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type { Event as ControlsEvent, PerspectiveCamera as ThreePerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { lensToVFovDeg } from "@/domain/lens";
import { cameraAt } from "@/domain/resolve";
import type { ShotCamera } from "@/domain/types";
import { useDocumentStore } from "@/state/document-store";
import { setShotFraming } from "@/state/shot-actions";
import { framingFromControls } from "@/viewport/transform-commit";

type ShotCameraRigProps = {
  camera: ShotCamera;
  t: number;
  sceneId: string;
  shotId: string;
  interactive: boolean;
};

/**
 * The shot camera itself: a PerspectiveCamera made default, positioned at
 * cameraAt(camera, t) and looking at its aim, with the fov derived from
 * the lens focal length. When interactive (the shot page in shot camera
 * mode), drei OrbitControls lets the user orbit, pan and dolly the camera
 * around its aim point.
 *
 * OrbitControls only mounts once the PerspectiveCamera's own instance is
 * known (tracked in state through a callback ref, not just the plain ref
 * drei's own imperative handle needs), and is given that instance directly
 * through its camera prop rather than relying on drei's fallback to R3F's
 * default camera. Without this, drei memoizes its OrbitControlsImpl on
 * whatever camera is default at OrbitControls' first render, which on
 * mount is still R3F's own default camera (PerspectiveCamera's makeDefault
 * effect swaps the real one in only after that first commit); the next
 * render then rebuilds OrbitControlsImpl against the real camera, with a
 * fresh, un-synced target back at the THREE.Vector3 default of the
 * origin. Passing camera explicitly, and only once it exists, means
 * exactly one instance is ever built, already bound to the right camera.
 * The target is set the same declarative way, through the target prop,
 * rather than only once in an effect, so it tracks whichever instance is
 * actually live rather than a specific one a ref may have gone stale on.
 *
 * On the controls' end event the new position and target are committed as
 * the shot's single position and aim key through setShotFraming. The
 * controls instance is read off the event itself when three.js's
 * EventDispatcher supplies one (it always does, via dispatchEvent's own
 * event.target = this), falling back to the ref only if it does not.
 */
export function ShotCameraRig({ camera, t, sceneId, shotId, interactive }: ShotCameraRigProps) {
  const cameraRef = useRef<ThreePerspectiveCamera>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [threeCamera, setThreeCamera] = useState<ThreePerspectiveCamera | null>(null);
  const { position, aim } = cameraAt(camera, t);
  const [px, py, pz] = position;
  const [ax, ay, az] = aim;

  const setCameraRef = useCallback((node: ThreePerspectiveCamera | null) => {
    cameraRef.current = node;
    setThreeCamera(node);
  }, []);

  useLayoutEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    cam.position.set(px, py, pz);
    cam.lookAt(ax, ay, az);
  }, [px, py, pz, ax, ay, az]);

  const handleEnd = useCallback(
    (event?: ControlsEvent) => {
      const cam = cameraRef.current;
      const controls = (event?.target as OrbitControlsImpl | undefined) ?? controlsRef.current;
      if (!cam || !controls) return;
      const framing = framingFromControls(
        [cam.position.x, cam.position.y, cam.position.z],
        [controls.target.x, controls.target.y, controls.target.z]
      );
      useDocumentStore.getState().apply((draft) => {
        setShotFraming(draft, sceneId, shotId, framing);
      });
    },
    [sceneId, shotId]
  );

  return (
    <>
      <PerspectiveCamera
        ref={setCameraRef}
        makeDefault
        fov={lensToVFovDeg(camera.lensMm)}
        position={[px, py, pz]}
        near={0.1}
        far={200}
      />
      {interactive && threeCamera && (
        <OrbitControls
          ref={controlsRef}
          camera={threeCamera}
          makeDefault
          target={[ax, ay, az]}
          onEnd={handleEnd}
        />
      )}
    </>
  );
}
