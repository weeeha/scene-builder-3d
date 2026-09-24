import { Button } from "@weeeha/ui/components/button";
import { ButtonGroup } from "@weeeha/ui/components/button-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@weeeha/ui/components/tooltip";
import { Undo2, Redo2 } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";

export function UndoRedoButtons() {
  const canUndo = useDocumentStore((s) => s.canUndo);
  const canRedo = useDocumentStore((s) => s.canRedo);
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);

  // @weeeha/ui's Tooltip throws without a TooltipProvider ancestor (Radix's
  // Tooltip.Provider is required, not optional). Nothing higher in the tree
  // mounts one, so this wraps its own, matching ObjectPalette's precedent
  // (see task-20-report.md, Deviation 1).
  return (
    <TooltipProvider>
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Undo" disabled={!canUndo} onClick={undo}>
              <Undo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Redo" disabled={!canRedo} onClick={redo}>
              <Redo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
      </ButtonGroup>
    </TooltipProvider>
  );
}
