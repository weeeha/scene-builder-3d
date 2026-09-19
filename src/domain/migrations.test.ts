// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createDoll, createPrimitive, createProject, createScene, createShot } from "@/domain/factories";
import { migrateProject, ProjectInvalidError, ProjectVersionError } from "@/domain/migrations";

describe("migrateProject", () => {
  it("passes a valid v1 document through, fully parsed", () => {
    const project = createProject("Heist");
    const scene = createScene("Warehouse");
    scene.set.objects.push(createPrimitive("box"));
    scene.shots.push(createShot("Shot 01"));
    project.scenes.push(scene);

    const result = migrateProject(project);
    expect(result).toEqual(project);
  });

  it("throws ProjectVersionError for a document newer than this app", () => {
    const project = createProject("Heist");
    const newerProject = { ...project, schemaVersion: 2 };
    expect(() => migrateProject(newerProject)).toThrow(ProjectVersionError);
  });

  it("throws ProjectInvalidError for a document missing scenes", () => {
    const project = createProject("Heist");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit it
    const { scenes, ...withoutScenes } = project;
    expect(() => migrateProject(withoutScenes)).toThrow(ProjectInvalidError);
  });

  it("throws ProjectInvalidError for a non-object", () => {
    expect(() => migrateProject("not a project")).toThrow(ProjectInvalidError);
    expect(() => migrateProject(null)).toThrow(ProjectInvalidError);
    expect(() => migrateProject(42)).toThrow(ProjectInvalidError);
  });

  it("throws ProjectInvalidError for a document with an extra unknown top-level field", () => {
    const project = createProject("Heist");
    const withExtra = { ...project, totallyMadeUpField: "surprise" };
    expect(() => migrateProject(withExtra)).toThrow(ProjectInvalidError);
  });

  it("throws ProjectInvalidError for a doll object carrying a field that belongs to a different kind (shape)", () => {
    const project = createProject("Heist");
    const scene = createScene("Warehouse");
    const doll = createDoll();
    scene.set.objects.push({ ...doll, shape: "box" } as unknown as typeof doll);
    project.scenes.push(scene);

    expect(() => migrateProject(project)).toThrow(ProjectInvalidError);
  });

  it("throws ProjectInvalidError for a nested object carrying an extra unknown field", () => {
    const project = createProject("Heist");
    const scene = createScene("Warehouse");
    const shot = createShot("Shot 01");
    scene.shots.push({ ...shot, extraShotField: true } as unknown as typeof shot);
    project.scenes.push(scene);

    expect(() => migrateProject(project)).toThrow(ProjectInvalidError);
  });
});
