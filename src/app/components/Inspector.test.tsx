import "fake-indexeddb/auto";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("shows the shot's resolved values, not the base ones, once a transform override exists", () => {
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
    useDocumentStore.getState().apply((draft) => {
      updateObject(
        draft,
        sceneId,
        objectId,
        { transform: { position: [5, 1, -2], rotationY: Math.PI / 2, scale: 2 } },
        { kind: "shot", shotId }
      );
    });
    useEditorStore.setState({ selectedObjectId: objectId, writeTarget: "shot" });

    render(<Inspector page="shot" sceneId={sceneId} shotId={shotId} />);

    expect(screen.getByLabelText("Position X")).toHaveValue(5);
    expect(screen.getByLabelText("Position Y")).toHaveValue(1);
    expect(screen.getByLabelText("Position Z")).toHaveValue(-2);
    expect(screen.getByLabelText("Rotation Y")).toHaveValue(90);
    expect(screen.getByLabelText("Scale")).toHaveValue(2);
  });

  it("editing one rotation axis through the shot target keeps the override's position and scale", () => {
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
    useDocumentStore.getState().apply((draft) => {
      updateObject(
        draft,
        sceneId,
        objectId,
        { transform: { position: [5, 0, 5], rotationY: 0, scale: 2 } },
        { kind: "shot", shotId }
      );
    });
    useEditorStore.setState({ selectedObjectId: objectId, writeTarget: "shot" });

    render(<Inspector page="shot" sceneId={sceneId} shotId={shotId} />);
    fireEvent.change(screen.getByLabelText("Rotation Y"), { target: { value: "45" } });

    const shot = useDocumentStore.getState().project!.scenes[0].shots[0];
    expect(shot.overrides[objectId]?.transform).toEqual({
      position: [5, 0, 5],
      rotationY: (45 * Math.PI) / 180,
      scale: 2,
    });
  });

  it("shows visible on its shot page for an only-in-this-shot object", () => {
    const project = createProject("Job Smith");
    let sceneId = "";
    let shotId = "";
    let objectId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shotId = addShot(draft, sceneId);
    });
    useDocumentStore.getState().apply((draft) => {
      const box = createPrimitive("box");
      objectId = box.id;
      addObject(draft, sceneId, box, { onlyInShotId: shotId });
    });
    useEditorStore.setState({ selectedObjectId: objectId, writeTarget: "shot" });

    render(<Inspector page="shot" sceneId={sceneId} shotId={shotId} />);

    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("disables the reset affordance when the document is read-only", () => {
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
    useDocumentStore.getState().apply((draft) => {
      updateObject(
        draft,
        sceneId,
        objectId,
        { transform: { position: [1, 0, 0], rotationY: 0, scale: 1 } },
        { kind: "shot", shotId }
      );
    });
    useEditorStore.setState({ selectedObjectId: objectId, writeTarget: "shot" });
    useDocumentStore.setState({ readOnly: true });

    render(<Inspector page="shot" sceneId={sceneId} shotId={shotId} />);
    expect(screen.getByRole("button", { name: "Reset position" })).toBeDisabled();
  });

  it("disables the shot-type choice chips when the document is read-only", () => {
    const project = createProject("Job Smith");
    let sceneId = "";
    let shotId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shotId = addShot(draft, sceneId);
    });
    useDocumentStore.setState({ readOnly: true });

    render(<Inspector page="shot" sceneId={sceneId} shotId={shotId} />);
    expect(screen.getByRole("radio", { name: "WIDE" })).toBeDisabled();
  });

  it("resets a field's override on the shot regardless of the write-target switch", async () => {
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
    useDocumentStore.getState().apply((draft) => {
      updateObject(
        draft,
        sceneId,
        objectId,
        { transform: { position: [1, 0, 0], rotationY: 0, scale: 1 }, visible: false },
        { kind: "shot", shotId }
      );
    });
    useEditorStore.setState({ selectedObjectId: objectId, writeTarget: "set" });

    render(<Inspector page="shot" sceneId={sceneId} shotId={shotId} />);
    await user.click(screen.getByRole("button", { name: "Reset position" }));

    const shot = useDocumentStore.getState().project!.scenes[0].shots[0];
    expect(shot.overrides[objectId]?.transform).toBeUndefined();
    expect(shot.overrides[objectId]?.visible).toBe(false);
  });
});
