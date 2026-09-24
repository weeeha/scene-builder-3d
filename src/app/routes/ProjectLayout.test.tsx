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
  installFakeLockManager();
});

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
});
