import { useEffect, useRef, useState } from "react";
import { Outlet, useParams, Link } from "react-router";

import { loadProject, saveProject } from "@/storage/project-repo";
import { acquireProjectLock } from "@/storage/project-lock";
import { createAutosaver } from "@/storage/autosave";
import { useDocumentStore, setAutosaver } from "@/state/document-store";

import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@weeeha/ui/components/empty";
import { Skeleton } from "@weeeha/ui/components/skeleton";
import { Button } from "@weeeha/ui/components/button";
import { FolderOpen } from "lucide-react";

import { SaveBanner } from "@/app/components/SaveBanner";
import { ReadOnlyNotice } from "@/app/components/ReadOnlyNotice";
import { ThemeToggle } from "@/app/components/ThemeToggle";

let persistRequested = false;

type LoadState = "loading" | "not-found" | "ready";

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  // projectId is only ever missing if this layout is mounted outside its
  // "/p/:projectId" route, so this is known at first render, not something
  // the effect below needs to discover. Deriving it here (rather than
  // calling setState("not-found") synchronously inside the effect body)
  // avoids react-hooks/set-state-in-effect: an effect should update
  // external systems or subscribe to them, not set state React already
  // knows on mount.
  const [state, setState] = useState<LoadState>(projectId ? "loading" : "not-found");
  const releaseRef = useRef<(() => void) | null>(null);

  const project = useDocumentStore((s) => s.project);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const saveStatus = useDocumentStore((s) => s.saveStatus);
  const saveFailures = useDocumentStore((s) => s.saveFailures);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let cancelled = false;
    let autosaver: ReturnType<typeof createAutosaver> | null = null;

    async function open() {
      const loaded = await loadProject(projectId!);
      if (cancelled) return;
      if (!loaded) {
        setState("not-found");
        return;
      }

      const lock = await acquireProjectLock(projectId!);
      if (cancelled) {
        lock.release();
        return;
      }
      releaseRef.current = lock.release;

      autosaver = createAutosaver({
        save: saveProject,
        onStatus: (status, failures) => {
          // useDocumentStore is a zustand store: setState merges these two
          // fields into DocumentState without touching its actions.
          useDocumentStore.setState({ saveStatus: status, saveFailures: failures });
        },
      });
      setAutosaver(autosaver);

      useDocumentStore.getState().load(loaded, { readOnly: lock.readOnly });
      setState("ready");

      if (!persistRequested) {
        persistRequested = true;
        void navigator.storage?.persist?.();
      }
    }

    open();

    const flush = () => {
      autosaver?.flush();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
      autosaver?.flush();
      autosaver?.dispose();
      setAutosaver(null);
      releaseRef.current?.();
      releaseRef.current = null;
      useDocumentStore.getState().close();
    };
  }, [projectId]);

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (state === "not-found") {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen />
          </EmptyMedia>
          <EmptyTitle>Project not found</EmptyTitle>
          <EmptyDescription>
            This project does not exist in this browser.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/">Back to projects</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="flex h-dvh flex-col">
      {saveStatus === "error" ? <SaveBanner failures={saveFailures} project={project} /> : null}
      {readOnly ? <ReadOnlyNotice /> : null}
      <header className="flex items-center justify-end gap-2 border-b border-border px-3 py-2">
        <ThemeToggle />
      </header>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
