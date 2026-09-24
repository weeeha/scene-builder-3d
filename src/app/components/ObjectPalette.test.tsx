import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { addScene, addShot } from "@/state/shot-actions";
import { ObjectPalette } from "./ObjectPalette";

beforeEach(async () => {
  await resetDbForTests();
});

describe("ObjectPalette", () => {
  it("adds a box to the set on the scene page", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    let sceneId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
    });

    render(<ObjectPalette sceneId={sceneId} shotId={null} />);
    await user.click(screen.getByRole("button", { name: "Add box" }));

    const scene = useDocumentStore.getState().project!.scenes[0];
    expect(scene.set.objects).toHaveLength(1);
    expect(scene.set.objects[0].kind).toBe("primitive");
  });

  it("adds an object only to this shot when the write target is shot", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    let sceneId = "";
    let shotId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shotId = addShot(draft, sceneId);
    });

    render(<ObjectPalette sceneId={sceneId} shotId={shotId} writeTarget="shot" />);
    await user.click(screen.getByRole("button", { name: "Add doll" }));

    const scene = useDocumentStore.getState().project!.scenes[0];
    const object = scene.set.objects[0];
    expect(object.visible).toBe(false);
    expect(scene.shots[0].overrides[object.id]).toEqual({ visible: true });
  });
});
