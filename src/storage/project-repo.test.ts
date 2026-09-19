// @vitest-environment node
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createProject, createScene } from "@/domain/factories";
import { getBlob, putBlob } from "@/storage/blob-store";
import { resetDbForTests } from "@/storage/db";
import { deleteProject, listProjects, loadProject, saveProject } from "@/storage/project-repo";

beforeEach(async () => {
  await resetDbForTests();
});

describe("saveProject and loadProject", () => {
  it("round trips a project", async () => {
    const project = createProject("Heist");
    await saveProject(project);
    const loaded = await loadProject(project.id);
    expect(loaded).toEqual(project);
  });

  it("returns null for a missing id", async () => {
    expect(await loadProject("does-not-exist")).toBeNull();
  });
});

describe("listProjects", () => {
  it("lists projects newest first, with sceneCount", async () => {
    const older = { ...createProject("Older"), updatedAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...createProject("Newer"), updatedAt: "2026-02-01T00:00:00.000Z" };
    newer.scenes.push(createScene("Scene A"), createScene("Scene B"));
    await saveProject(older);
    await saveProject(newer);

    const summaries = await listProjects();
    expect(summaries).toEqual([
      { id: newer.id, name: "Newer", updatedAt: newer.updatedAt, sceneCount: 2 },
      { id: older.id, name: "Older", updatedAt: older.updatedAt, sceneCount: 0 },
    ]);
  });
});

describe("deleteProject", () => {
  it("removes the project document and its blobs, but not another project's blobs", async () => {
    const projectA = createProject("A");
    const projectB = createProject("B");
    await saveProject(projectA);
    await saveProject(projectB);
    await putBlob({ key: "thumb:a", projectId: projectA.id, kind: "thumb", blob: new Blob(["a"], { type: "image/png" }) });
    await putBlob({ key: "thumb:b", projectId: projectB.id, kind: "thumb", blob: new Blob(["b"], { type: "image/png" }) });

    await deleteProject(projectA.id);

    expect(await loadProject(projectA.id)).toBeNull();
    expect(await loadProject(projectB.id)).not.toBeNull();
    expect(await getBlob("thumb:a")).toBeNull();
    expect(await getBlob("thumb:b")).not.toBeNull();
  });
});
