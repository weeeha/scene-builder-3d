import { useCallback, useLayoutEffect, useRef } from "react";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type { PerspectiveCamera as ThreePerspectiveCamera } from "three";
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
 * around its aim point; on the controls' end event the new position and
 * target are committed as the shot's single position and aim key through
 * setShotFraming.
 */
export function ShotCameraRig({ camera, t, sceneId, shotId, interactive }: ShotCameraRigProps) {
  const cameraRef = useRef<ThreePerspectiveCamera>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { position, aim } = cameraAt(camera, t);
  const [px, py, pz] = position;
  const [ax, ay, az] = aim;

  useLayoutEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    cam.position.set(px, py, pz);
    cam.lookAt(ax, ay, az);
    controlsRef.current?.target.set(ax, ay, az);
  }, [px, py, pz, ax, ay, az]);

  const handleEnd = useCallback(() => {
    const cam = cameraRef.current;
    const controls = controlsRef.current;
    if (!cam || !controls) return;
    const framing = framingFromControls(
      [cam.position.x, cam.position.y, cam.position.z],
      [controls.target.x, controls.target.y, controls.target.z]
    );
    useDocumentStore.getState().apply((draft) => {
      setShotFraming(draft, sceneId, shotId, framing);
    });
  }, [sceneId, shotId]);

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={lensToVFovDeg(camera.lensMm)}
        position={[px, py, pz]}
        near={0.1}
        far={200}
      />
      {interactive && <OrbitControls ref={controlsRef} makeDefault onEnd={handleEnd} />}
    </>
  );
}
