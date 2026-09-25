export type Vec3 = [number, number, number];
export type Transform = { position: Vec3; rotationY: number; scale: number };
export type Keyframe = { t: number; value: Vec3 };
export type Framing = { position: Vec3; aim: Vec3 };
export type PoseName = "stand" | "walk" | "run" | "sit" | "crouch" | "point";
export type PrimitiveShape = "box" | "cylinder" | "sphere" | "plane" | "wall";

export type StageObjectBase = {
  id: string;
  name: string;
  transform: Transform;
  visible: boolean;
};

export type PrimitiveObject = StageObjectBase & {
  kind: "primitive";
  shape: PrimitiveShape;
  size: Vec3;
  color: string;
};

export type DollObject = StageObjectBase & {
  kind: "doll";
  pose: PoseName;
  color: string;
};

export type PropObject = StageObjectBase & {
  kind: "prop";
  assetId: string;
  tint?: string;
};

export type StageObject = PrimitiveObject | DollObject | PropObject;

export type PropAsset = {
  id: string;
  name: string;
  tags: string[];
  source: "import" | "kit";
  blobKey?: string;
  kitId?: string;
  bounds: Vec3;
  unitScale: number;
  thumbKey?: string;
};

export type ObjectOverride = {
  transform?: Transform;
  pose?: PoseName;
  visible?: boolean;
};

export type ShotCamera = {
  lensMm: number;
  position: Keyframe[];
  aim: Keyframe[];
};

export type ShotType = "WIDE" | "MED" | "CU" | "POV";

export type Shot = {
  id: string;
  name: string;
  type: ShotType;
  durationSec: number;
  camera: ShotCamera;
  overrides: Record<string, ObjectOverride>;
  thumb?: { blobKey: string; stateHash: string };
};

export type Scene = {
  id: string;
  name: string;
  notes: string;
  set: { objects: StageObject[] };
  shots: Shot[];
};

export type Project = {
  id: string;
  name: string;
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  lastExportedAt?: string;
  scenes: Scene[];
  props: PropAsset[];
};
