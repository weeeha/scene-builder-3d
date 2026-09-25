// @vitest-environment node
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { DB_NAME, openDb, resetDbForTests } from "@/storage/db";

beforeEach(async () => {
  await resetDbForTests();
});

describe("openDb", () => {
  it("opens a database named sb3d with the projects, blobs and meta stores", async () => {
    const db = await openDb();
    expect(db.name).toBe(DB_NAME);
    expect(Array.from(db.objectStoreNames).sort()).toEqual(["blobs", "meta", "projects"]);
  });

  it("the blobs store has a byProject index", async () => {
    const db = await openDb();
    const tx = db.transaction("blobs", "readonly");
    expect(Array.from(tx.store.indexNames)).toEqual(["byProject"]);
  });
});
