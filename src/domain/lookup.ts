import type { Project, Scene, Shot } from "@/domain/types";

export function findScene(project: Project, sceneId: string): Scene | null {
  return project.scenes.find((scene) => scene.id === sceneId) ?? null;
}

export function findShot(project: Project, shotId: string): { scene: Scene; shot: Shot } | null {
  for (const scene of project.scenes) {
    const shot = scene.shots.find((candidate) => candidate.id === shotId);
    if (shot) {
      return { scene, shot };
    }
  }
  return null;
}
