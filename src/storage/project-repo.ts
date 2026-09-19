import { migrateProject } from "@/domain/migrations";
import type { Project } from "@/domain/types";
import { deleteProjectBlobs } from "@/storage/blob-store";
import { openDb } from "@/storage/db";

export type ProjectSummary = { id: string; name: string; updatedAt: string; sceneCount: number };

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await openDb();
  const all = await db.getAll("projects");
  return all
    .map((project) => ({
      id: project.id,
      name: project.name,
      updatedAt: project.updatedAt,
      sceneCount: project.scenes.length,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}

export async function loadProject(id: string): Promise<Project | null> {
  const db = await openDb();
  const raw = await db.get("projects", id);
  if (raw === undefined) {
    return null;
  }
  return migrateProject(raw);
}

export async function saveProject(project: Project): Promise<void> {
  const db = await openDb();
  await db.put("projects", project);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();
  await db.delete("projects", id);
  await deleteProjectBlobs(id);
}
