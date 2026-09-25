import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { addScene, addShot } from "@/state/shot-actions";
import { ShotPage } from "./ShotPage";

beforeEach(async () => {
  await resetDbForTests();
  useEditorStore.setState({ cameraMode: "orbit" });
});

function renderShot(projectId: string, shotId: string) {
  render(
    <MemoryRouter initialEntries={[`/p/${projectId}/shot/${shotId}`]}>
      <Routes>
        <Route path="/p/:projectId/shot/:shotId" element={<ShotPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ShotPage", () => {
  it("sets the camera mode to the shot camera on entering, even if it was left on orbit", () => {
    const project = createProject("Job Smith");
    let sceneId = "";
    let shotId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shotId = addShot(draft, sceneId);
    });
    void sceneId;

    renderShot(project.id, shotId);

    expect(useEditorStore.getState().cameraMode).toBe("shot");
    expect(screen.getByRole("radio", { name: "Shot camera" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });
});
