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

// ext4, APFS and NTFS all reject filenames over 255 bytes; capping the slug
// at 80 characters leaves ample room for the ".sb3d.json" suffix (10 chars)
// while still comfortably identifying the project.
const MAX_SLUG_LENGTH = 80;

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const fallback = base || "project";
  // Truncating can leave a trailing separator (e.g. the cut lands right
  // after a run of non-alphanumeric characters); trim it so the slug never
  // ends in a dash.
  const truncated = fallback.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  return truncated || "project";
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
