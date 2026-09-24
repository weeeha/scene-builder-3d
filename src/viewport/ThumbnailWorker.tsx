import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

import { useDocumentStore } from "@/state/document-store";
import { resolveSceneAll, cameraAt } from "@/domain/resolve";
import { hashShotState } from "@/domain/hash";
import { shotsNeedingThumbs } from "@/viewport/thumbnail-queue";
import { renderShotPixels, pixelsToPngBlob } from "@/viewport/thumbnails";
import { putBlob, deleteBlob } from "@/storage/blob-store";
import { setShotThumb } from "@/state/shot-actions";
import type { Scene, Shot } from "@/domain/types";

export function ThumbnailWorker({ scene, sceneId }: { scene: Scene; sceneId: string }) {
  const { gl, scene: scene3d } = useThree();
  const project = useDocumentStore((s) => s.project);
  const applyTransient = useDocumentStore((s) => s.applyTransient);
  const rendering = useRef(false);

  useEffect(() => {
    if (!project) return;

    const timer = window.setTimeout(async () => {
      if (rendering.current) return;
      rendering.current = true;
      try {
        const hashes: Record<string, string> = {};
        for (const shot of scene.shots) {
          hashes[shot.id] = await hashShotState(scene, shot, project.props);
        }

        const staleIds = shotsNeedingThumbs(scene, hashes);
        for (const shotId of staleIds) {
          const shot = scene.shots.find((candidate) => candidate.id === shotId);
          if (!shot) continue;

          const blob = await renderShotForThumbnail(gl, scene3d, scene, shot);
          const key = `thumb:${shot.id}:${hashes[shotId]}`;
          const previousKey = shot.thumb?.blobKey;

          await putBlob({ key, projectId: project.id, kind: "thumb", blob });
          if (previousKey) {
            await deleteBlob(previousKey);
          }

          applyTransient((draft) => {
            setShotThumb(draft, sceneId, shot.id, { blobKey: key, stateHash: hashes[shotId] });
          });
        }
      } finally {
        rendering.current = false;
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [project, scene, sceneId, gl, scene3d, applyTransient]);

  return null;
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
