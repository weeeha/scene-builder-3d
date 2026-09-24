// @vitest-environment node
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteBlob, deleteProjectBlobs, getBlob, putBlob } from "@/storage/blob-store";
import { openDb, resetDbForTests } from "@/storage/db";
import type { BlobRecord } from "@/storage/db";

beforeEach(async () => {
  await resetDbForTests();
});

function makeBlob(text: string, type: string): Blob {
  return new Blob([text], { type });
}

describe("putBlob and getBlob", () => {
  it("round trips a blob's bytes and type", async () => {
    const blob = makeBlob("hello world", "text/plain");
    await putBlob({ key: "thumb:shot_1:abc", projectId: "proj_1", kind: "thumb", blob });

    const loaded = await getBlob("thumb:shot_1:abc");
    expect(loaded).not.toBeNull();
    expect(loaded!.type).toBe("text/plain");
    expect(loaded!.size).toBe(blob.size);
    await expect(loaded!.text()).resolves.toBe("hello world");
  });

  it("returns null for a missing key", async () => {
    expect(await getBlob("does-not-exist")).toBeNull();
  });

  it("stores the blob's bytes as an ArrayBuffer, not a Blob value (WebKit's ephemeral IndexedDB rejects a stored Blob)", async () => {
    await putBlob({ key: "thumb:1", projectId: "proj_1", kind: "thumb", blob: makeBlob("hi", "image/png") });

    const db = await openDb();
    const record = await db.get("blobs", "thumb:1");
    expect(record?.bytes).toBeInstanceOf(ArrayBuffer);
    expect(record).not.toHaveProperty("blob");
  });

  it("treats a pre-migration record (bytes as a size number alongside a blob field) as missing rather than throwing", async () => {
    const db = await openDb();
    // Simulates a record written by the old shape, before bytes held an
    // ArrayBuffer: bypasses putBlob to insert it directly, since putBlob
    // itself can no longer produce this shape.
    await db.put(
      "blobs",
      {
        key: "old:1",
        projectId: "proj_1",
        kind: "thumb",
        bytes: 5,
        blob: makeBlob("hello", "image/png"),
      } as unknown as BlobRecord
    );

    expect(await getBlob("old:1")).toBeNull();
  });
});

describe("deleteBlob", () => {
  it("removes a stored blob", async () => {
    await putBlob({ key: "clip:1", projectId: "proj_1", kind: "clip", blob: makeBlob("x", "video/mp4") });
    await deleteBlob("clip:1");
    expect(await getBlob("clip:1")).toBeNull();
  });
});

describe("deleteProjectBlobs", () => {
  it("removes every blob for a project but leaves another project's blobs", async () => {
    await putBlob({ key: "thumb:a", projectId: "proj_1", kind: "thumb", blob: makeBlob("a", "image/png") });
    await putBlob({ key: "thumb:b", projectId: "proj_1", kind: "thumb", blob: makeBlob("b", "image/png") });
    await putBlob({ key: "thumb:c", projectId: "proj_2", kind: "thumb", blob: makeBlob("c", "image/png") });

    await deleteProjectBlobs("proj_1");

    expect(await getBlob("thumb:a")).toBeNull();
    expect(await getBlob("thumb:b")).toBeNull();
    expect(await getBlob("thumb:c")).not.toBeNull();
  });
});
