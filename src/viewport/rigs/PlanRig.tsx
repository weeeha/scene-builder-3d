import { useLayoutEffect, useRef } from "react";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { MOUSE } from "three";
import type { OrthographicCamera as ThreeOrthographicCamera } from "three";

const PLAN_TARGET: [number, number, number] = [0, 0, 0];
const PLAN_HEIGHT = 40;

/**
 * Top-down plan rig: an orthographic camera looking straight down the Y
 * axis, panned and zoomed with the left mouse button (rotate is off,
 * since a plan view has nothing to rotate to). The idea is Scene Builder
 * v2's top-down mode, rebuilt here without MapControls: OrbitControls
 * with rotate disabled and the left button remapped to pan does the same
 * job with a component this plan already depends on.
 */
export function PlanRig() {
  const ref = useRef<ThreeOrthographicCamera>(null);
  useLayoutEffect(() => {
    ref.current?.lookAt(PLAN_TARGET[0], PLAN_TARGET[1], PLAN_TARGET[2]);
  }, []);
  return (
    <>
      <OrthographicCamera ref={ref} makeDefault position={[0, PLAN_HEIGHT, 0.01]} zoom={28} near={0.1} far={300} />
      <OrbitControls
        makeDefault
        target={PLAN_TARGET}
        enableRotate={false}
        screenSpacePanning
        mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
      />
    </>
  );
}
