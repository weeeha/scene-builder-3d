import { useParams } from "react-router";

import { ScrollArea } from "@weeeha/ui/components/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@weeeha/ui/components/toggle-group";
import { Field, FieldLabel, FieldContent } from "@weeeha/ui/components/field";
import { Textarea } from "@weeeha/ui/components/textarea";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@weeeha/ui/components/empty";
import { Orbit, Grid2x2, Box } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { findScene } from "@/domain/lookup";
import { setSceneNotes } from "@/state/shot-actions";
import { ObjectPalette } from "@/app/components/ObjectPalette";
import { Inspector } from "@/app/components/Inspector";

export function ScenePage() {
  const { sceneId } = useParams<{ sceneId: string }>();
  const project = useDocumentStore((s) => s.project);
  const apply = useDocumentStore((s) => s.apply);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const cameraMode = useEditorStore((s) => s.cameraMode);
  const setCameraMode = useEditorStore((s) => s.setCameraMode);

  if (!project || !sceneId) return null;
  const scene = findScene(project, sceneId);
  if (!scene) return null;

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-4">
        <ToggleGroup
          type="single"
          value={cameraMode === "plan" ? "plan" : "orbit"}
          onValueChange={(value) => value && setCameraMode(value as "orbit" | "plan")}
          variant="outline"
        >
          <ToggleGroupItem value="orbit" aria-label="Orbit camera">
            <Orbit />
            Orbit
          </ToggleGroupItem>
          <ToggleGroupItem value="plan" aria-label="Plan camera">
            <Grid2x2 />
            Plan
          </ToggleGroupItem>
        </ToggleGroup>

        <ObjectPalette sceneId={sceneId} shotId={null} />

        {scene.set.objects.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Box />
              </EmptyMedia>
              <EmptyTitle>The set is empty</EmptyTitle>
              <EmptyDescription>
                Add a primitive or a doll to start dressing it.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Inspector page="scene" sceneId={sceneId} shotId={null} />
        )}

        <Field>
          <FieldLabel htmlFor="scene-notes">Notes</FieldLabel>
          <FieldContent>
            <Textarea
              id="scene-notes"
              value={scene.notes}
              disabled={readOnly}
              onChange={(event) => {
                apply((draft) => {
                  setSceneNotes(draft, sceneId, event.target.value);
                });
              }}
              placeholder="What is this scene about"
            />
          </FieldContent>
        </Field>
      </div>
    </ScrollArea>
  );
}
