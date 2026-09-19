import type { StageObject } from "@/domain/types";
import { DollMesh } from "@/viewport/DollMesh";
import { PrimitiveMesh } from "@/viewport/PrimitiveMesh";

type SceneContentsProps = { objects: StageObject[] };

/** Renders resolveSceneAll's output as meshes: every set object, always
 * mounted, hidden ones included. Each object's root group is named
 * "obj:<id>" and carries visible={object.visible}, so a hidden object
 * stays in the scene graph (for Task 21's offscreen thumbnail render of a
 * different shot) without being drawn or picked in this one. Props kind
 * is not rendered until S2; it is skipped here. */
export function SceneContents({ objects }: SceneContentsProps) {
  return (
    <>
      {objects.map((object) => {
        if (object.kind === "doll") {
          return <DollMesh key={object.id} object={object} selected={false} visible={object.visible} />;
        }
        if (object.kind === "primitive") {
          return <PrimitiveMesh key={object.id} object={object} visible={object.visible} />;
        }
        return null;
      })}
    </>
  );
}
