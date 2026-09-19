// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createPrimitive, createProject, createScene, createShot } from "@/domain/factories";
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
});
