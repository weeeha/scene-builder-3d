import { useLayoutEffect, useRef } from "react";
import { PerspectiveCamera } from "@react-three/drei";
import type { PerspectiveCamera as ThreePerspectiveCamera } from "three";

import { lensToVFovDeg } from "@/domain/lens";
import { cameraAt } from "@/domain/resolve";
import type { ShotCamera } from "@/domain/types";

type ShotCameraRigProps = { camera: ShotCamera; t: number };

/**
 * The shot camera itself: a PerspectiveCamera made default, positioned at
 * cameraAt(camera, t) and looking at its aim, with the fov derived from
 * the lens focal length.
 */
export function ShotCameraRig({ camera, t }: ShotCameraRigProps) {
  const ref = useRef<ThreePerspectiveCamera>(null);
  const { position, aim } = cameraAt(camera, t);
  const [px, py, pz] = position;
  const [ax, ay, az] = aim;

  useLayoutEffect(() => {
    const cam = ref.current;
    if (!cam) return;
    cam.position.set(px, py, pz);
    cam.lookAt(ax, ay, az);
  }, [px, py, pz, ax, ay, az]);

  return (
    <PerspectiveCamera
      ref={ref}
      makeDefault
      fov={lensToVFovDeg(camera.lensMm)}
      position={[px, py, pz]}
      near={0.1}
      far={200}
    />
  );
}
