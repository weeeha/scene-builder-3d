import { openDb } from "@/storage/db";
import type { BlobKind } from "@/storage/db";

export async function putBlob(rec: { key: string; projectId: string; kind: BlobKind; blob: Blob }): Promise<void> {
  const db = await openDb();
  await db.put("blobs", { key: rec.key, projectId: rec.projectId, kind: rec.kind, bytes: rec.blob.size, blob: rec.blob });
}

export async function getBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  const record = await db.get("blobs", key);
  return record ? record.blob : null;
}

export async function deleteBlob(key: string): Promise<void> {
  const db = await openDb();
  await db.delete("blobs", key);
}

export async function deleteProjectBlobs(projectId: string): Promise<void> {
  const db = await openDb();
  const keys = await db.getAllKeysFromIndex("blobs", "byProject", projectId);
  await Promise.all(keys.map((key) => db.delete("blobs", key)));
}
