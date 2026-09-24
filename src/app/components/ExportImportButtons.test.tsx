import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { ExportImportButtons } from "./ExportImportButtons";

beforeEach(async () => {
  await resetDbForTests();
});

describe("ExportImportButtons", () => {
  it("exports the project and records lastExportedAt", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});
    expect(useDocumentStore.getState().project?.lastExportedAt).toBeUndefined();

    render(<ExportImportButtons />);
    await user.click(screen.getByRole("button", { name: "Export project" }));

    expect(useDocumentStore.getState().project?.lastExportedAt).toBeDefined();
  });

  it("disables the hidden import file input when the document is read-only", () => {
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, { readOnly: true });

    render(<ExportImportButtons />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it("imports a project from a file as a new project", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});

    const { exportProjectJson } = await import("@/storage/export-import");
    const source = createProject("Exported film");
    const blob = exportProjectJson(source);
    const file = new File([await blob.text()], "exported-film.sb3d.json", {
      type: "application/json",
    });

    render(<ExportImportButtons />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    const { listProjects } = await import("@/storage/project-repo");
    const summaries = await listProjects();
    expect(summaries.some((summary) => summary.name === "Exported film")).toBe(true);
  });
});
