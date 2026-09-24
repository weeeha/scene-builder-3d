import type { ThreeEvent } from "@react-three/fiber";
import type { Group } from "three";

import type { StageObject } from "@/domain/types";
import { DollMesh } from "@/viewport/DollMesh";
import { PrimitiveMesh } from "@/viewport/PrimitiveMesh";

type SceneContentsProps = {
  objects: StageObject[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  registerNode?: (id: string, node: Group | null) => void;
};

const CLICK_SLOP = 4;

/** Renders resolveSceneAll's output as meshes: every set object, always
 * mounted, hidden ones included. Each object's root group is named
 * "obj:<id>" and carries visible={object.visible}, so both tests and the
 * gizmo can find it in the scene graph whether or not it is drawn right
 * now. Props kind is not rendered until S2; it is skipped here. A click
 * on a hidden object, or one that traveled more than CLICK_SLOP pixels
 * (an orbit or gizmo drag), does not change the selection. */
export function SceneContents({ objects, selectedId = null, onSelect, registerNode }: SceneContentsProps) {
  const handleSelect = (id: string, visible: boolean) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!visible) return;
    if (event.delta > CLICK_SLOP) return;
    onSelect?.(id);
  };

  return (
    <>
      {objects.map((object) => {
        if (object.kind === "doll") {
          return (
            <DollMesh
              key={object.id}
              object={object}
              selected={object.id === selectedId}
              visible={object.visible}
              onSelect={handleSelect(object.id, object.visible)}
              ref={(node) => registerNode?.(object.id, node)}
            />
          );
        }
        if (object.kind === "primitive") {
          return (
            <PrimitiveMesh
              key={object.id}
              object={object}
              visible={object.visible}
              onSelect={handleSelect(object.id, object.visible)}
              ref={(node) => registerNode?.(object.id, node)}
            />
          );
        }
        return null;
      })}
    </>
  );
}
