import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProject, createScene } from "@/domain/factories";
import type { Project } from "@/domain/types";
import { openDb, resetDbForTests } from "@/storage/db";
import { listProjects, loadProject, saveProject } from "@/storage/project-repo";
import {
  clearStashedProject,
  restoreStashedProjects,
  stashUnsavedProject,
} from "@/storage/unload-stash";

const STASH_KEY_PREFIX = "sb3d:unsaved:";

function edited(project: Project, updatedAt: string): Project {
  return { ...project, scenes: [...project.scenes, createScene("Stashed scene")], updatedAt };
}

beforeEach(async () => {
  await resetDbForTests();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("restoring a stash on load", () => {
  it("replays a stashed edit when the stored project is still the version it was based on", async () => {
    const stored = { ...createProject("Heist"), updatedAt: "2026-09-01T00:00:00.000Z" };
    await saveProject(stored);
    const unsaved = edited(stored, "2026-09-01T00:00:01.000Z");

    stashUnsavedProject(unsaved, stored.updatedAt);

    expect(await loadProject(stored.id)).toEqual(unsaved);
    expect(localStorage.getItem(STASH_KEY_PREFIX + stored.id)).toBeNull();
  });

  it("replays an undo, whose updatedAt is older than the stored one", async () => {
    // Undo applies Immer's inverse patches, which rewind updatedAt too, so
    // an unsaved undo is legitimately older than what IndexedDB holds.
    const before = { ...createProject("Heist"), updatedAt: "2026-09-01T00:00:00.000Z" };
    const after = edited(before, "2026-09-01T00:00:05.000Z");
    await saveProject(after);

    stashUnsavedProject(before, after.updatedAt);

    expect(await loadProject(before.id)).toEqual(before);
  });

  it("drops a stash when the stored project changed after the stash was based on it", async () => {
    const base = { ...createProject("Heist"), updatedAt: "2026-09-01T00:00:00.000Z" };
    const unsaved = edited(base, "2026-09-01T00:00:01.000Z");
    // Another tab took the lock after this one closed and saved newer work.
    const newer = { ...base, name: "Saved elsewhere", updatedAt: "2026-09-01T00:00:09.000Z" };
    await saveProject(newer);

    stashUnsavedProject(unsaved, base.updatedAt);

    expect(await loadProject(base.id)).toEqual(newer);
    expect(localStorage.getItem(STASH_KEY_PREFIX + base.id)).toBeNull();
  });

  it("does not bring back a project that was deleted", async () => {
    const gone = createProject("Deleted");
    stashUnsavedProject(edited(gone, "2026-09-01T00:00:01.000Z"), gone.updatedAt);

    expect(await loadProject(gone.id)).toBeNull();
    expect(await listProjects()).toEqual([]);
    expect(localStorage.getItem(STASH_KEY_PREFIX + gone.id)).toBeNull();
  });

  it("drops a stash that is not valid JSON or not a valid project, and still loads", async () => {
    const stored = createProject("Heist");
    await saveProject(stored);
    localStorage.setItem(STASH_KEY_PREFIX + stored.id, "{not json");
    localStorage.setItem(STASH_KEY_PREFIX + "other", JSON.stringify({ baseUpdatedAt: "x", project: { id: "other" } }));

    expect(await loadProject(stored.id)).toEqual(stored);
    expect(localStorage.getItem(STASH_KEY_PREFIX + stored.id)).toBeNull();
    expect(localStorage.getItem(STASH_KEY_PREFIX + "other")).toBeNull();
  });

  it("is reflected in the project list", async () => {
    const stored = { ...createProject("Heist"), updatedAt: "2026-09-01T00:00:00.000Z" };
    await saveProject(stored);
    stashUnsavedProject(edited(stored, "2026-09-01T00:00:01.000Z"), stored.updatedAt);

    const [summary] = await listProjects();
    expect(summary.sceneCount).toBe(1);
  });

  it("leaves unrelated localStorage keys alone", async () => {
    localStorage.setItem("theme", "dark");
    await listProjects();
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("keeps a stash whose IndexedDB write fails, so a later load can retry it", async () => {
    const stored = { ...createProject("Heist"), updatedAt: "2026-09-01T00:00:00.000Z" };
    await saveProject(stored);
    stashUnsavedProject(edited(stored, "2026-09-01T00:00:01.000Z"), stored.updatedAt);
    const db = await openDb();
    vi.spyOn(db, "put").mockRejectedValue(new Error("quota exceeded"));

    await expect(restoreStashedProjects(db)).resolves.toBeUndefined();

    expect(localStorage.getItem(STASH_KEY_PREFIX + stored.id)).not.toBeNull();
  });
});

describe("stashUnsavedProject", () => {
  it("does not throw when localStorage refuses the write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(() => stashUnsavedProject(createProject("Big"), "2026-09-01T00:00:00.000Z")).not.toThrow();
  });
});

describe("clearStashedProject", () => {
  it("removes only that project's stash", () => {
    const a = createProject("A");
    const b = createProject("B");
    stashUnsavedProject(a, a.updatedAt);
    stashUnsavedProject(b, b.updatedAt);

    clearStashedProject(a.id);

    expect(localStorage.getItem(STASH_KEY_PREFIX + a.id)).toBeNull();
    expect(localStorage.getItem(STASH_KEY_PREFIX + b.id)).not.toBeNull();
  });
});
