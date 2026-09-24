import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useParams } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { ExportImportButtons } from "./ExportImportButtons";

beforeEach(async () => {
  await resetDbForTests();
});

// ExportImportButtons lives inside ProjectLayout's own "/p/:projectId" route
// in the real app and calls useNavigate on import, so every render needs a
// Router with that same route shape. Harness surfaces the current
// projectId param as text, the same way ShotStrip's and StageLayout's own
// test helpers surface route state, so a test can assert navigation
// happened without reaching into the router's internals.
function Harness() {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <>
      <ExportImportButtons />
      <div data-testid="current-project">{projectId}</div>
    </>
  );
}

function renderWithRouter(initialPath: string) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/p/:projectId" element={<Harness />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ExportImportButtons", () => {
  it("exports the project and records lastExportedAt", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});
    expect(useDocumentStore.getState().project?.lastExportedAt).toBeUndefined();

    renderWithRouter(`/p/${project.id}`);
    await user.click(screen.getByRole("button", { name: "Export project" }));

    expect(useDocumentStore.getState().project?.lastExportedAt).toBeDefined();
  });

  it("disables the hidden import file input when the document is read-only", () => {
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, { readOnly: true });

    renderWithRouter(`/p/${project.id}`);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it("imports a project from a file as a new project and navigates to it", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});

    const { exportProjectJson } = await import("@/storage/export-import");
    const source = createProject("Exported film");
    const blob = exportProjectJson(source);
    const file = new File([await blob.text()], "exported-film.sb3d.json", {
      type: "application/json",
    });

    renderWithRouter(`/p/${project.id}`);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    const { listProjects } = await import("@/storage/project-repo");
    const summaries = await listProjects();
    const imported = summaries.find((summary) => summary.name === "Exported film");
    expect(imported).toBeDefined();

    // Staying on the original project's route would be the pre-fix bug: a
    // toast with no navigation, leaving the user looking at the project
    // they were already in rather than the one they just imported.
    expect(await screen.findByTestId("current-project")).toHaveTextContent(imported!.id);
  });
});
