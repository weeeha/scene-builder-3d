import { z } from "zod";
import type { Project } from "@/domain/types";

const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

const transformSchema = z.strictObject({
  position: vec3Schema,
  rotationY: z.number(),
  scale: z.number(),
});

const keyframeSchema = z.strictObject({
  t: z.number(),
  value: vec3Schema,
});

const poseNameSchema = z.enum(["stand", "walk", "run", "sit", "crouch", "point"]);
const primitiveShapeSchema = z.enum(["box", "cylinder", "sphere", "plane", "wall"]);

const stageObjectBase = {
  id: z.string(),
  name: z.string(),
  transform: transformSchema,
  visible: z.boolean(),
};

const primitiveObjectSchema = z.strictObject({
  ...stageObjectBase,
  kind: z.literal("primitive"),
  shape: primitiveShapeSchema,
  size: vec3Schema,
  color: z.string(),
});

const dollObjectSchema = z.strictObject({
  ...stageObjectBase,
  kind: z.literal("doll"),
  pose: poseNameSchema,
  color: z.string(),
});

const propObjectSchema = z.strictObject({
  ...stageObjectBase,
  kind: z.literal("prop"),
  assetId: z.string(),
  tint: z.string().optional(),
});

const stageObjectSchema = z.discriminatedUnion("kind", [
  primitiveObjectSchema,
  dollObjectSchema,
  propObjectSchema,
]);

const propAssetSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()),
  source: z.enum(["import", "kit"]),
  blobKey: z.string().optional(),
  kitId: z.string().optional(),
  bounds: vec3Schema,
  unitScale: z.number(),
  thumbKey: z.string().optional(),
});

const objectOverrideSchema = z.strictObject({
  transform: transformSchema.optional(),
  pose: poseNameSchema.optional(),
  visible: z.boolean().optional(),
});

const shotCameraSchema = z.strictObject({
  lensMm: z.number(),
  position: z.array(keyframeSchema),
  aim: z.array(keyframeSchema),
});

const shotTypeSchema = z.enum(["WIDE", "MED", "CU", "POV"]);

const shotThumbSchema = z.strictObject({
  blobKey: z.string(),
  stateHash: z.string(),
});

const shotSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  type: shotTypeSchema,
  durationSec: z.number(),
  camera: shotCameraSchema,
  overrides: z.record(z.string(), objectOverrideSchema),
  thumb: shotThumbSchema.optional(),
});

const sceneSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  notes: z.string(),
  set: z.strictObject({ objects: z.array(stageObjectSchema) }),
  shots: z.array(shotSchema),
});

export const CURRENT_SCHEMA_VERSION = 1;

export const projectSchema: z.ZodType<Project> = z.strictObject({
  id: z.string(),
  name: z.string(),
  schemaVersion: z.literal(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastExportedAt: z.string().optional(),
  scenes: z.array(sceneSchema),
  props: z.array(propAssetSchema),
});
