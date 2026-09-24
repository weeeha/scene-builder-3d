import { describe, expect, it } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";

import type { ShotCamera } from "@/domain/types";
import { ShotCameraRig } from "@/viewport/rigs/ShotCameraRig";

/** Narrow, structural check for the live OrbitControls instance: it is not
 * a THREE.Object3D (three-stdlib's OrbitControls extends EventDispatcher),
 * so it never shows up in the Object3D scene graph, only in the R3F fiber
 * tree that ReactThreeTestInstance.findAll walks. A THREE.Vector3 target
 * is the distinguishing shape in this component's tree; nothing else here
 * carries one. */
function isOrbitControlsNode(node: { instance: unknown }): boolean {
  const instance = node.instance as { target?: { isVector3?: boolean } } | null;
  return instance?.target?.isVector3 === true;
}

describe("ShotCameraRig", () => {
  it("gives the live OrbitControls a target matching the shot's aim, not the origin", async () => {
    // A non-origin aim so a fresh, un-synced Vector3(0, 0, 0) target fails
    // the assertion instead of passing by coincidence.
    const camera: ShotCamera = {
      lensMm: 35,
      position: [{ t: 0, value: [0, 1.6, 6] }],
      aim: [{ t: 0, value: [1, 1.2, -2] }],
    };

    const renderer = await ReactThreeTestRenderer.create(
      <ShotCameraRig camera={camera} t={0} sceneId="scene-1" shotId="shot-1" interactive />
    );

    const controlsNodes = renderer.scene.findAll(isOrbitControlsNode);
    expect(controlsNodes).toHaveLength(1);

    const target = (controlsNodes[0].instance as unknown as { target: { x: number; y: number; z: number } }).target;
    expect(target.x).toBeCloseTo(1, 5);
    expect(target.y).toBeCloseTo(1.2, 5);
    expect(target.z).toBeCloseTo(-2, 5);
  });

  it("does not mount OrbitControls when not interactive", async () => {
    const camera: ShotCamera = {
      lensMm: 35,
      position: [{ t: 0, value: [0, 1.6, 6] }],
      aim: [{ t: 0, value: [1, 1.2, -2] }],
    };

    const renderer = await ReactThreeTestRenderer.create(
      <ShotCameraRig camera={camera} t={0} sceneId="scene-1" shotId="shot-1" interactive={false} />
    );

    expect(renderer.scene.findAll(isOrbitControlsNode)).toHaveLength(0);
  });
});
