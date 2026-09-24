import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createProject } from "@/domain/factories";
import { setAutosaver, useDocumentStore } from "@/state/document-store";

// The store's project/canUndo/canRedo live in Zustand state, but the undo
// and redo stacks are module-level arrays outside it (so they never end up
// in a persisted snapshot). close() clears both; every test starts from
// close() plus a fresh autosaver so no test can see another test's history,
// pending saves, or read-only flag.
function resetStore() {
  setAutosaver(null);
  useDocumentStore.getState().close();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  resetStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDocumentStore", () => {
  it("apply changes the project and sets canUndo", () => {
    useDocumentStore.getState().load(createProject("Test"));
    useDocumentStore.getState().apply((draft) => {
      draft.name = "Renamed";
    });
    const state = useDocumentStore.getState();
    expect(state.project?.name).toBe("Renamed");
    expect(state.canUndo).toBe(true);
  });

  it("undo then redo restore exact documents, including updatedAt", () => {
    useDocumentStore.getState().load(createProject("Test"));
    const beforeApply = useDocumentStore.getState().project!;

    vi.setSystemTime(new Date("2026-01-01T00:00:01.000Z"));
    useDocumentStore.getState().apply((draft) => {
      draft.name = "Renamed";
    });
    const afterApply = useDocumentStore.getState().project!;
    expect(afterApply.updatedAt).not.toBe(beforeApply.updatedAt);

    useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().project).toEqual(beforeApply);

    useDocumentStore.getState().redo();
    expect(useDocumentStore.getState().project).toEqual(afterApply);
  });

  it("20 applies, 20 undos and 20 redos return to the same document", () => {
    useDocumentStore.getState().load(createProject("Test"));
    const original = useDocumentStore.getState().project!;

    for (let i = 1; i <= 20; i += 1) {
      vi.setSystemTime(new Date(2026, 0, 1, 0, 0, i));
      useDocumentStore.getState().apply((draft) => {
        draft.name = `v${i}`;
      });
    }
    const final = useDocumentStore.getState().project!;

    for (let i = 0; i < 20; i += 1) useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().project).toEqual(original);

    for (let i = 0; i < 20; i += 1) useDocumentStore.getState().redo();
    expect(useDocumentStore.getState().project).toEqual(final);
  });

  it("caps history at 100 entries", () => {
    useDocumentStore.getState().load(createProject("Test"));
    for (let i = 1; i <= 105; i += 1) {
      vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0, i));
      useDocumentStore.getState().apply((draft) => {
        draft.name = `v${i}`;
      });
    }
    for (let i = 0; i < 100; i += 1) useDocumentStore.getState().undo();
    const state = useDocumentStore.getState();
    // 105 applies, capped at 100: the oldest 5 (v1..v5) fell off the
    // stack, so undoing all 100 remaining entries lands on v5, not v0.
    expect(state.project?.name).toBe("v5");
    expect(state.canUndo).toBe(false);

    useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().project?.name).toBe("v5");
  });

  it("apply after undo clears redo", () => {
    useDocumentStore.getState().load(createProject("Test"));
    useDocumentStore.getState().apply((draft) => {
      draft.name = "A";
    });
    useDocumentStore.getState().undo();
    useDocumentStore.getState().apply((draft) => {
      draft.name = "B";
    });
    expect(useDocumentStore.getState().canRedo).toBe(false);
    useDocumentStore.getState().redo();
    expect(useDocumentStore.getState().project?.name).toBe("B");
  });

  it("applyTransient changes the document without adding history and without touching updatedAt", () => {
    useDocumentStore.getState().load(createProject("Test"));
    const before = useDocumentStore.getState().project!;
    useDocumentStore.getState().applyTransient((draft) => {
      draft.name = "Transient";
    });
    const after = useDocumentStore.getState().project!;
    expect(after.name).toBe("Transient");
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(useDocumentStore.getState().canUndo).toBe(false);
    useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().project?.name).toBe("Transient");
  });

  it("readOnly makes apply a no-op", () => {
    useDocumentStore.getState().load(createProject("Test"), { readOnly: true });
    useDocumentStore.getState().apply((draft) => {
      draft.name = "Renamed";
    });
    expect(useDocumentStore.getState().project?.name).toBe("Test");
    expect(useDocumentStore.getState().canUndo).toBe(false);
  });

  it("readOnly makes undo and redo no-ops, leaving the document and stacks unchanged", () => {
    // load() always clears the undo/redo stacks, so there is no path
    // through the public API that lands on readOnly with existing
    // history. setState flips the flag directly, the same way a second
    // tab's lock result would if it changed mid-session, without
    // disturbing the stacks load() would otherwise reset.
    useDocumentStore.getState().load(createProject("Test"));
    useDocumentStore.getState().apply((draft) => {
      draft.name = "Renamed";
    });
    const afterApply = useDocumentStore.getState().project!;
    expect(useDocumentStore.getState().canUndo).toBe(true);

    useDocumentStore.setState({ readOnly: true });

    useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().project).toEqual(afterApply);
    expect(useDocumentStore.getState().canUndo).toBe(true);
    expect(useDocumentStore.getState().canRedo).toBe(false);

    useDocumentStore.getState().redo();
    expect(useDocumentStore.getState().project).toEqual(afterApply);
    expect(useDocumentStore.getState().canRedo).toBe(false);
  });

  it("apply calls the autosaver's schedule", () => {
    const schedule = vi.fn();
    setAutosaver({ schedule });
    useDocumentStore.getState().load(createProject("Test"));
    useDocumentStore.getState().apply((draft) => {
      draft.name = "Renamed";
    });
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls[0][0].name).toBe("Renamed");
  });

  it("load clears history", () => {
    useDocumentStore.getState().load(createProject("Test"));
    useDocumentStore.getState().apply((draft) => {
      draft.name = "Renamed";
    });
    expect(useDocumentStore.getState().canUndo).toBe(true);
    useDocumentStore.getState().load(createProject("Fresh"));
    expect(useDocumentStore.getState().canUndo).toBe(false);
    useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().project?.name).toBe("Fresh");
  });

  it("load freezes the document, so a direct write throws and the store is unaffected", () => {
    useDocumentStore.getState().load(createProject("Test"));
    const project = useDocumentStore.getState().project!;

    expect(() => {
      project.name = "HACKED";
    }).toThrow();
    expect(useDocumentStore.getState().project?.name).toBe("Test");

    // Existing load behaviour still holds: history is cleared, so undo
    // right after load does nothing.
    useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().project?.name).toBe("Test");
    expect(useDocumentStore.getState().canUndo).toBe(false);
  });

  it("apply is a no-op when the recipe produces no patches", () => {
    useDocumentStore.getState().load(createProject("Test"));
    const before = useDocumentStore.getState().project;
    useDocumentStore.getState().apply(() => {
      // intentionally does nothing
    });
    expect(useDocumentStore.getState().project).toBe(before);
    expect(useDocumentStore.getState().canUndo).toBe(false);
  });
});
