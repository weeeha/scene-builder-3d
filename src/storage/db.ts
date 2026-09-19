import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Project } from "@/domain/types";

export type BlobKind = "glb" | "thumb" | "clip";
export type BlobRecord = { key: string; projectId: string; kind: BlobKind; bytes: number; blob: Blob };

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
