// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createPrimitive, createProject, createScene, createShot } from "@/domain/factories";
import { ProjectInvalidError, ProjectVersionError } from "@/domain/migrations";
import type { Project } from "@/domain/types";
import { exportFileName, exportProjectJson, importProjectJson } from "@/storage/export-import";

function buildProject(): Project {
  const project = createProject("Heist Night");
  const scene = createScene("Warehouse");
  scene.set.objects.push(createPrimitive("box"));
  scene.shots.push(createShot("Shot 01"));
  project.scenes.push(scene);
  return project;
}

describe("exportProjectJson", () => {
  it("produces an application/json blob with every shot.thumb stripped", async () => {
    const project = buildProject();
    project.scenes[0].shots[0].thumb = { blobKey: "thumb:1", stateHash: "abc" };

    const blob = exportProjectJson(project);
    expect(blob.type).toBe("application/json");

    const text = await blob.text();
    const parsed = JSON.parse(text);
    expect(parsed.scenes[0].shots[0].thumb).toBeUndefined();
  });
});

describe("exportFileName", () => {
  it("slugs the project name", () => {
    const project = createProject("My Film: Take 2");
    expect(exportFileName(project)).toBe("my-film-take-2.sb3d.json");
  });
});

describe("importProjectJson", () => {
  it("round trips a project, equal to the original apart from id, createdAt and updatedAt", async () => {
    const project = buildProject();
    const exported = exportProjectJson(project);

    const imported = await importProjectJson(exported);

    expect(imported.id).not.toBe(project.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit them
    const { id, createdAt, updatedAt, ...rest } = imported;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit them
    const { id: originalId, createdAt: originalCreatedAt, updatedAt: originalUpdatedAt, ...originalRest } = project;
    expect(rest).toEqual(originalRest);
  });

  it("strips thumb fields on import even if present in the file", async () => {
    const project = buildProject();
    project.scenes[0].shots[0].thumb = { blobKey: "thumb:1", stateHash: "abc" };
    const fileWithThumb = new Blob([JSON.stringify(project)], { type: "application/json" });

    const imported = await importProjectJson(fileWithThumb);
    expect(imported.scenes[0].shots[0].thumb).toBeUndefined();
  });

  it("rejects a newer schemaVersion with ProjectVersionError", async () => {
    const project = buildProject();
    const newer = { ...project, schemaVersion: 2 };
    const file = new Blob([JSON.stringify(newer)], { type: "application/json" });

    await expect(importProjectJson(file)).rejects.toThrow(ProjectVersionError);
  });

  it("rejects malformed JSON with ProjectInvalidError", async () => {
    const file = new Blob(["{not valid json"], { type: "application/json" });
    await expect(importProjectJson(file)).rejects.toThrow(ProjectInvalidError);
  });
});
