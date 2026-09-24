import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Project } from "@/domain/types";

export type BlobKind = "glb" | "thumb" | "clip";
// bytes holds the raw payload as an ArrayBuffer, not a Blob: WebKit's
// ephemeral IndexedDB (private windows, and Playwright's default webkit
// context) rejects a Blob value in a put with "UnknownError: Error
// preparing Blob/File data to be stored in object store", while a
// persistent WebKit profile accepts either. An ArrayBuffer round trips in
// every environment, so blob-store.ts stores one plus the MIME type and
// rebuilds a Blob on read.
export type BlobRecord = { key: string; projectId: string; kind: BlobKind; type: string; bytes: ArrayBuffer };

export interface Sb3dSchema extends DBSchema {
  projects: { key: string; value: Project };
  blobs: { key: string; value: BlobRecord; indexes: { byProject: string } };
  meta: { key: string; value: unknown };
}

export const DB_NAME = "sb3d";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<Sb3dSchema>> | null = null;

/** Opens (and lazily creates) the app's single IndexedDB database. Safe to call repeatedly: the same connection is reused. */
export function openDb(): Promise<IDBPDatabase<Sb3dSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<Sb3dSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("projects", { keyPath: "id" });
        const blobs = db.createObjectStore("blobs", { keyPath: "key" });
        blobs.createIndex("byProject", "projectId");
        db.createObjectStore("meta");
      },
    });
  }
  return dbPromise;
}

/** Closes and deletes the database. Test-only: gives each test a clean database. */
export async function resetDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  await deleteDB(DB_NAME);
}
