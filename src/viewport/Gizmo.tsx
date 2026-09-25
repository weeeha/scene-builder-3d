import { useCallback, useEffect, useRef } from "react";
import { TransformControls } from "@react-three/drei";
import type { Group } from "three";

import type { Vec3 } from "@/domain/types";
import { useDocumentStore } from "@/state/document-store";
import { useEditorStore, type GizmoMode } from "@/state/editor-store";
import { updateObject } from "@/state/object-actions";
import { editTargetFor, snapPosition } from "@/viewport/transform-commit";

const TRANSLATE_SNAP_M = 0.25;

type GizmoProps = {
  target: Group;
  objectId: string;
  sceneId: string;
  page: "scene" | "shot";
  shotId: string | null;
};

function axesFor(mode: GizmoMode): { showX: boolean; showY: boolean; showZ: boolean } {
  if (mode === "rotate") return { showX: false, showY: true, showZ: false }; // yaw only
  if (mode === "scale") return { showX: true, showY: false, showZ: false }; // single handle, read back as the uniform factor
  return { showX: true, showY: true, showZ: true };
}

/** Attaches drei TransformControls to the selected object's group. On drag
 * end it reads the group's local transform, snaps translation to 0.25 m
 * (off while Alt is held), and commits through updateObject with the
 * target picked by editTargetFor. Rotate shows only the Y handle (yaw
 * only); scale shows only the X handle, read back as transform.scale's
 * single uniform number. */
export function Gizmo({ target, objectId, sceneId, page, shotId }: GizmoProps) {
  const gizmoMode = useEditorStore((s) => s.gizmoMode);
  const writeTarget = useEditorStore((s) => s.writeTarget);
  const altHeld = useRef(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Alt") altHeld.current = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") altHeld.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const commit = useCallback(() => {
    const rawPosition: Vec3 = [target.position.x, target.position.y, target.position.z];
    const snapped =
      gizmoMode === "translate" ? snapPosition(rawPosition, TRANSLATE_SNAP_M, !altHeld.current) : rawPosition;
    target.position.set(snapped[0], snapped[1], snapped[2]);

    const editTarget = editTargetFor(page, writeTarget, shotId);
    useDocumentStore.getState().apply((draft) => {
      updateObject(
        draft,
        sceneId,
        objectId,
        {
          transform: {
            position: snapped,
            rotationY: target.rotation.y,
            scale: target.scale.x,
          },
        },
        editTarget
      );
    });
  }, [target, gizmoMode, page, writeTarget, shotId, sceneId, objectId]);

  const axes = axesFor(gizmoMode);

  return (
    <group name="helper:gizmo">
      <TransformControls
        object={target}
        mode={gizmoMode}
        showX={axes.showX}
        showY={axes.showY}
        showZ={axes.showZ}
        onMouseUp={commit}
      />
    </group>
  );
}
