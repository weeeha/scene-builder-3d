import type { Ref } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group } from "three";

import { DOLL, POSES } from "@/domain/poses";
import type { DollObject, Vec3 } from "@/domain/types";

const SELECT_RING_GOLD = "#d4af37";
const HIP_SPREAD_X = 0.09;
const NECK_GAP = 0.05;

type Segment = { length: number; radius: number };

type LimbProps = {
  position: Vec3;
  rootRotation: Vec3;
  midRotation: Vec3;
  upper: Segment;
  lower: Segment;
  color: string;
};

/**
 * A two-segment limb (arm or leg) hanging down -Y from its root joint.
 * The mid joint (elbow/knee) is nested inside the root joint's group, so
 * rotating the shoulder/hip carries the forearm/shin with it.
 */
function Limb({ position, rootRotation, midRotation, upper, lower, color }: LimbProps) {
  return (
    <group position={position} rotation={rootRotation}>
      <mesh position-y={-upper.length / 2}>
        <capsuleGeometry args={[upper.radius, upper.length - upper.radius * 2, 4, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <group position-y={-upper.length} rotation={midRotation}>
        <mesh position-y={-lower.length / 2}>
          <capsuleGeometry args={[lower.radius, lower.length - lower.radius * 2, 4, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    </group>
  );
}

type DollMeshProps = {
  object: DollObject;
  selected: boolean;
  visible?: boolean;
  onSelect?: (event: ThreeEvent<MouseEvent>) => void;
  ref?: Ref<Group>;
};

/**
 * The mannequin: sphere head plus capsule torso/limbs sized per DOLL, with
 * joints rotated per POSES[pose]. The root group sits at floor level (feet
 * at local y = 0, pelvis lifted by hipHeight). When selected, a flat gold
 * ring lies at the doll's feet as a rotate affordance.
 */
export function DollMesh({ object, selected, visible = true, onSelect, ref }: DollMeshProps) {
  const pose = POSES[object.pose];
  const color = object.color;
  const { position, rotationY, scale } = object.transform;
  const shoulderX = DOLL.torso.radius + DOLL.upperArm.radius;
  const shoulderY = DOLL.torso.height - 0.05;

  return (
    <group
      ref={ref}
      name={`obj:${object.id}`}
      visible={visible}
      position={position}
      rotation-y={rotationY}
      scale={scale}
      onClick={onSelect}
    >
      <group position-y={DOLL.hipHeight}>
        <mesh position-y={DOLL.torso.height / 2}>
          <capsuleGeometry args={[DOLL.torso.radius, DOLL.torso.height - DOLL.torso.radius * 2, 4, 12]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <group position-y={DOLL.torso.height} rotation={pose.neck}>
          <mesh position-y={DOLL.headRadius + NECK_GAP}>
            <sphereGeometry args={[DOLL.headRadius, 16, 12]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
        <Limb
          position={[-shoulderX, shoulderY, 0]}
          rootRotation={pose.shoulderL}
          midRotation={pose.elbowL}
          upper={DOLL.upperArm}
          lower={DOLL.foreArm}
          color={color}
        />
        <Limb
          position={[shoulderX, shoulderY, 0]}
          rootRotation={pose.shoulderR}
          midRotation={pose.elbowR}
          upper={DOLL.upperArm}
          lower={DOLL.foreArm}
          color={color}
        />
        <Limb
          position={[-HIP_SPREAD_X, 0, 0]}
          rootRotation={pose.hipL}
          midRotation={pose.kneeL}
          upper={DOLL.thigh}
          lower={DOLL.shin}
          color={color}
        />
        <Limb
          position={[HIP_SPREAD_X, 0, 0]}
          rootRotation={pose.hipR}
          midRotation={pose.kneeR}
          upper={DOLL.thigh}
          lower={DOLL.shin}
          color={color}
        />
      </group>
      {selected && (
        <mesh position-y={0.02} rotation-x={-Math.PI / 2}>
          <torusGeometry args={[0.45, 0.025, 8, 48]} />
          <meshBasicMaterial color={SELECT_RING_GOLD} />
        </mesh>
      )}
    </group>
  );
}
