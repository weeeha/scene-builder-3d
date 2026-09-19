import { useCallback, useMemo, useState } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";

import { findScene, findShot } from "@/domain/lookup";
import { resolveSceneAll } from "@/domain/resolve";
import type { Scene, Shot } from "@/domain/types";
import { useDocumentStore } from "@/state/document-store";
import { useEditorStore, type CameraMode } from "@/state/editor-store";
import { usePlaybackStore } from "@/state/playback-store";
import { Ground } from "@/viewport/Ground";
import { SceneContents } from "@/viewport/SceneContents";
import { OrbitRig } from "@/viewport/rigs/OrbitRig";
import { PlanRig } from "@/viewport/rigs/PlanRig";
import { ShotCameraRig } from "@/viewport/rigs/ShotCameraRig";

type StageCanvasProps = { sceneId: string; shotId: string | null };

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

function pickRig(shotId: string | null, cameraMode: CameraMode, shot: Shot | null, t: number) {
  if (shotId !== null && shot !== null && cameraMode !== "orbit") {
    return <ShotCameraRig camera={shot.camera} t={t} />;
  }
  if (cameraMode === "plan") {
    return <PlanRig />;
  }
  return <OrbitRig />;
}

/** The one live canvas, mounted once by the stage layout. Reads the open
 * project, resolves the scene at the current shot and time through
 * resolveSceneAll (every set object stays mounted, hidden ones included),
 * and renders it. A WebGL context loss remounts the canvas once (a key
 * bump); an unknown scene id renders an empty stage rather than
 * throwing. */
export function StageCanvas({ sceneId, shotId }: StageCanvasProps) {
  const project = useDocumentStore((s) => s.project);
  const cameraMode = useEditorStore((s) => s.cameraMode);
  const t = usePlaybackStore((s) => s.time);
  const [canvasKey, setCanvasKey] = useState(0);

  const scene: Scene | null = project ? findScene(project, sceneId) : null;
  const shot: Shot | null = project && shotId ? (findShot(project, shotId)?.shot ?? null) : null;

  const objects = useMemo(() => (scene ? resolveSceneAll(scene, shot, t) : []), [scene, shot, t]);

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

  return (
    <Canvas key={canvasKey} onCreated={handleCreated}>
      <Lighting />
      <Ground />
      <SceneContents objects={objects} />
      {pickRig(shotId, cameraMode, shot, t)}
    </Canvas>
  );
}
