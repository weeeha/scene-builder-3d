import { useLayoutEffect, useRef } from "react";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type { PerspectiveCamera as ThreePerspectiveCamera } from "three";

const ORBIT_TARGET: [number, number, number] = [0, 1, 0];

/**
 * Free-orbit editor rig: a default camera with OrbitControls (makeDefault
 * so drei TransformControls can pause it while dragging).
 */
export function OrbitRig() {
  const ref = useRef<ThreePerspectiveCamera>(null);
  // OrbitControls only orients the camera once the user interacts; without
  // this the first frame after mount looks down the camera's default -Z.
  useLayoutEffect(() => {
    ref.current?.lookAt(ORBIT_TARGET[0], ORBIT_TARGET[1], ORBIT_TARGET[2]);
  }, []);
  return (
    <>
      <PerspectiveCamera ref={ref} makeDefault fov={50} position={[9, 7, 9]} near={0.1} far={300} />
      <OrbitControls makeDefault target={ORBIT_TARGET} />
    </>
  );
}
