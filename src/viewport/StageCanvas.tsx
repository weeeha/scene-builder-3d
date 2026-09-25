import { useCallback, useMemo, useRef, useState } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import type { Group } from "three";

import { findScene, findShot } from "@/domain/lookup";
import { resolveSceneAll } from "@/domain/resolve";
import type { Scene, Shot } from "@/domain/types";
import { useDocumentStore } from "@/state/document-store";
import { useEditorStore, type CameraMode } from "@/state/editor-store";
import { usePlaybackStore } from "@/state/playback-store";
import { Ground } from "@/viewport/Ground";
import { SelectionGizmo } from "@/viewport/SelectionGizmo";
import { SceneContents } from "@/viewport/SceneContents";
import { ThumbnailWorker } from "@/viewport/ThumbnailWorker";
import { OrbitRig } from "@/viewport/rigs/OrbitRig";
import { PlanRig } from "@/viewport/rigs/PlanRig";
import { ShotCameraRig } from "@/viewport/rigs/ShotCameraRig";

type StageCanvasProps = { sceneId: string; shotId: string | null };

const CLICK_SLOP = 4;

/** Ambient + directional key light, plus a drei Environment built entirely
 * from Lightformer children so props and metal materials get a believable
 * reflection with no HDRI fetched from a CDN (the fix Film Planner's
 * viewer needed for metal materials rendering near black). */
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 4]} intensity={1.2} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={1} position={[-5, 2, 5]} scale={[5, 5, 1]} />
        <Lightformer form="rect" intensity={1} position={[5, 2, -5]} scale={[5, 5, 1]} rotation={[0, Math.PI, 0]} />
      </Environment>
    </>
  );
}

function pickRig(sceneId: string, shotId: string | null, cameraMode: CameraMode, shot: Shot | null, t: number) {
  if (shotId !== null && shot !== null && cameraMode !== "orbit") {
    return (
      <ShotCameraRig
        camera={shot.camera}
        t={t}
        sceneId={sceneId}
        shotId={shotId}
        interactive={cameraMode === "shot"}
      />
    );
  }
  if (cameraMode === "plan") {
    return <PlanRig />;
  }
  return <OrbitRig />;
}

/** The one live canvas, mounted once by the stage layout. It renders on
 * demand: a frame is drawn only after a prop change, a controls drag or a
 * resize, since R3F and drei's controls invalidate on each of those. A
 * continuous loop redrew an unchanged stage every frame, which on software
 * WebGL (CI runners without a GPU) starved the main thread. Anything that
 * animates later (M3 playback) must call invalidate() while it runs. */
export function StageCanvas({ sceneId, shotId }: StageCanvasProps) {
  const project = useDocumentStore((s) => s.project);
  const cameraMode = useEditorStore((s) => s.cameraMode);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const select = useEditorStore((s) => s.select);
  const t = usePlaybackStore((s) => s.time);
  const [canvasKey, setCanvasKey] = useState(0);

  const scene: Scene | null = project ? findScene(project, sceneId) : null;
  const shot: Shot | null = project && shotId ? (findShot(project, shotId)?.shot ?? null) : null;

  const objects = useMemo(() => (scene ? resolveSceneAll(scene, shot, t) : []), [scene, shot, t]);
  const selectedObject = selectedObjectId ? (objects.find((o) => o.id === selectedObjectId) ?? null) : null;

  const nodesRef = useRef(new Map<string, Group>());
  const registerNode = useCallback((id: string, node: Group | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);
  // Read during render on purpose: nodesRef is populated by mount-time ref
  // callbacks on SceneContents's children, not by React state, so this
  // look-up decides whether Gizmo attaches in this same render pass. It
  // never reads a ref value this component's own render just wrote.
  // eslint-disable-next-line react-hooks/refs -- see comment above
  const selectedNode = selectedObjectId ? (nodesRef.current.get(selectedObjectId) ?? null) : null;

  const pointerDownAt = useRef<{ x: number; y: number } | null>(null);
  const handlePointerDown = useCallback((event: { clientX: number; clientY: number }) => {
    pointerDownAt.current = { x: event.clientX, y: event.clientY };
  }, []);
  const handlePointerMissed = useCallback(
    (event: MouseEvent) => {
      const down = pointerDownAt.current;
      if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > CLICK_SLOP) return;
      select(null);
    },
    [select]
  );

  const handleCreated = useCallback((state: RootState) => {
    state.gl.domElement.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        setCanvasKey((k) => k + 1);
      },
      { once: true }
    );
  }, []);

  const page: "scene" | "shot" = shotId === null ? "scene" : "shot";

  return (
    <Canvas
      key={canvasKey}
      onCreated={handleCreated}
      onPointerDown={handlePointerDown}
      onPointerMissed={handlePointerMissed}
      frameloop="demand"
    >
      <Lighting />
      <Ground />
      <SceneContents objects={objects} selectedId={selectedObjectId} onSelect={select} registerNode={registerNode} />
      {scene && <ThumbnailWorker scene={scene} sceneId={scene.id} />}
      {scene && (
        <SelectionGizmo
          target={selectedNode}
          objectId={selectedObjectId}
          sceneId={scene.id}
          page={page}
          shotId={shotId}
          visible={selectedObject?.visible ?? false}
        />
      )}
      {pickRig(scene?.id ?? sceneId, shotId, cameraMode, shot, t)}
    </Canvas>
  );
}
