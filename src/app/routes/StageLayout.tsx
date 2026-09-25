import { Outlet, useMatch, useParams, Link } from "react-router";

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@weeeha/ui/components/resizable";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@weeeha/ui/components/empty";
import { Button } from "@weeeha/ui/components/button";
import { Compass } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { findScene, findShot } from "@/domain/lookup";
import { StageCanvas } from "@/viewport/StageCanvas";
import { ShotStrip } from "@/app/components/ShotStrip";

export function StageLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const sceneMatch = useMatch("/p/:projectId/scene/:sceneId");
  const shotMatch = useMatch("/p/:projectId/shot/:shotId");
  const project = useDocumentStore((s) => s.project);

  let sceneId: string | null = null;
  let shotId: string | null = null;
  let notFound = false;

  if (sceneMatch) {
    sceneId = sceneMatch.params.sceneId ?? null;
    if (!project || !sceneId || !findScene(project, sceneId)) {
      notFound = true;
    }
  } else if (shotMatch) {
    shotId = shotMatch.params.shotId ?? null;
    const found = project && shotId ? findShot(project, shotId) : null;
    if (found) {
      sceneId = found.scene.id;
    } else {
      notFound = true;
    }
  } else {
    notFound = true;
  }

  if (notFound || !sceneId) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Compass />
          </EmptyMedia>
          <EmptyTitle>This scene or shot is gone</EmptyTitle>
          <EmptyDescription>
            It may have been deleted, or the link is stale.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to={`/p/${projectId}`}>Back to the board</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ResizablePanelGroup className="h-full">
      <ResizablePanel defaultSize="70" minSize="40">
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1">
            <StageCanvas sceneId={sceneId} shotId={shotId} />
          </div>
          <ShotStrip sceneId={sceneId} />
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="30" minSize="22">
        <Outlet />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
