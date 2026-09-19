// @vitest-environment node
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteBlob, deleteProjectBlobs, getBlob, putBlob } from "@/storage/blob-store";
import { resetDbForTests } from "@/storage/db";

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
