import { ButtonGroup } from "@weeeha/ui/components/button-group";
import { Button } from "@weeeha/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@weeeha/ui/components/tooltip";
import { Box, Cylinder, Circle, Square, RectangleHorizontal, User } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { addObject } from "@/state/object-actions";
import { createPrimitive, createDoll } from "@/domain/factories";
import type { PrimitiveShape } from "@/domain/types";
import type { WriteTarget } from "@/state/editor-store";

const PRIMITIVES: { shape: PrimitiveShape; label: string; icon: typeof Box }[] = [
  { shape: "box", label: "Box", icon: Box },
  { shape: "cylinder", label: "Cylinder", icon: Cylinder },
  { shape: "sphere", label: "Sphere", icon: Circle },
  { shape: "plane", label: "Plane", icon: Square },
  { shape: "wall", label: "Wall", icon: RectangleHorizontal },
];

export function ObjectPalette({
  sceneId,
  shotId,
  writeTarget = "set",
}: {
  sceneId: string;
  shotId: string | null;
  writeTarget?: WriteTarget;
}) {
  const apply = useDocumentStore((s) => s.apply);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const onlyInShotId = shotId && writeTarget === "shot" ? shotId : undefined;

  const handleAddPrimitive = (shape: PrimitiveShape) => {
    apply((draft) => {
      addObject(draft, sceneId, createPrimitive(shape), { onlyInShotId });
    });
  };

  const handleAddDoll = () => {
    apply((draft) => {
      addObject(draft, sceneId, createDoll(), { onlyInShotId });
    });
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">Add to the set</span>
        <ButtonGroup>
          {PRIMITIVES.map(({ shape, label, icon: Icon }) => (
            <Tooltip key={shape}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Add ${label.toLowerCase()}`}
                  disabled={readOnly}
                  onClick={() => handleAddPrimitive(shape)}
                >
                  <Icon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Add doll"
                disabled={readOnly}
                onClick={handleAddDoll}
              >
                <User />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Doll</TooltipContent>
          </Tooltip>
        </ButtonGroup>
      </div>
    </TooltipProvider>
  );
}
