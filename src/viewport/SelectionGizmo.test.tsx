import { afterEach, describe, expect, it } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Group } from "three";

import { useDocumentStore } from "@/state/document-store";
import { SelectionGizmo } from "@/viewport/SelectionGizmo";

function isGizmoHelper(node: { props: { name?: unknown } }): boolean {
  return node.props.name === "helper:gizmo";
}

afterEach(() => {
  useDocumentStore.setState({ readOnly: false });
});

describe("SelectionGizmo", () => {
  it("mounts the gizmo helper for a visible, selected object", async () => {
    const target = new Group();
    const renderer = await ReactThreeTestRenderer.create(
      <SelectionGizmo
        target={target}
        objectId="obj-1"
        sceneId="scene-1"
        page="scene"
        shotId={null}
        visible
      />
    );

    expect(renderer.scene.findAll(isGizmoHelper)).toHaveLength(1);
  });

  it("does not mount the gizmo helper when the document is read-only", async () => {
    useDocumentStore.setState({ readOnly: true });
    const target = new Group();
    const renderer = await ReactThreeTestRenderer.create(
      <SelectionGizmo
        target={target}
        objectId="obj-1"
        sceneId="scene-1"
        page="scene"
        shotId={null}
        visible
      />
    );

    expect(renderer.scene.findAll(isGizmoHelper)).toHaveLength(0);
  });

  it("does not mount the gizmo helper when nothing is selected", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <SelectionGizmo
        target={null}
        objectId={null}
        sceneId="scene-1"
        page="scene"
        shotId={null}
        visible={false}
      />
    );

    expect(renderer.scene.findAll(isGizmoHelper)).toHaveLength(0);
  });

  it("does not mount the gizmo helper when the selected object is hidden", async () => {
    const target = new Group();
    const renderer = await ReactThreeTestRenderer.create(
      <SelectionGizmo
        target={target}
        objectId="obj-1"
        sceneId="scene-1"
        page="scene"
        shotId={null}
        visible={false}
      />
    );

    expect(renderer.scene.findAll(isGizmoHelper)).toHaveLength(0);
  });
});
