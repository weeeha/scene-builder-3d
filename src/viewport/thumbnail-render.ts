import * as THREE from "three";

import { resolveSceneAll, cameraAt } from "@/domain/resolve";
import type { Project, Scene, Shot } from "@/domain/types";
import { renderShotPixels, pixelsToPngBlob } from "@/viewport/thumbnails";
import { putBlob, deleteBlob } from "@/storage/blob-store";
import { setShotThumb } from "@/state/shot-actions";

/**
 * Renders one stale shot's thumbnail and stores it, catching any failure
 * from the render or from storage (for example WebKit's ephemeral
 * IndexedDB rejecting a stored value, or a shader compile failure) so a
 * single shot's failure never rejects unhandled and never stops the rest
 * of the batch: the shot simply keeps whatever thumbnail it already had,
 * or none, and the caller's loop moves on to the next stale shot.
 *
 * A read-only tab (a second tab on the same project) never renders or
 * writes: nothing it produces would ever be saved, so it returns before
 * touching the renderer or the blob store, leaving whatever thumbnail is
 * already on screen exactly as it is.
 *
 * Kept in its own file, not ThumbnailWorker.tsx: a file mounted as a React
 * component may only export components, or Vite's fast refresh plugin
 * breaks (react-refresh/only-export-components), and this function needs
 * to be exported for its own test.
 */
export async function processStaleShot(params: {
  gl: THREE.WebGLRenderer;
  scene3d: THREE.Scene;
  scene: Scene;
  shot: Shot;
  hash: string;
  projectId: string;
  sceneId: string;
  readOnly?: boolean;
  applyTransient: (recipe: (draft: Project) => void) => void;
}): Promise<void> {
  const { gl, scene3d, scene, shot, hash, projectId, sceneId, readOnly = false, applyTransient } = params;
  if (readOnly) return;
  try {
    const blob = await renderShotForThumbnail(gl, scene3d, scene, shot);
    const key = `thumb:${shot.id}:${hash}`;
    const previousKey = shot.thumb?.blobKey;

    await putBlob({ key, projectId, kind: "thumb", blob });
    if (previousKey) {
      await deleteBlob(previousKey);
    }

    applyTransient((draft) => {
      setShotThumb(draft, sceneId, shot.id, { blobKey: key, stateHash: hash });
    });
  } catch (error) {
    console.error(`Thumbnail render failed for shot ${shot.id}`, error);
  }
}

async function renderShotForThumbnail(
  gl: THREE.WebGLRenderer,
  scene3d: THREE.Scene,
  scene: Scene,
  shot: Shot
): Promise<Blob> {
  const resolved = resolveSceneAll(scene, shot, 0);
  const framing = cameraAt(shot.camera, 0);

  type ObjectSnapshot = {
    visible: boolean;
    position: THREE.Vector3;
    rotationY: number;
    scale: number;
  };
  const objectSnapshots = new Map<string, ObjectSnapshot>();
  const helperSnapshots = new Map<THREE.Object3D, boolean>();

  // Everything from here through the try/finally below runs with no await in
  // between: renderShotPixels is synchronous, so the live render loop, which
  // runs on its own schedule outside this function, can never draw a frame
  // while the scene sits in another shot's layout. The visible frame is
  // therefore never actually shown in the overridden state. PNG encoding,
  // the only async step, happens after the finally has already restored
  // every node.
  for (const object of scene.set.objects) {
    const node = scene3d.getObjectByName(`obj:${object.id}`);
    if (!node) continue;

    objectSnapshots.set(object.id, {
      visible: node.visible,
      position: node.position.clone(),
      rotationY: node.rotation.y,
      scale: node.scale.x,
    });

    const resolvedObject = resolved.find((candidate) => candidate.id === object.id);
    if (!resolvedObject) continue;
    node.visible = resolvedObject.visible;
    node.position.set(
      resolvedObject.transform.position[0],
      resolvedObject.transform.position[1],
      resolvedObject.transform.position[2]
    );
    node.rotation.y = resolvedObject.transform.rotationY;
    node.scale.setScalar(resolvedObject.transform.scale);
  }

  scene3d.traverse((node) => {
    if (node.name.startsWith("helper:")) {
      helperSnapshots.set(node, node.visible);
      node.visible = false;
    }
  });

  let pixels: { pixels: Uint8Array; width: number; height: number };
  try {
    pixels = renderShotPixels(gl, scene3d, framing, shot.camera.lensMm);
  } finally {
    for (const [id, snapshot] of objectSnapshots) {
      const node = scene3d.getObjectByName(`obj:${id}`);
      if (!node) continue;
      node.visible = snapshot.visible;
      node.position.copy(snapshot.position);
      node.rotation.y = snapshot.rotationY;
      node.scale.setScalar(snapshot.scale);
    }
    for (const [node, visible] of helperSnapshots) {
      node.visible = visible;
    }
  }

  return pixelsToPngBlob(pixels.pixels, pixels.width, pixels.height);
}
