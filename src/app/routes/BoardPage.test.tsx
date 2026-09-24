import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { addScene } from "@/state/shot-actions";
import { BoardPage } from "./BoardPage";

beforeEach(async () => {
  await resetDbForTests();
});

function renderBoard(projectId: string) {
  render(
    <MemoryRouter initialEntries={[`/p/${projectId}`]}>
      <Routes>
        <Route path="/p/:projectId" element={<BoardPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("BoardPage", () => {
  it("shows the empty state with no scenes and adds one", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});

    renderBoard(project.id);
    expect(screen.getByText("No scenes yet")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add scene" }));

    expect(useDocumentStore.getState().project?.scenes).toHaveLength(1);
    expect(screen.queryByText("No scenes yet")).not.toBeInTheDocument();
  });

  it("lists scenes with their shot count and links to the scene page", () => {
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      addScene(draft, "Kitchen");
    });

    renderBoard(project.id);

    expect(screen.getByText("Kitchen")).toBeInTheDocument();
    expect(screen.getByText("Empty set")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      expect.stringContaining(`/p/${project.id}/scene/`)
    );
  });
});
