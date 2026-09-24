import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "@weeeha/ui/components/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "@weeeha/ui/components/card";
import { Badge } from "@weeeha/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@weeeha/ui/components/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@weeeha/ui/components/alert-dialog";
import { Field, FieldLabel, FieldContent } from "@weeeha/ui/components/field";
import { Input } from "@weeeha/ui/components/input";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@weeeha/ui/components/empty";
import { Skeleton } from "@weeeha/ui/components/skeleton";
import { toast } from "sonner";
import { FolderOpen, Plus, Trash2, Upload } from "lucide-react";

import { listProjects, saveProject, deleteProject } from "@/storage/project-repo";
import type { ProjectSummary } from "@/storage/project-repo";
import { importProjectJson } from "@/storage/export-import";
import { createProject } from "@/domain/factories";
import { ThemeToggle } from "@/app/components/ThemeToggle";

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<ProjectSummary[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    listProjects().then(setSummaries);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const project = createProject(trimmed);
    await saveProject(project);
    setCreateOpen(false);
    setName("");
    navigate(`/p/${project.id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    refresh();
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const project = await importProjectJson(file);
      await saveProject(project);
      navigate(`/p/${project.id}`);
    } catch {
      toast.error("That file could not be imported.");
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-medium">Projects</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportChange}
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus />
                New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Name the project</DialogTitle>
              </DialogHeader>
              <Field>
                <FieldLabel htmlFor="project-name">Project name</FieldLabel>
                <FieldContent>
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreate();
                      }
                    }}
                    autoFocus
                  />
                </FieldContent>
              </Field>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!name.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {summaries === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : summaries.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpen />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create a project to start dressing a set and framing shots.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {summaries.map((summary) => (
            <li key={summary.id}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Link to={`/p/${summary.id}`} className="hover:underline">
                      {summary.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    Updated {formatUpdatedAt(summary.updatedAt)}
                  </CardDescription>
                  <CardAction>
                    <Badge variant="outline">{summary.sceneCount} scenes</Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${summary.name}`}
                      >
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this project</AlertDialogTitle>
                        <AlertDialogDescription>
                          This deletes {summary.name} and its blobs. This cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(summary.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
