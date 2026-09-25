/** Generates a fresh random id for a project, scene, shot, object or asset. */
export function newId(): string {
  return crypto.randomUUID();
}
