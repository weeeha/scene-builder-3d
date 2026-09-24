import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject, createPrimitive } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { addScene, addShot } from "@/state/shot-actions";
import { addObject, updateObject } from "@/state/object-actions";
import { Inspector } from "./Inspector";

beforeEach(async () => {
  await resetDbForTests();
  useEditorStore.setState({ selectedObjectId: null, writeTarget: "shot" });
});

describe("Inspector", () => {
  it("shows no reset control on the scene page", () => {
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

    render(<Inspector page="scene" sceneId={sceneId} shotId={null} />);
    expect(
      screen.queryByRole("button", { name: "Reset position" })
    ).not.toBeInTheDocument();
  });

  it("shows a modified reset on the shot page once an override exists, and clears it", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    let sceneId = "";
    let shotId = "";
    let objectId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shotId = addShot(draft, sceneId);
      const box = createPrimitive("box");
      objectId = box.id;
      addObject(draft, sceneId, box);
    });
    useEditorStore.setState({ selectedObjectId: objectId, writeTarget: "shot" });
    useDocumentStore.getState().apply((draft) => {
      updateObject(
        draft,
        sceneId,
        objectId,
        { transform: { position: [1, 0, 0], rotationY: 0, scale: 1 } },
        { kind: "shot", shotId }
      );
    });

    render(<Inspector page="shot" sceneId={sceneId} shotId={shotId} />);
    const reset = screen.getByRole("button", { name: "Reset position" });
    expect(reset).toBeEnabled();

    await user.click(reset);

    const shot = useDocumentStore.getState().project!.scenes[0].shots[0];
    expect(shot.overrides[objectId]?.transform).toBeUndefined();
  });

  it("shows shot fields on the shot page", () => {
    const project = createProject("Job Smith");
    let sceneId = "";
    let shotId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shotId = addShot(draft, sceneId);
    });

    render(<Inspector page="shot" sceneId={sceneId} shotId={shotId} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Shot 01");
    expect(screen.getByRole("radio", { name: "WIDE" })).toBeInTheDocument();
  });
});
