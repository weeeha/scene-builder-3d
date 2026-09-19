import type { Ref } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { DoubleSide } from "three";
import type { Group } from "three";

import type { PrimitiveObject, PrimitiveShape, Vec3 } from "@/domain/types";

type PrimitiveMeshProps = {
  object: PrimitiveObject;
  visible?: boolean;
  onSelect?: (event: ThreeEvent<MouseEvent>) => void;
  ref?: Ref<Group>;
};

function ShapeMesh({ shape, size, color }: { shape: PrimitiveShape; size: Vec3; color: string }) {
  const [width, height, depth] = size;
  switch (shape) {
    case "cylinder":
      return (
        <mesh position-y={height / 2}>
          <cylinderGeometry args={[width / 2, width / 2, height, 20]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );
    case "plane":
      // Lies flat on the floor; lifted a hair to avoid z-fighting the grid.
      return (
        <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial color={color} side={DoubleSide} />
        </mesh>
      );
    case "sphere":
      return (
        <mesh position-y={width / 2}>
          <sphereGeometry args={[width / 2, 24, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );
    case "wall":
      return (
        <mesh position-y={height / 2}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );
    case "box":
    default:
      return (
        <mesh position-y={height / 2}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );
  }
}

/** A PrimitiveObject, positioned per its transform. Shapes sit on the floor (y = 0). */
export function PrimitiveMesh({ object, visible = true, onSelect, ref }: PrimitiveMeshProps) {
  const { position, rotationY, scale } = object.transform;
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
      <ShapeMesh shape={object.shape} size={object.size} color={object.color} />
    </group>
  );
}
