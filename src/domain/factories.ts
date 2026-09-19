import { newId } from "@/domain/ids";
import type { DollObject, PrimitiveObject, PrimitiveShape, Project, Scene, Shot, Transform, Vec3 } from "@/domain/types";

function defaultTransform(): Transform {
  return { position: [0, 0, 0], rotationY: 0, scale: 1 };
}

const PRIMITIVE_SIZE: Record<PrimitiveShape, Vec3> = {
  box: [1, 1, 1],
  cylinder: [1, 1, 1],
  sphere: [1, 1, 1],
  plane: [4, 0.02, 4],
  wall: [4, 2.5, 0.2],
};

const PRIMITIVE_NAME: Record<PrimitiveShape, string> = {
  box: "Box",
  cylinder: "Cylinder",
  sphere: "Sphere",
  plane: "Plane",
  wall: "Wall",
};

// Neither the spec nor the plan contract states a default object color, so
// these are a plain neutral pick, not a value any test in this repo
// asserts on.
const PRIMITIVE_DEFAULT_COLOR = "#8a8f98";
const DOLL_DEFAULT_COLOR = "#c97b4a";

export function createProject(name: string): Project {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    scenes: [],
    props: [],
  };
}

export function createScene(name: string): Scene {
  return {
    id: newId(),
    name,
    notes: "",
    set: { objects: [] },
    shots: [],
  };
}

export function createShot(name: string): Shot {
  return {
    id: newId(),
    name,
    // Not specified by the spec or the plan contract; WIDE is the first of
    // the four ShotType values and the least presumptive default.
    type: "WIDE",
    durationSec: 4,
    camera: {
      lensMm: 35,
      position: [{ t: 0, value: [0, 1.6, 6] }],
      aim: [{ t: 0, value: [0, 1, 0] }],
    },
    overrides: {},
  };
}

export function createPrimitive(shape: PrimitiveShape): PrimitiveObject {
  return {
    id: newId(),
    name: PRIMITIVE_NAME[shape],
    kind: "primitive",
    shape,
    size: [...PRIMITIVE_SIZE[shape]],
    color: PRIMITIVE_DEFAULT_COLOR,
    transform: defaultTransform(),
    visible: true,
  };
}

export function createDoll(): DollObject {
  return {
    id: newId(),
    name: "Doll",
    kind: "doll",
    pose: "stand",
    color: DOLL_DEFAULT_COLOR,
    transform: defaultTransform(),
    visible: true,
  };
}
