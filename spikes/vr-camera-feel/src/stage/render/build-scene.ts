import {
  AmbientLight,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
} from "three";

import { lensToVFovDeg } from "@/stage/lens";
import { DOLL, POSES } from "@/stage/poses";
import { STAGE_BACKGROUND } from "@/stage/render/clip-constants";
import type { ShotCamera, StageObject, Vec3 } from "@/stage/types";

/**
 * Pure three.js (no React) construction of the same visual world the R3F
 * viewport shows, for the deterministic clip renderer. Doll/pose numbers come
 * from `@/stage/poses` (single source of truth); only the scene-graph
 * assembly duplicates `doll-mesh.tsx` / `primitive-mesh.tsx` — keep them in
 * sync when either changes.
 */

const CLIP_ASPECT = 21 / 9;

// Keep in sync with doll-mesh.tsx.
const HIP_SPREAD_X = 0.09;
const NECK_GAP = 0.05;

type Segment = { length: number; radius: number };

function capsuleMesh(segment: Segment, radialSegments: number, material: MeshStandardMaterial): Mesh {
  const geometry = new CapsuleGeometry(segment.radius, segment.length - segment.radius * 2, 4, radialSegments);
  return new Mesh(geometry, material);
}

/**
 * A two-segment limb (arm or leg) hanging down -Y from its root joint. The
 * mid joint (elbow/knee) group is nested inside the root joint's group, so
 * rotating the shoulder/hip carries the forearm/shin with it.
 */
function buildLimb(
  position: Vec3,
  rootRotation: Vec3,
  midRotation: Vec3,
  upper: Segment,
  lower: Segment,
  material: MeshStandardMaterial,
): Group {
  const root = new Group();
  root.position.set(...position);
  root.rotation.set(...rootRotation);

  const upperMesh = capsuleMesh(upper, 10, material);
  upperMesh.position.y = -upper.length / 2;
  root.add(upperMesh);

  const mid = new Group();
  mid.position.y = -upper.length;
  mid.rotation.set(...midRotation);
  const lowerMesh = capsuleMesh(lower, 10, material);
  lowerMesh.position.y = -lower.length / 2;
  mid.add(lowerMesh);
  root.add(mid);

  return root;
}

/**
 * The mannequin: sphere head plus capsule torso/limbs sized per DOLL, joints
 * rotated per POSES[pose]. Children are added to `root` with the pelvis
 * lifted by hipHeight so the feet rest at local y=0.
 */
function buildDoll(root: Group, object: StageObject): void {
  const pose = POSES[object.pose ?? "stand"];
  const material = new MeshStandardMaterial({ color: new Color(object.color) });

  const pelvis = new Group();
  pelvis.position.y = DOLL.hipHeight;

  // torso, pelvis to shoulders
  const torso = capsuleMesh({ length: DOLL.torso.height, radius: DOLL.torso.radius }, 12, material);
  torso.position.y = DOLL.torso.height / 2;
  pelvis.add(torso);

  // head on the neck joint
  const neck = new Group();
  neck.position.y = DOLL.torso.height;
  neck.rotation.set(...pose.neck);
  const head = new Mesh(new SphereGeometry(DOLL.headRadius, 16, 12), material);
  head.position.y = DOLL.headRadius + NECK_GAP;
  neck.add(head);
  pelvis.add(neck);

  // arms
  const shoulderX = DOLL.torso.radius + DOLL.upperArm.radius;
  const shoulderY = DOLL.torso.height - 0.05;
  pelvis.add(buildLimb([-shoulderX, shoulderY, 0], pose.shoulderL, pose.elbowL, DOLL.upperArm, DOLL.foreArm, material));
  pelvis.add(buildLimb([shoulderX, shoulderY, 0], pose.shoulderR, pose.elbowR, DOLL.upperArm, DOLL.foreArm, material));

  // legs
  pelvis.add(buildLimb([-HIP_SPREAD_X, 0, 0], pose.hipL, pose.kneeL, DOLL.thigh, DOLL.shin, material));
  pelvis.add(buildLimb([HIP_SPREAD_X, 0, 0], pose.hipR, pose.kneeR, DOLL.thigh, DOLL.shin, material));

  root.add(pelvis);
}

/** A StageObject of kind "primitive". Shapes sit on the floor (y=0). */
function buildPrimitive(root: Group, object: StageObject): void {
  const material = new MeshStandardMaterial({ color: new Color(object.color) });

  switch (object.shape ?? "box") {
    case "cylinder": {
      const mesh = new Mesh(new CylinderGeometry(0.35, 0.35, 1, 20), material);
      mesh.position.y = 0.5;
      root.add(mesh);
      break;
    }
    case "plane": {
      // 4x4m, lying horizontally; lifted a hair to avoid z-fighting the grid.
      material.side = DoubleSide;
      const mesh = new Mesh(new PlaneGeometry(4, 4), material);
      mesh.position.y = 0.01;
      mesh.rotation.x = -Math.PI / 2;
      root.add(mesh);
      break;
    }
    case "sphere": {
      const mesh = new Mesh(new SphereGeometry(0.5, 24, 16), material);
      mesh.position.y = 0.5;
      root.add(mesh);
      break;
    }
    default: {
      const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
      mesh.position.y = 0.5;
      root.add(mesh);
      break;
    }
  }
}

/**
 * Builds the stage world: neutral background, fixed lights (determinism),
 * 20x20 grid, and one named group per object carrying its transform.
 */
export function buildStageScene(objects: StageObject[]): Scene {
  const scene = new Scene();
  scene.background = new Color(STAGE_BACKGROUND);

  scene.add(new AmbientLight(0xffffff, 0.7));
  const sun = new DirectionalLight(0xffffff, 1.4);
  sun.position.set(5, 10, 4);
  scene.add(sun);

  scene.add(new GridHelper(20, 20, 0x5b6472, 0x3a4048));

  for (const object of objects) {
    const root = new Group();
    root.name = object.id;
    const { position, rotationY, scale } = object.transform;
    root.position.set(...position);
    root.rotation.y = rotationY;
    root.scale.setScalar(scale);
    if (object.kind === "doll") {
      buildDoll(root, object);
    } else {
      buildPrimitive(root, object);
    }
    scene.add(root);
  }

  return scene;
}

/** The shot camera at the clip's fixed 21:9 aspect; fov derives from the lens. */
export function buildShotCamera(camera: ShotCamera): PerspectiveCamera {
  return new PerspectiveCamera(lensToVFovDeg(camera.lensMm), CLIP_ASPECT, 0.1, 200);
}
