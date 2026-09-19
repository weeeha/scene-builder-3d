import { create } from "zustand";
import { applyPatches, enablePatches, produce, produceWithPatches, type Patch } from "immer";

import type { Project } from "@/domain/types";
import type { SaveStatus } from "@/storage/autosave";

enablePatches();

const HISTORY_LIMIT = 100;

type HistoryEntry = { patches: Patch[]; inversePatches: Patch[] };

export type DocumentState = {
  project: Project | null;
  readOnly: boolean;
  saveStatus: SaveStatus;
  saveFailures: number;
  canUndo: boolean;
  canRedo: boolean;
  load(project: Project, opts?: { readOnly?: boolean }): void;
  close(): void;
  apply(recipe: (draft: Project) => void): void;
  applyTransient(recipe: (draft: Project) => void): void;
  undo(): void;
  redo(): void;
};

// Undo and redo live outside the Zustand state on purpose: they hold
// Immer patches, not document data, and must never be persisted or show up
// in a state snapshot. load() and close() are the only things that reset
// them, which is also how tests get a clean slate between cases (see the
// resetStore() helper in document-store.test.ts).
let undoStack: HistoryEntry[] = [];
let redoStack: HistoryEntry[] = [];
let autosaver: { schedule(p: Project): void } | null = null;

/** Wires apply/applyTransient/undo/redo to a real autosaver. Tests pass
 * null to silence saving, or a stub to assert on schedule() calls. */
export function setAutosaver(a: { schedule(p: Project): void } | null): void {
  autosaver = a;
}

/** True when the only thing that changed is the updatedAt bump apply()
 * adds itself, meaning the caller's recipe made no real change. */
function isUpdatedAtOnly(patches: Patch[]): boolean {
  return patches.length === 1 && patches[0].path.length === 1 && patches[0].path[0] === "updatedAt";
}

export const useDocumentStore = create<DocumentState>()((set, get) => ({
  project: null,
  readOnly: false,
  saveStatus: "idle",
  saveFailures: 0,
  canUndo: false,
  canRedo: false,

  load(project, opts) {
    undoStack = [];
    redoStack = [];
    // A no-op produce still runs the project through Immer's autoFreeze, so
    // the stored document is frozen from the moment it lands here, not only
    // after the first apply/applyTransient/undo/redo. Same reference in,
    // same reference out; this is not a clone.
    set({
      project: produce(project, () => {}),
      readOnly: opts?.readOnly ?? false,
      saveStatus: "idle",
      saveFailures: 0,
      canUndo: false,
      canRedo: false,
    });
  },

  close() {
    undoStack = [];
    redoStack = [];
    set({
      project: null,
      readOnly: false,
      saveStatus: "idle",
      saveFailures: 0,
      canUndo: false,
      canRedo: false,
    });
  },

  apply(recipe) {
    const { project, readOnly } = get();
    if (readOnly || !project) return;
    // updatedAt is bumped inside this same produce call, not after it, so
    // the bump is part of the patch set and undo restores it too.
    const [next, patches, inversePatches] = produceWithPatches(project, (draft) => {
      recipe(draft);
      draft.updatedAt = new Date().toISOString();
    });
    if (patches.length === 0 || isUpdatedAtOnly(patches)) return;
    undoStack.push({ patches, inversePatches });
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
    set({ project: next, canUndo: true, canRedo: false });
    autosaver?.schedule(next);
  },

  applyTransient(recipe) {
    const { project, readOnly } = get();
    if (readOnly || !project) return;
    const next = produce(project, recipe);
    set({ project: next });
    autosaver?.schedule(next);
  },

  undo() {
    const { project } = get();
    if (!project || undoStack.length === 0) return;
    const entry = undoStack.pop()!;
    const next = applyPatches(project, entry.inversePatches);
    redoStack.push(entry);
    set({ project: next, canUndo: undoStack.length > 0, canRedo: true });
    autosaver?.schedule(next);
  },

  redo() {
    const { project } = get();
    if (!project || redoStack.length === 0) return;
    const entry = redoStack.pop()!;
    const next = applyPatches(project, entry.patches);
    undoStack.push(entry);
    set({ project: next, canUndo: true, canRedo: redoStack.length > 0 });
    autosaver?.schedule(next);
  },
}));
