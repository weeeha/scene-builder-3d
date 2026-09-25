import type { Scene } from "@/domain/types";

export function shotsNeedingThumbs(
  scene: Scene,
  currentHashes: Record<string, string>
): string[] {
  return scene.shots
    .filter((shot) => !shot.thumb || shot.thumb.stateHash !== currentHashes[shot.id])
    .map((shot) => shot.id);
}
