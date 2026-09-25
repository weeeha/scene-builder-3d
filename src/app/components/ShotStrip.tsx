import { useState } from "react";
import { NavLink, useMatch, useParams } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@weeeha/ui/components/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@weeeha/ui/components/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@weeeha/ui/components/alert-dialog";
import { Button } from "@weeeha/ui/components/button";
import { ScrollArea, ScrollBar } from "@weeeha/ui/components/scroll-area";
import { Skeleton } from "@weeeha/ui/components/skeleton";
import { cn } from "@/lib/utils";
import { Plus, Copy, Trash2, ChevronLeft, ChevronRight, Clapperboard } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { findScene } from "@/domain/lookup";
import { addShot, duplicateShot, deleteShot, moveShot } from "@/state/shot-actions";
import { useBlobObjectUrl } from "@/app/hooks/useBlobObjectUrl";
import type { Shot } from "@/domain/types";

export function ShotStrip({ sceneId }: { sceneId: string }) {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useDocumentStore((s) => s.project);
  const apply = useDocumentStore((s) => s.apply);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const shotMatch = useMatch("/p/:projectId/shot/:shotId");
  const activeShotId = shotMatch?.params.shotId ?? null;

  if (!project) return null;
  const scene = findScene(project, sceneId);
  if (!scene) return null;

  const handleAdd = () => {
    apply((draft) => {
      addShot(draft, sceneId);
    });
  };

  return (
    <ScrollArea className="w-full border-t border-border">
      <div className="flex items-center gap-2 p-2">
        <NavLink
          to={`/p/${projectId}/scene/${sceneId}`}
          className={({ isActive }) =>
            cn(
              "inline-flex h-14 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium",
              isActive ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
            )
          }
        >
          <Clapperboard className="size-4" />
          Set
        </NavLink>

        {scene.shots.map((shot, index) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            index={index}
            sceneId={sceneId}
            projectId={projectId ?? ""}
            active={shot.id === activeShotId}
            canMoveLeft={index > 0}
            canMoveRight={index < scene.shots.length - 1}
            readOnly={readOnly}
          />
        ))}

        <Button
          variant="outline"
          size="icon"
          aria-label="Add shot"
          onClick={handleAdd}
          disabled={readOnly}
        >
          <Plus />
        </Button>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function ShotThumbnailImage({ blobKey }: { blobKey: string | undefined }) {
  const url = useBlobObjectUrl(blobKey);

  if (!url) {
    return <Skeleton className="h-6 w-12 rounded-sm" />;
  }
  return <img src={url} alt="" className="h-6 w-12 rounded-sm object-cover" />;
}

function ShotCard({
  shot,
  index,
  sceneId,
  projectId,
  active,
  canMoveLeft,
  canMoveRight,
  readOnly,
}: {
  shot: Shot;
  index: number;
  sceneId: string;
  projectId: string;
  active: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  readOnly: boolean;
}) {
  const apply = useDocumentStore((s) => s.apply);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleDuplicate = () => {
    apply((draft) => {
      duplicateShot(draft, sceneId, shot.id);
    });
  };
  const handleDelete = () => {
    apply((draft) => {
      deleteShot(draft, sceneId, shot.id);
    });
  };
  const handleMoveLeft = () => {
    apply((draft) => {
      moveShot(draft, sceneId, shot.id, index - 1);
    });
  };
  const handleMoveRight = () => {
    apply((draft) => {
      moveShot(draft, sceneId, shot.id, index + 1);
    });
  };
  const requestDelete = () => setConfirmDeleteOpen(true);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="relative shrink-0">
            <NavLink
              to={`/p/${projectId}/shot/${shot.id}`}
              aria-label={`Shot ${index + 1}, ${shot.name}`}
              className={cn(
                "flex h-14 w-28 flex-col justify-between rounded-lg border border-border p-1.5 text-start text-xs",
                active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-medium">{String(index + 1).padStart(2, "0")}</span>
                <ShotThumbnailImage blobKey={shot.thumb?.blobKey} />
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="truncate">{shot.name}</span>
                <span>{shot.durationSec}s</span>
              </div>
            </NavLink>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute -top-1.5 -end-1.5 rounded-full bg-card"
                  aria-label={`More actions for ${shot.name}`}
                >
                  <span aria-hidden="true">...</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={handleDuplicate} disabled={readOnly}>
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleMoveLeft}
                  disabled={readOnly || !canMoveLeft}
                >
                  <ChevronLeft />
                  Move left
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleMoveRight}
                  disabled={readOnly || !canMoveRight}
                >
                  <ChevronRight />
                  Move right
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={readOnly}
                  onSelect={(event) => {
                    event.preventDefault();
                    requestDelete();
                  }}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={handleDuplicate} disabled={readOnly}>
            <Copy />
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleMoveLeft} disabled={readOnly || !canMoveLeft}>
            <ChevronLeft />
            Move left
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleMoveRight} disabled={readOnly || !canMoveRight}>
            <ChevronRight />
            Move right
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            disabled={readOnly}
            onSelect={(event) => {
              event.preventDefault();
              requestDelete();
            }}
          >
            <Trash2 />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this shot</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes {shot.name}. Cmd+Z still works right after.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
