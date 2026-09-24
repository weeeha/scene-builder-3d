import { openDb } from "@/storage/db";
import type { BlobKind } from "@/storage/db";

export async function putBlob(rec: { key: string; projectId: string; kind: BlobKind; blob: Blob }): Promise<void> {
  const db = await openDb();
  const bytes = await rec.blob.arrayBuffer();
  await db.put("blobs", { key: rec.key, projectId: rec.projectId, kind: rec.kind, type: rec.blob.type, bytes });
}

export async function getBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  const record = await db.get("blobs", key);
  if (!record) return null;
  // A record written before this ArrayBuffer migration held its payload
  // under a different shape (bytes as a size number, plus a separate blob
  // field). Nothing is deployed with real data yet, so such a record is
  // simply treated as missing rather than migrated or thrown on.
  if (!(record.bytes instanceof ArrayBuffer)) return null;
  return new Blob([record.bytes], { type: record.type });
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
