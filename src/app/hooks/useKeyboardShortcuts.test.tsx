import "fake-indexeddb/auto";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, Routes, Route, MemoryRouter, useParams } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject, createPrimitive } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { addScene, addShot } from "@/state/shot-actions";
import { addObject } from "@/state/object-actions";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function Harness({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  useKeyboardShortcuts({ onOpenShortcuts });
  return <input aria-label="Somewhere else" />;
}

function renderHarness(initialPath: string, onOpenShortcuts = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/p/:projectId/scene/:sceneId" element={<Harness onOpenShortcuts={onOpenShortcuts} />} />
        <Route path="/p/:projectId" element={<Harness onOpenShortcuts={onOpenShortcuts} />} />
      </Routes>
    </MemoryRouter>
  );
  return onOpenShortcuts;
}

beforeEach(async () => {
  await resetDbForTests();
  useEditorStore.setState({ gizmoMode: "translate", selectedObjectId: null });
});

describe("useKeyboardShortcuts", () => {
  it("switches gizmo mode on W, E, R", () => {
    renderHarness("/p/proj1");

    fireEvent.keyDown(window, { key: "e" });
    expect(useEditorStore.getState().gizmoMode).toBe("rotate");
    fireEvent.keyDown(window, { key: "r" });
    expect(useEditorStore.getState().gizmoMode).toBe("scale");
    fireEvent.keyDown(window, { key: "w" });
    expect(useEditorStore.getState().gizmoMode).toBe("translate");
  });

  it("opens the shortcuts sheet on ?", () => {
    const onOpenShortcuts = renderHarness("/p/proj1");
    fireEvent.keyDown(window, { key: "?" });
    expect(onOpenShortcuts).toHaveBeenCalledTimes(1);
  });

  it("ignores shortcuts while typing in an input", () => {
    renderHarness("/p/proj1");
    const input = screen.getByLabelText("Somewhere else");
    fireEvent.keyDown(input, { key: "e" });
    expect(useEditorStore.getState().gizmoMode).toBe("translate");
  });

  it("deletes the selected object on Delete", async () => {
    const project = createProject("Job Smith");
    let sceneId = "";
    let objectId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      const box = createPrimitive("box");
      objectId = box.id;
      addObject(draft, sceneId, box);
    });
    useEditorStore.setState({ selectedObjectId: objectId });

    renderHarness(`/p/${project.id}/scene/${sceneId}`);
    fireEvent.keyDown(window, { key: "Delete" });

    expect(useDocumentStore.getState().project!.scenes[0].set.objects).toHaveLength(0);
  });

  it("moves to the next and previous shot with ] and [", async () => {
    const project = createProject("Job Smith");
    let sceneId = "";
    let shot1Id = "";
    let shot2Id = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shot1Id = addShot(draft, sceneId);
      shot2Id = addShot(draft, sceneId);
    });

    function ShotScreenRoute() {
      const { shotId } = useParams<{ shotId: string }>();
      useKeyboardShortcuts({ onOpenShortcuts: () => {} });
      return <div>{shotId === shot2Id ? "Shot two" : "Shot one"}</div>;
    }

    const router = createMemoryRouter(
      [{ path: "/p/:projectId/shot/:shotId", element: <ShotScreenRoute /> }],
      { initialEntries: [`/p/${project.id}/shot/${shot1Id}`] }
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByText("Shot one")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "]" });
    expect(await screen.findByText("Shot two")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "[" });
    expect(await screen.findByText("Shot one")).toBeInTheDocument();
  });
});
