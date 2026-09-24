import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { addScene } from "@/state/shot-actions";
import { ShotStrip } from "./ShotStrip";

beforeEach(async () => {
  await resetDbForTests();
});

// projectId is unused: the route param comes from initialPath, not this
// argument. Kept for symmetry with the other render helpers in this repo
// and prefixed per noUnusedParameters' underscore convention.
function renderStrip(_projectId: string, sceneId: string, initialPath: string) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/p/:projectId/*" element={<ShotStrip sceneId={sceneId} />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ShotStrip", () => {
  it("shows only Set and the add button when the scene has no shots", () => {
    const project = createProject("Job Smith");
    let sceneId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
    });

    renderStrip(project.id, sceneId, `/p/${project.id}/scene/${sceneId}`);

    expect(screen.getByRole("link", { name: "Set" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add shot" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Shot 1/ })).not.toBeInTheDocument();
  });

  it("adds a shot and lists it with duration and duplicate, delete, move actions", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    let sceneId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
    });

    renderStrip(project.id, sceneId, `/p/${project.id}/scene/${sceneId}`);
    await user.click(screen.getByRole("button", { name: "Add shot" }));

    expect(screen.getByRole("link", { name: /Shot 1, Shot 01/ })).toBeInTheDocument();
    expect(screen.getByText("4s")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /More actions for Shot 01/ }));
    expect(screen.getByRole("menuitem", { name: /Duplicate/ })).toBeInTheDocument();
  });
});
