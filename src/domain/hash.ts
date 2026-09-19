import { resolveScene } from "@/domain/resolve";
import type { PropAsset, Scene, Shot } from "@/domain/types";

/**
 * Deterministically stringifies a value: object keys are sorted
 * recursively; array order is preserved as-is. Ported unchanged from Film
 * Planner's stage/hash.ts: it only touches plain JS values, so nothing
 * about the new document shape affects it.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
  );
  return `{${entries.join(",")}}`;
}

/**
 * Hex SHA-256 digest of the render-relevant slice of a shot's state: the
 * resolved objects at t=0 with their name removed (and, for a prop, the
 * matching asset's unitScale added), the shot's camera, and its duration.
 * Scene notes, object names and the shot's own thumb are excluded on
 * purpose, so renaming or annotating never invalidates a rendered
 * thumbnail. assets defaults to an empty list for scenes with no props.
 */
export async function hashShotState(scene: Scene, shot: Shot, assets: PropAsset[] = []): Promise<string> {
  const objects = resolveScene(scene, shot, 0).map((object) => {
    const { name, ...rest } = object;
    // name is deliberately excluded from rest via the destructure above;
    // this reference is only to satisfy no-unused-vars for the omitted
    // sibling (see the docblock above for why names are stripped).
    void name;
    if (rest.kind === "prop") {
      const asset = assets.find((candidate) => candidate.id === rest.assetId);
      return { ...rest, unitScale: asset?.unitScale };
    }
    return rest;
  });

  const value = { objects, camera: shot.camera, durationSec: shot.durationSec };
  const text = stableStringify(value);
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
