import { migrateProject, ProjectInvalidError } from "@/domain/migrations";
import { newId } from "@/domain/ids";
import type { Project, Scene } from "@/domain/types";

function stripThumbs(scenes: Scene[]): Scene[] {
  return scenes.map((scene) => ({
    ...scene,
    shots: scene.shots.map((shot) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit it
      const { thumb, ...rest } = shot;
      return rest;
    }),
  }));
}

/** Serializes a project to a downloadable JSON blob, with every shot.thumb stripped (thumbnails are regenerated, not portable). */
export function exportProjectJson(project: Project): Blob {
  const stripped: Project = { ...project, scenes: stripThumbs(project.scenes) };
  return new Blob([JSON.stringify(stripped, null, 2)], { type: "application/json" });
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "project";
}

export function exportFileName(project: Project): string {
  return `${slugify(project.name)}.sb3d.json`;
}

/**
 * Reads a project file: parses its JSON, migrates and validates it, strips
 * every shot.thumb, and assigns a fresh project id and fresh
 * createdAt/updatedAt timestamps, so an import always creates a copy
 * rather than colliding with the original. Never saves; the caller decides
 * when to persist the result.
 */
export async function importProjectJson(file: Blob): Promise<Project> {
  const text = await file.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ProjectInvalidError("The file is not valid JSON.");
  }

  const migrated = migrateProject(raw);
  const now = new Date().toISOString();
  return {
    ...migrated,
    id: newId(),
    scenes: stripThumbs(migrated.scenes),
    createdAt: now,
    updatedAt: now,
  };
}
