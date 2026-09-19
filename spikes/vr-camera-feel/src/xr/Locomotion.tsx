import { useRef, useState } from "react";
import { TeleportTarget, XROrigin, useXRControllerLocomotion } from "@react-three/xr";
import { Vector3, type Group } from "three";

/** The operator's feet. Teleport moves the origin, the left stick snap-turns it. Nothing else moves the view. */
export function Locomotion() {
  const origin = useRef<Group>(null);
  const [position, setPosition] = useState(() => new Vector3(0, 0, 0));

  // translation off, snap rotation 45 degrees, translation hand "right" so that rotation lands on the LEFT stick
  useXRControllerLocomotion(origin, false, { type: "snap", degrees: 45 }, "right");

  return (
    <>
      <XROrigin ref={origin} position={position} />
      <TeleportTarget onTeleport={setPosition}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -3]}>
          <planeGeometry args={[20, 20]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </TeleportTarget>
    </>
  );
}
