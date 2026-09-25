// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createDoll, createPrimitive, createProject, createScene, createShot } from "@/domain/factories";
import { CURRENT_SCHEMA_VERSION, projectSchema } from "@/domain/schema";

describe("CURRENT_SCHEMA_VERSION", () => {
  it("is 1", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });
});

describe("projectSchema", () => {
  it("accepts a valid v1 project built from the factories", () => {
    const project = createProject("Heist");
    const scene = createScene("Warehouse");
    scene.set.objects.push(createPrimitive("box"));
    scene.shots.push(createShot("Shot 01"));
    project.scenes.push(scene);

    const result = projectSchema.safeParse(project);
    expect(result.success).toBe(true);
  });

  it("rejects a project with an unknown primitive shape", () => {
    const project = createProject("Heist");
    const scene = createScene("Warehouse");
    const box = createPrimitive("box");
    scene.set.objects.push({ ...box, shape: "cone" } as unknown as typeof box);
    project.scenes.push(scene);

    const result = projectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it("rejects a project with an extra unknown top-level field", () => {
    const project = createProject("Heist");
    const withExtra = { ...project, totallyMadeUpField: "surprise" };

    const result = projectSchema.safeParse(withExtra);
    expect(result.success).toBe(false);
  });

  it("rejects a doll object carrying a field that belongs to a different kind (shape)", () => {
    const project = createProject("Heist");
    const scene = createScene("Warehouse");
    const doll = createDoll();
    scene.set.objects.push({ ...doll, shape: "box" } as unknown as typeof doll);
    project.scenes.push(scene);

    const result = projectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it("rejects a shot with an extra unknown field", () => {
    const project = createProject("Heist");
    const scene = createScene("Warehouse");
    const shot = createShot("Shot 01");
    scene.shots.push({ ...shot, extraShotField: true } as unknown as typeof shot);
    project.scenes.push(scene);

    const result = projectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it("rejects a transform with an extra unknown field", () => {
    const project = createProject("Heist");
    const scene = createScene("Warehouse");
    const box = createPrimitive("box");
    const boxWithBadTransform = {
      ...box,
      transform: { ...box.transform, extraTransformField: 1 },
    };
    scene.set.objects.push(boxWithBadTransform as unknown as typeof box);
    project.scenes.push(scene);

    const result = projectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it("parses a full valid project and returns a deep-equal result", () => {
    const project = createProject("Heist");
    const scene = createScene("Warehouse");
    scene.set.objects.push(createPrimitive("box"));
    scene.set.objects.push(createDoll());
    scene.shots.push(createShot("Shot 01"));
    project.scenes.push(scene);

    const parsed = projectSchema.parse(project);
    expect(parsed).toEqual(project);
  });
});
