import { useParams } from "react-router";

import { ScrollArea } from "@weeeha/ui/components/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@weeeha/ui/components/toggle-group";
import { Video, Orbit } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { findShot } from "@/domain/lookup";
import { WriteTargetSwitch } from "@/app/components/WriteTargetSwitch";
import { ObjectPalette } from "@/app/components/ObjectPalette";
import { Inspector } from "@/app/components/Inspector";

export function ShotPage() {
  const { shotId } = useParams<{ shotId: string }>();
  const project = useDocumentStore((s) => s.project);
  const cameraMode = useEditorStore((s) => s.cameraMode);
  const setCameraMode = useEditorStore((s) => s.setCameraMode);
  const writeTarget = useEditorStore((s) => s.writeTarget);

  if (!project || !shotId) return null;
  const found = findShot(project, shotId);
  if (!found) return null;
  const { scene, shot } = found;

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-4">
        <ToggleGroup
          type="single"
          value={cameraMode === "orbit" ? "orbit" : "shot"}
          onValueChange={(value) => value && setCameraMode(value as "shot" | "orbit")}
          variant="outline"
        >
          <ToggleGroupItem value="shot" aria-label="Shot camera">
            <Video />
            Shot
          </ToggleGroupItem>
          <ToggleGroupItem value="orbit" aria-label="Orbit camera">
            <Orbit />
            Orbit
          </ToggleGroupItem>
        </ToggleGroup>

        <WriteTargetSwitch />

        <ObjectPalette sceneId={scene.id} shotId={shot.id} writeTarget={writeTarget} />

        <Inspector page="shot" sceneId={scene.id} shotId={shot.id} />
      </div>
    </ScrollArea>
  );
}
