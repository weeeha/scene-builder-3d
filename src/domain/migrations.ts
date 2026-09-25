import { CURRENT_SCHEMA_VERSION, projectSchema } from "@/domain/schema";
import type { Project } from "@/domain/types";

/** Thrown when a document's schemaVersion is newer than this app understands. */
export class ProjectVersionError extends Error {}

/** Thrown when a document fails schema validation, at any schemaVersion. */
export class ProjectInvalidError extends Error {}

/**
 * Reads a raw, untrusted value's schemaVersion, runs any migrations up to
 * CURRENT_SCHEMA_VERSION, then validates the result. There are no
 * migrations yet: schemaVersion 1 is the only version that has ever
 * shipped, so this function's migration step is currently a no-op, and
 * exists so a future schemaVersion 2 has a place to plug in without
 * touching every caller.
 */
export function migrateProject(raw: unknown): Project {
  if (typeof raw !== "object" || raw === null) {
    throw new ProjectInvalidError("Project document is not an object.");
  }

  const schemaVersion = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (typeof schemaVersion === "number" && schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new ProjectVersionError(
      `This project was saved by a newer version of the app (schema ${schemaVersion}, this app supports up to ${CURRENT_SCHEMA_VERSION}).`,
    );
  }

  const result = projectSchema.safeParse(raw);
  if (!result.success) {
    throw new ProjectInvalidError(`Project document failed validation: ${result.error.message}`);
  }
  return result.data;
}
