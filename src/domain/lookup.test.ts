// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createProject, createScene, createShot } from "@/domain/factories";
import { findScene, findShot } from "@/domain/lookup";

describe("findScene", () => {
  it("finds a scene by id", () => {
    const project = createProject("P");
    const scene = createScene("Scene 1");
    project.scenes.push(scene);

    expect(findScene(project, scene.id)).toBe(scene);
  });

  it("returns null for an id that matches no scene", () => {
    const project = createProject("P");
    expect(findScene(project, "missing")).toBeNull();
  });
});

describe("findShot", () => {
  it("finds a shot and its owning scene", () => {
    const project = createProject("P");
    const scene = createScene("Scene 1");
    const shot = createShot("Shot 01");
    scene.shots.push(shot);
    project.scenes.push(scene);

    const result = findShot(project, shot.id);
    expect(result).not.toBeNull();
    expect(result!.scene).toBe(scene);
    expect(result!.shot).toBe(shot);
  });

  it("returns null for an id that matches no shot in any scene", () => {
    const project = createProject("P");
    const scene = createScene("Scene 1");
    scene.shots.push(createShot("Shot 01"));
    project.scenes.push(scene);

    expect(findShot(project, "missing")).toBeNull();
  });
});
