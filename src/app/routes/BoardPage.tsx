import { Link, useParams } from "react-router";

import { Button } from "@weeeha/ui/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@weeeha/ui/components/card";
import { Badge } from "@weeeha/ui/components/badge";
import { Skeleton } from "@weeeha/ui/components/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@weeeha/ui/components/empty";
import { Plus, Clapperboard } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { addScene } from "@/state/shot-actions";

export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useDocumentStore((s) => s.project);
  const apply = useDocumentStore((s) => s.apply);
  const readOnly = useDocumentStore((s) => s.readOnly);

  if (!project) {
    return null;
  }

  const handleAddScene = () => {
    apply((draft) => {
      addScene(draft, `Scene ${draft.scenes.length + 1}`);
    });
  };

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-medium">{project.name}</h1>
        <Button onClick={handleAddScene} disabled={readOnly}>
          <Plus />
          Add scene
        </Button>
      </div>

      {project.scenes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Clapperboard />
            </EmptyMedia>
            <EmptyTitle>No scenes yet</EmptyTitle>
            <EmptyDescription>Add a scene to start dressing a set.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {project.scenes.map((scene) => (
            <li key={scene.id}>
              <Link to={`/p/${projectId}/scene/${scene.id}`}>
                <Card>
                  <CardHeader>
                    <CardTitle>{scene.name}</CardTitle>
                    <CardDescription>
                      {scene.shots.length} {scene.shots.length === 1 ? "shot" : "shots"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 overflow-x-hidden">
                      {scene.shots.length === 0 ? (
                        <Badge variant="outline">Empty set</Badge>
                      ) : (
                        scene.shots
                          .slice(0, 4)
                          .map((shot) => (
                            <Skeleton
                              key={shot.id}
                              className="h-12 w-20 shrink-0 rounded-md"
                            />
                          ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
