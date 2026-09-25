import "fake-indexeddb/auto";
import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { addScene, addShot } from "@/state/shot-actions";
import type { Project } from "@/domain/types";
import { StageLayout } from "./StageLayout";
import { ScenePage } from "./ScenePage";
import { ShotPage } from "./ShotPage";

const counters = vi.hoisted(() => ({ mounts: 0 }));

vi.mock("@/viewport/StageCanvas", () => ({
  StageCanvas: (props: { sceneId: string; shotId: string | null }) => {
    useEffect(() => {
      counters.mounts += 1;
    }, []);
    return (
      <div
        data-testid="stage-canvas"
        data-scene={props.sceneId}
        data-shot={props.shotId ?? ""}
      />
    );
  },
}));

function renderStage(project: Project, initialPath: string) {
  useDocumentStore.getState().load(project, {});
  const router = createMemoryRouter(
    [
      {
        path: "/p/:projectId",
        children: [
          {
            element: <StageLayout />,
            children: [
              { path: "scene/:sceneId", element: <ScenePage /> },
              { path: "shot/:shotId", element: <ShotPage /> },
            ],
          },
        ],
      },
    ],
    { initialEntries: [initialPath] }
  );
  render(<RouterProvider router={router} />);
}

beforeEach(async () => {
  await resetDbForTests();
  counters.mounts = 0;
});

describe("StageLayout", () => {
  it("keeps one StageCanvas mounted across scene and shot navigation", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});
    let sceneId = "";
    let shot1Id = "";
    let shot2Id = "";
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shot1Id = addShot(draft, sceneId);
      shot2Id = addShot(draft, sceneId);
    });
    const loaded = useDocumentStore.getState().project!;

    renderStage(loaded, `/p/${loaded.id}/scene/${sceneId}`);
    expect(await screen.findByTestId("stage-canvas")).toHaveAttribute("data-shot", "");
    expect(counters.mounts).toBe(1);

    // stage-canvas stays mounted, so findByTestId would resolve at once with
    // the props from before the click. RouterProvider commits navigation in
    // a transition that can land on a later tick, so wait on the attribute.
    await user.click(screen.getByRole("link", { name: /Shot 1, Shot 01/ }));
    await waitFor(() =>
      expect(screen.getByTestId("stage-canvas")).toHaveAttribute("data-shot", shot1Id)
    );
    expect(counters.mounts).toBe(1);

    await user.click(screen.getByRole("link", { name: /Shot 2, Shot 02/ }));
    await waitFor(() =>
      expect(screen.getByTestId("stage-canvas")).toHaveAttribute("data-shot", shot2Id)
    );
    expect(counters.mounts).toBe(1);

    await user.click(screen.getByRole("link", { name: "Set" }));
    await waitFor(() =>
      expect(screen.getByTestId("stage-canvas")).toHaveAttribute("data-shot", "")
    );
    expect(counters.mounts).toBe(1);
  });

  it("shows an empty state for an unknown shot id, with a link back to the board", async () => {
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});
    let sceneId = "";
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
    });
    void sceneId;
    const loaded = useDocumentStore.getState().project!;

    renderStage(loaded, `/p/${loaded.id}/shot/does-not-exist`);

    expect(await screen.findByText("This scene or shot is gone")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the board" })).toHaveAttribute(
      "href",
      `/p/${loaded.id}`
    );
  });
});
