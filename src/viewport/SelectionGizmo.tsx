import type { Group } from "three";

import { useDocumentStore } from "@/state/document-store";
import { Gizmo } from "@/viewport/Gizmo";

type SelectionGizmoProps = {
  target: Group | null;
  objectId: string | null;
  sceneId: string;
  page: "scene" | "shot";
  shotId: string | null;
  visible: boolean;
};

/**
 * Owns the mount decision for the transform Gizmo, the same way
 * ShotCameraRig owns whether its OrbitControls mount: nothing renders
 * without a selected, visible object's node, and nothing renders in a
 * read-only document either, since a drag that could never be saved would
 * otherwise still move the mesh in view. readOnly is read directly from
 * the document store, the same way Inspector and ShotCameraRig read it,
 * rather than threaded through as a prop from StageCanvas.
 */
export function SelectionGizmo({ target, objectId, sceneId, page, shotId, visible }: SelectionGizmoProps) {
  const readOnly = useDocumentStore((s) => s.readOnly);
  if (!target || !objectId || !visible || readOnly) return null;
  return <Gizmo target={target} objectId={objectId} sceneId={sceneId} page={page} shotId={shotId} />;
}
