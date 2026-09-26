import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { saveProject } from "@/storage/project-repo";
import { acquireProjectLock } from "@/storage/project-lock";
import { useDocumentStore } from "@/state/document-store";
import { ProjectLayout } from "./ProjectLayout";

// A minimal, spec-faithful fake of the Web Locks API: request(name, options,
// callback) holds the named lock until the callback's returned promise
// settles, and honors ifAvailable by handing the callback null when the name
// is already held. Any correct acquireProjectLock built on the real API works
// against this fake without knowing its internal lock-name convention.
function installFakeLockManager() {
  const held = new Set<string>();
  (globalThis.navigator as unknown as { locks: unknown }).locks = {
    async request(
      name: string,
      optionsOrCallback: { ifAvailable?: boolean } | ((lock: { name: string } | null) => unknown),
      maybeCallback?: (lock: { name: string } | null) => unknown
    ) {
      const options = typeof optionsOrCallback === "function" ? {} : optionsOrCallback;
      const callback =
        typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback!;
      if (options.ifAvailable && held.has(name)) {
        return callback(null);
      }
      held.add(name);
      try {
        return await callback({ name });
      } finally {
        held.delete(name);
      }
    },
  };
}

function renderProjectLayout(projectId: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/p/:projectId",
        element: <ProjectLayout />,
        children: [{ index: true, element: <div>board content</div> }],
      },
    ],
    { initialEntries: [`/p/${projectId}`] }
  );
  render(<RouterProvider router={router} />);
}

beforeEach(async () => {
  await resetDbForTests();
  localStorage.clear();
  installFakeLockManager();
});

function readStash(projectId: string): { baseUpdatedAt: string; project: { name: string } } | null {
  const raw = localStorage.getItem(`sb3d:unsaved:${projectId}`);
  return raw === null ? null : JSON.parse(raw);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ProjectLayout", () => {
  it("loads the project and renders the matched child route", async () => {
    const project = createProject("Job Smith");
    await saveProject(project);

    renderProjectLayout(project.id);

    expect(await screen.findByText("board content")).toBeInTheDocument();
    expect(useDocumentStore.getState().project?.id).toBe(project.id);
  });

  it("shows a not found message for a missing project", async () => {
    renderProjectLayout("does-not-exist");
    expect(await screen.findByText("Project not found")).toBeInTheDocument();
  });

  it("opens read-only when another tab already holds the project lock", async () => {
    const project = createProject("Held Elsewhere");
    await saveProject(project);

    const firstTab = await acquireProjectLock(project.id);
    expect(firstTab.readOnly).toBe(false);

    renderProjectLayout(project.id);

    expect(await screen.findByText("Read-only")).toBeInTheDocument();
    expect(useDocumentStore.getState().readOnly).toBe(true);
  });

  it("shows a save banner with an export button after repeated save failures", async () => {
    // Only fake setTimeout/clearTimeout (what the autosaver's debounce and
    // backoff use), not the full default set. fake-indexeddb schedules its
    // own async IDB callbacks through setImmediate (see
    // node_modules/fake-indexeddb/build/esm/lib/scheduling.js), and
    // vi.useFakeTimers() with no options fakes that too, so the awaited
    // saveProject below would never settle since nothing in this test ever
    // advances a setImmediate-based timer.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const project = createProject("Flaky Save");
    await saveProject(project);

    const repo = await import("@/storage/project-repo");
    vi.spyOn(repo, "saveProject").mockRejectedValue(new Error("quota exceeded"));

    renderProjectLayout(project.id);
    await vi.waitFor(() => expect(screen.getByText("board content")).toBeInTheDocument());

    useDocumentStore.getState().apply((draft) => {
      draft.name = "Flaky Save Renamed";
    });

    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    // A plain getByText, not findByText: the store state above already
    // confirms saveStatus is "error" by this point, and the DOM update from
    // that setState is synchronous within the fake-timer advances (React 19
    // flushes it before advanceTimersByTimeAsync's promise settles).
    // screen.findByText's own waitFor here hangs regardless: @testing-library/dom
    // only recognizes "jest" fake timers (it checks `typeof jest`), so with
    // Vitest's fake timers active it falls into its real-timer polling
    // branch, which testing-library/react's act() wrapper then waits on in a
    // way that never resolves against Vitest's mocked clock. A synchronous
    // query is both simpler and avoids that interaction entirely.
    expect(screen.getByText("Changes are not being saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });

  it("does not let a stale autosaver failure from an unmounted project write into a newly loaded one", async () => {
    // Only fake setTimeout/clearTimeout, for the same reason as the test
    // above: fake-indexeddb schedules through setImmediate, and the full
    // default fake timer set would hang every IndexedDB call this test
    // makes (loadProject/saveProject for both projects).
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const projectA = createProject("Project A");
    const projectB = createProject("Project B");
    await saveProject(projectA);
    await saveProject(projectB);

    const repo = await import("@/storage/project-repo");
    let rejectA: (error: Error) => void = () => {};
    const pendingASave = new Promise<void>((_resolve, reject) => {
      rejectA = reject;
    });
    vi.spyOn(repo, "saveProject").mockImplementation((project) => {
      if (project.id === projectA.id) {
        return pendingASave;
      }
      return Promise.resolve();
    });

    const router = createMemoryRouter(
      [
        {
          path: "/p/:projectId",
          element: <ProjectLayout />,
          children: [{ index: true, element: <div>board content</div> }],
        },
      ],
      { initialEntries: [`/p/${projectA.id}`] }
    );
    render(<RouterProvider router={router} />);

    await vi.waitFor(() => expect(useDocumentStore.getState().project?.id).toBe(projectA.id));

    // Schedule an edit on A, then navigate away before the 500ms debounce
    // fires. Cleanup's own flush() becomes the one save attempt for A, and
    // it is still in flight (pendingASave has not settled) at the moment B
    // finishes loading below.
    useDocumentStore.getState().apply((draft) => {
      draft.name = "A edited";
    });
    await router.navigate(`/p/${projectB.id}`);

    await vi.waitFor(() => expect(useDocumentStore.getState().project?.id).toBe(projectB.id));
    const bStatusBeforeAFailed = useDocumentStore.getState().saveStatus;
    const bFailuresBeforeAFailed = useDocumentStore.getState().saveFailures;

    // A's pending save settles, with a failure, only now - well after B's
    // document is the one loaded in the store.
    rejectA(new Error("stale save"));
    // Drain the promise chain inside the (old, cleaned-up) autosaver:
    // runAttempt's catch, flush()'s while(inFlight) loop, then dispose()'s
    // own best-effort re-attempt against the same rejected promise. All of
    // it is plain microtask chaining with no timers involved, so repeated
    // ticks are enough to let it fully settle.
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }

    expect(useDocumentStore.getState().project?.id).toBe(projectB.id);
    expect(useDocumentStore.getState().saveStatus).toBe(bStatusBeforeAFailed);
    expect(useDocumentStore.getState().saveFailures).toBe(bFailuresBeforeAFailed);
    expect(screen.queryByText("Changes are not being saved")).not.toBeInTheDocument();
  });

  it("stashes an unsaved edit in localStorage on pagehide, based on the version it loaded", async () => {
    const project = createProject("Unsaved");
    await saveProject(project);
    renderProjectLayout(project.id);
    await screen.findByText("board content");

    useDocumentStore.getState().apply((draft) => {
      draft.name = "Renamed";
    });
    window.dispatchEvent(new Event("pagehide"));

    // Read synchronously: pagehide is the last moment the page can run code,
    // so the stash has to exist by the time the event returns.
    expect(readStash(project.id)).toEqual({
      baseUpdatedAt: project.updatedAt,
      project: expect.objectContaining({ name: "Renamed" }),
    });
  });

  it("does not stash on pagehide when every edit is already saved, and bases a later stash on the last save", async () => {
    const project = createProject("Saved");
    await saveProject(project);
    renderProjectLayout(project.id);
    await screen.findByText("board content");

    useDocumentStore.getState().apply((draft) => {
      draft.name = "First edit";
    });
    const firstEdit = useDocumentStore.getState().project!;
    await vi.waitFor(() => expect(useDocumentStore.getState().saveStatus).toBe("saved"), { timeout: 3000 });

    window.dispatchEvent(new Event("pagehide"));
    expect(readStash(project.id)).toBeNull();

    useDocumentStore.getState().apply((draft) => {
      draft.name = "Second edit";
    });
    window.dispatchEvent(new Event("pagehide"));
    expect(readStash(project.id)?.baseUpdatedAt).toBe(firstEdit.updatedAt);
  });

  it("clears the stash once the edit it holds is saved after all", async () => {
    // The page can survive a pagehide (the back/forward cache restores it),
    // and then the flush started in pagehide completes normally.
    const project = createProject("Survivor");
    await saveProject(project);
    renderProjectLayout(project.id);
    await screen.findByText("board content");

    useDocumentStore.getState().apply((draft) => {
      draft.name = "Renamed";
    });
    window.dispatchEvent(new Event("pagehide"));
    expect(readStash(project.id)).not.toBeNull();

    await vi.waitFor(() => expect(readStash(project.id)).toBeNull(), { timeout: 3000 });
  });

  it("does not stash anything in a read-only tab", async () => {
    const project = createProject("Held Elsewhere");
    await saveProject(project);
    await acquireProjectLock(project.id);
    renderProjectLayout(project.id);
    await screen.findByText("Read-only");

    useDocumentStore.getState().apply((draft) => {
      draft.name = "Ignored";
    });
    window.dispatchEvent(new Event("pagehide"));

    expect(readStash(project.id)).toBeNull();
  });

  it("shows an error state and leaves no lock behind when loading the project throws", async () => {
    const project = createProject("Boom Project");
    await saveProject(project);

    const repo = await import("@/storage/project-repo");
    vi.spyOn(repo, "loadProject").mockRejectedValueOnce(new Error("indexeddb exploded"));

    renderProjectLayout(project.id);

    expect(await screen.findByText("Could not load this project")).toBeInTheDocument();

    // No lock was left behind: a fresh acquire for the same id still
    // reports the first-tab (non-read-only) outcome, proving nothing from
    // the failed open() is still holding it.
    const lock = await acquireProjectLock(project.id);
    expect(lock.readOnly).toBe(false);
    lock.release();
  });
});
