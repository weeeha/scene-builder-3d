import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

import { useDocumentStore } from "@/state/document-store";
import { hashShotState } from "@/domain/hash";
import { shotsNeedingThumbs } from "@/viewport/thumbnail-queue";
import { processStaleShot } from "@/viewport/thumbnail-render";
import type { Scene } from "@/domain/types";

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

          await processStaleShot({
            gl,
            scene3d,
            scene,
            shot,
            hash: hashes[shotId],
            projectId: project.id,
            sceneId,
            applyTransient,
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
