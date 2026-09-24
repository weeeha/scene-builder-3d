import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { UndoRedoButtons } from "./UndoRedoButtons";

describe("UndoRedoButtons", () => {
  it("undo is disabled until a change is applied, then undoes it", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});

    render(<UndoRedoButtons />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    // act() wrap: apply() mutates the zustand store directly, outside any
    // React event handler, so the resulting re-render is not guaranteed to
    // be flushed before the very next synchronous assertion without it.
    act(() => {
      useDocumentStore.getState().apply((draft) => {
        draft.name = "Renamed";
      });
    });
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(useDocumentStore.getState().project?.name).toBe("Job Smith");
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
  });
});
