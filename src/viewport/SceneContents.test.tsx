import { describe, expect, it } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";

import { createPrimitive, createScene, createShot } from "@/domain/factories";
import { resolveSceneAll } from "@/domain/resolve";
import { SceneContents } from "@/viewport/SceneContents";

async function objGroups(element: React.ReactElement) {
  const renderer = await ReactThreeTestRenderer.create(element);
  return renderer.scene.findAll(
    (node) => typeof node.props.name === "string" && (node.props.name as string).startsWith("obj:")
  );
}

describe("SceneContents", () => {
  it("renders three resolved objects as three obj: groups", async () => {
    const scene = createScene("Scene 1");
    scene.set.objects.push(createPrimitive("box"), createPrimitive("cylinder"), createPrimitive("sphere"));
    const objects = resolveSceneAll(scene, null, 0);

    const groups = await objGroups(<SceneContents objects={objects} />);

    expect(groups).toHaveLength(3);
  });

  it("keeps a shot-hidden object present but not visible, and visible on the scene page", async () => {
    const scene = createScene("Scene 1");
    const hidden = createPrimitive("box");
    scene.set.objects.push(hidden);
    const shot = createShot("Shot 01");
    shot.overrides[hidden.id] = { visible: false };
    scene.shots.push(shot);

    // resolveSceneAll never drops the object: the shot's copy stays
    // mounted with visible: false, and the scene page's copy is visible.
    const onShot = resolveSceneAll(scene, shot, 0);
    const onScenePage = resolveSceneAll(scene, null, 0);

    const shotGroups = await objGroups(<SceneContents objects={onShot} />);
    const sceneGroups = await objGroups(<SceneContents objects={onScenePage} />);

    const shotNode = shotGroups.find((node) => node.props.name === `obj:${hidden.id}`);
    const sceneNode = sceneGroups.find((node) => node.props.name === `obj:${hidden.id}`);

    expect(shotNode).toBeDefined();
    expect(shotNode?.props.visible).toBe(false);
    expect(sceneNode).toBeDefined();
    expect(sceneNode?.props.visible).toBe(true);
  });
});
