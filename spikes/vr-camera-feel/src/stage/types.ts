export type Vec3 = [number, number, number];
export type Transform = { position: Vec3; rotationY: number; scale: number };
export type PrimitiveShape = "box" | "cylinder" | "plane" | "sphere";
export type PoseName = "stand" | "walk" | "run" | "sit" | "crouch" | "point";
export type StageObject = {
  id: string;
  name: string;
  kind: "primitive" | "doll";
  shape?: PrimitiveShape; // primitives only
  color: string; // hex; dolls tint their capsules
  transform: Transform;
  pose?: PoseName; // dolls only; default "stand"
};
export type Stage = { v: 1; objects: StageObject[] };
export type Framing = { position: Vec3; aim: Vec3 };
export type ShotCamera = { v: 1; lensMm: number; start: Framing; end: Framing };
export type ShotOverrides = {
  v: 1;
  objects: Record<string, Partial<Pick<StageObject, "transform" | "pose">> & { visible?: boolean }>;
};
