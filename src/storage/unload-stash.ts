import type { IDBPDatabase } from "idb";
import { migrateProject } from "@/domain/migrations";
import type { Project } from "@/domain/types";
import type { Sb3dSchema } from "@/storage/db";

// Why this exists: the autosaver debounces IndexedDB writes, and an edit
// still waiting on that debounce when the page unloads cannot be saved to
// IndexedDB from pagehide. Measured with Playwright on 2026-09-26: a put
// started in pagehide never commits in Chromium (auto-commit waits for the
// success event, which the dying page never receives) or WebKit (it queues
// the request on a timer that never runs). localStorage is the only storage
// that writes synchronously, so pagehide stashes the unsaved document here
// and the next load writes it to IndexedDB.
const KEY_PREFIX = "sb3d:unsaved:";

type Stash = {
  // updatedAt of the version this tab last knew IndexedDB held: the one it
  // loaded, or the last one it saved. The stash only continues that version.
  baseUpdatedAt: string;
  project: Project;
};

function storage(): Storage | null {
  // Node test environments have no window; reading Node's own global
  // localStorage there prints a warning and returns undefined anyway.
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage ?? null;
  } catch {
    // Storage disabled (blocked site data, sandboxed frame).
    return null;
  }
}

/** Synchronously stashes a project's unsaved document. Safe to call from pagehide. */
export function stashUnsavedProject(project: Project, baseUpdatedAt: string): void {
  const stash: Stash = { baseUpdatedAt, project };
  try {
    storage()?.setItem(KEY_PREFIX + project.id, JSON.stringify(stash));
  } catch {
    // Quota exceeded: nothing else can write synchronously, so the edit
    // falls back to the best-effort IndexedDB flush, as before.
  }
}

/** Removes a project's stash, once a save has made its edit durable. */
export function clearStashedProject(projectId: string): void {
  try {
    storage()?.removeItem(KEY_PREFIX + projectId);
  } catch {
    // Storage disabled: there is no stash to remove.
  }
}

/**
 * Writes each stashed edit to IndexedDB, then removes its stash. A stash is
 * only written when the stored project is still the version it was based
 * on (matching updatedAt). Comparing which updatedAt is newer would be
 * wrong: undo rewinds updatedAt, and transient edits do not bump it. If
 * another tab saved the project in the meantime, or it was deleted, the
 * stash is dropped instead, so it never overwrites newer work.
 */
export async function restoreStashedProjects(db: IDBPDatabase<Sb3dSchema>): Promise<void> {
  const store = storage();
  if (!store) {
    return;
  }
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key?.startsWith(KEY_PREFIX)) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    const raw = store.getItem(key);
    let stash: Stash;
    try {
      const parsed = JSON.parse(raw ?? "") as { baseUpdatedAt?: unknown; project?: unknown };
      if (typeof parsed.baseUpdatedAt !== "string") {
        throw new Error("Stash has no baseUpdatedAt.");
      }
      stash = { baseUpdatedAt: parsed.baseUpdatedAt, project: migrateProject(parsed.project) };
    } catch {
      store.removeItem(key);
      continue;
    }

    try {
      // One readwrite transaction for the check and the write, so a save
      // from another writer cannot land between them.
      const tx = db.transaction("projects", "readwrite");
      const stored = await tx.store.get(stash.project.id);
      if (stored !== undefined && stored.updatedAt === stash.baseUpdatedAt) {
        await tx.store.put(stash.project);
      }
      await tx.done;
    } catch {
      // Keep the stash: IndexedDB failed, not the stash, so a later load
      // can try again.
      continue;
    }
    // Another tab's pagehide may have stashed a newer edit while this
    // awaited IndexedDB; that one is not handled yet.
    if (store.getItem(key) === raw) {
      store.removeItem(key);
    }
  }
}
