import type { MeshBasicMaterial, Object3D, PerspectiveCamera, Texture } from "three";

/** Handles shared between the camera, the monitors and the viewfinder pass, without prop drilling. */
export const sceneRefs = {
  /** The lens: the camera the viewfinder pass renders through. */
  lensCamera: null as PerspectiveCamera | null,
  /** Objects switched off during the viewfinder pass: monitors, the panel, the camera body. */
  hideFromLens: new Set<Object3D>(),
  /** Materials that display the viewfinder picture. They get the new texture when the resolution changes. */
  monitorMaterials: new Set<MeshBasicMaterial>(),
  viewfinderTexture: null as Texture | null,
};
