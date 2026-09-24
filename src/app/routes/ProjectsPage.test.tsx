import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { resetDbForTests } from "@/storage/db";
import { ProjectsPage } from "./ProjectsPage";

function renderProjectsPage() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <ProjectsPage /> },
      { path: "/p/:projectId", element: <div>project page</div> },
    ],
    { initialEntries: ["/"] }
  );
  render(<RouterProvider router={router} />);
}

beforeEach(async () => {
  await resetDbForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProjectsPage", () => {
  it("shows the empty state with no projects", async () => {
    renderProjectsPage();
    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
  });

  it("creates a project from the dialog and opens it", async () => {
    const user = userEvent.setup();
    renderProjectsPage();
    await screen.findByText("No projects yet");

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("Project name"), "Job Smith");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("project page")).toBeInTheDocument();
  });

  it("lists an existing project and deletes it with confirmation", async () => {
    const user = userEvent.setup();
    const { createProject } = await import("@/domain/factories");
    const { saveProject } = await import("@/storage/project-repo");
    const project = createProject("Job Smith");
    await saveProject(project);

    renderProjectsPage();
    expect(await screen.findByText("Job Smith")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Job Smith" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
  });

  it("imports a project from a file", async () => {
    const user = userEvent.setup();
    const { createProject } = await import("@/domain/factories");
    const { exportProjectJson } = await import("@/storage/export-import");
    const source = createProject("Exported film");
    const blob = exportProjectJson(source);
    const file = new File([await blob.text()], "exported-film.sb3d.json", {
      type: "application/json",
    });

    renderProjectsPage();
    await screen.findByText("No projects yet");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(await screen.findByText("project page")).toBeInTheDocument();
  });

  it("shows a toast and keeps the dialog open when creating a project fails", async () => {
    const user = userEvent.setup();
    const repo = await import("@/storage/project-repo");
    const errorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");
    vi.spyOn(repo, "saveProject").mockRejectedValueOnce(new Error("quota exceeded"));

    renderProjectsPage();
    await screen.findByText("No projects yet");

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("Project name"), "Job Smith");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
    // The dialog is still open with the name intact, ready to retry.
    expect(screen.getByLabelText("Project name")).toHaveValue("Job Smith");
    expect(screen.queryByText("project page")).not.toBeInTheDocument();
  });

  it("shows a toast and keeps the project listed when deleting it fails", async () => {
    const user = userEvent.setup();
    const { createProject } = await import("@/domain/factories");
    const repo = await import("@/storage/project-repo");
    const project = createProject("Job Smith");
    await repo.saveProject(project);
    const errorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");
    vi.spyOn(repo, "deleteProject").mockRejectedValueOnce(new Error("quota exceeded"));

    renderProjectsPage();
    expect(await screen.findByText("Job Smith")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Job Smith" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(screen.getByText("Job Smith")).toBeInTheDocument();
  });
});
