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
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@weeeha/ui/components/breadcrumb";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@weeeha/ui/components/tooltip";
import { FolderOpen, Keyboard, TriangleAlert } from "lucide-react";

import { SaveBanner } from "@/app/components/SaveBanner";
import { ReadOnlyNotice } from "@/app/components/ReadOnlyNotice";
import { UndoRedoButtons } from "@/app/components/UndoRedoButtons";
import { ExportImportButtons } from "@/app/components/ExportImportButtons";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { useKeyboardShortcuts } from "@/app/hooks/useKeyboardShortcuts";
import { ShortcutsSheet } from "@/components/super-ai/shortcuts-sheet";
import type { ShortcutSection } from "@/components/super-ai/shortcuts-sheet";

let persistRequested = false;

type LoadState = "loading" | "not-found" | "error" | "ready";

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: "Editing",
    shortcuts: [
      { label: "Undo", keys: ["⌘", "Z"] },
      { label: "Redo", keys: ["⇧", "⌘", "Z"] },
      { label: "Delete selection", keys: ["Delete"] },
    ],
  },
  {
    title: "Gizmo",
    shortcuts: [
      { label: "Move", keys: ["W"] },
      { label: "Rotate", keys: ["E"] },
      { label: "Scale", keys: ["R"] },
    ],
  },
  {
    title: "Shots",
    shortcuts: [
      { label: "Previous shot", keys: ["["] },
      { label: "Next shot", keys: ["]"] },
    ],
  },
  {
    title: "Help",
    shortcuts: [{ label: "Shortcuts", keys: ["?"] }],
  },
];

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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const releaseRef = useRef<(() => void) | null>(null);

  const project = useDocumentStore((s) => s.project);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const saveStatus = useDocumentStore((s) => s.saveStatus);
  const saveFailures = useDocumentStore((s) => s.saveFailures);

  useKeyboardShortcuts({ onOpenShortcuts: () => setShortcutsOpen(true) });

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let cancelled = false;
    let autosaver: ReturnType<typeof createAutosaver> | null = null;

    async function open() {
      try {
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
            // Guards against a stale write: once this effect's cleanup has
            // run (project changed, or the layout unmounted), a save that
            // was in flight or retrying for the OLD project must not
            // report its outcome here. The store may already hold a
            // different project's document by the time this fires, since
            // a failed save can keep retrying for seconds after the tab
            // has moved on (see the fix-round-1 note below cleanup).
            if (cancelled) return;
            // useDocumentStore is a zustand store: setState merges these
            // two fields into DocumentState without touching its actions.
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
      } catch {
        if (cancelled) return;
        // Release anything this attempt did acquire before failing (only
        // possible if loadProject succeeded but something after it threw;
        // when loadProject itself throws, releaseRef is still null here).
        releaseRef.current?.();
        releaseRef.current = null;
        setState("error");
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
      setAutosaver(null);
      // Close synchronously, before any of the async teardown below. React
      // always finishes running this cleanup before the next effect run (the
      // next project's own open()) starts, so a synchronous close() here can
      // never execute after that project has already loaded and wipe it.
      useDocumentStore.getState().close();

      const teardownAutosaver = autosaver;
      const teardownRelease = releaseRef.current;
      releaseRef.current = null;

      void (async () => {
        // Still attempt whatever edit was pending (Task 11 contract: no
        // save is ever silently dropped), and release the lock only once
        // that attempt has fully settled, successfully or not, so a second
        // tab can never acquire the lock - and open a stale document -
        // while this tab might still be about to write to it.
        await teardownAutosaver?.flush();
        teardownAutosaver?.dispose();
        teardownRelease?.();
      })();
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

  if (state === "error") {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert />
          </EmptyMedia>
          <EmptyTitle>Could not load this project</EmptyTitle>
          <EmptyDescription>
            Something went wrong loading it. Try again, or go back to your
            projects.
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
      <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2">
          <UndoRedoButtons />
          <ExportImportButtons />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Keyboard shortcuts"
                  onClick={() => setShortcutsOpen(true)}
                >
                  <Keyboard />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Keyboard shortcuts</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ThemeToggle />
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
      <ShortcutsSheet
        sections={SHORTCUT_SECTIONS}
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </div>
  );
}
