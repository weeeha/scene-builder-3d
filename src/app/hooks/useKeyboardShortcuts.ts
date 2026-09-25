import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";

import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { deleteObject } from "@/state/object-actions";
import { findShot } from "@/domain/lookup";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function useKeyboardShortcuts(options: { onOpenShortcuts: () => void }) {
  const navigate = useNavigate();
  const { projectId, sceneId, shotId } = useParams<{
    projectId: string;
    sceneId?: string;
    shotId?: string;
  }>();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;
      if (isTypingTarget(event.target)) return;

      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          useDocumentStore.getState().redo();
        } else {
          useDocumentStore.getState().undo();
        }
        return;
      }
      if (meta) return;

      if (event.key === "?") {
        event.preventDefault();
        options.onOpenShortcuts();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const { selectedObjectId } = useEditorStore.getState();
        const project = useDocumentStore.getState().project;
        const activeSceneId = sceneId ?? (shotId && project ? findShot(project, shotId)?.scene.id : undefined);
        if (!selectedObjectId || !project || !activeSceneId) return;
        event.preventDefault();
        useDocumentStore.getState().apply((draft) => {
          deleteObject(draft, activeSceneId, selectedObjectId);
        });
        useEditorStore.getState().select(null);
        return;
      }

      if (event.key === "w" || event.key === "W") {
        useEditorStore.getState().setGizmoMode("translate");
        return;
      }
      if (event.key === "e" || event.key === "E") {
        useEditorStore.getState().setGizmoMode("rotate");
        return;
      }
      if (event.key === "r" || event.key === "R") {
        useEditorStore.getState().setGizmoMode("scale");
        return;
      }

      if ((event.key === "[" || event.key === "]") && shotId) {
        const project = useDocumentStore.getState().project;
        const found = project ? findShot(project, shotId) : null;
        if (!found) return;
        const index = found.scene.shots.findIndex((shot) => shot.id === shotId);
        if (index === -1) return;
        const nextIndex = event.key === "[" ? index - 1 : index + 1;
        const nextShot = found.scene.shots[nextIndex];
        if (nextShot) {
          event.preventDefault();
          navigate(`/p/${projectId}/shot/${nextShot.id}`);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, projectId, sceneId, shotId, options]);
}
