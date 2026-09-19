import { Canvas } from "@react-three/fiber";
import { XR } from "@react-three/xr";
import { STAGE_BACKGROUND } from "@/stage/render/clip-constants";
import { OVERVIEW_CAMERA_POSITION, OVERVIEW_LOOK_AT } from "./constants";
import { StageMount } from "./xr/StageMount";
import { VirtualCamera } from "./xr/VirtualCamera";
import { BodyMonitor, HandMonitor, HudMonitor, Viewfinder } from "./xr/Viewfinder";
import { xrStore } from "./xr/xr-store";
import { useEffect, useMemo } from "react";
import { serializeTake } from "./camera/take";
import { useSpikeStore } from "./store";
import { DebugPanel, PanelFace } from "./xr/DebugPanel";
import { Recorder, startJitterTest, startReplay, toggleRecording } from "./xr/Recorder";
// ANCHOR:imports

const overlayStyle = {
  position: "absolute",
  top: 12,
  left: 12,
  maxWidth: 420,
  padding: "10px 12px",
  background: "rgba(11, 13, 17, 0.82)",
  borderRadius: 8,
  fontSize: 13,
  lineHeight: 1.5,
} as const;

export function App() {
  const lastTake = useSpikeStore((s) => s.lastTake);
  const saveStatus = useSpikeStore((s) => s.saveStatus);

  // A download link for the last take: the fallback when no dev server is there to receive the POST.
  const downloadUrl = useMemo(
    () => (lastTake ? URL.createObjectURL(new Blob([serializeTake(lastTake)], { type: "application/json" })) : null),
    [lastTake],
  );
  useEffect(
    () => () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    },
    [downloadUrl],
  );

  // Flat-page controls. They mirror the controller bindings of spec section 4.5.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const store = useSpikeStore.getState();
      const key = event.key.toLowerCase();
      if (key === "r") toggleRecording();
      else if (key === "p") startReplay();
      else if (key === "j") startJitterTest();
      else if (key === "[") store.stepLens(-1);
      else if (key === "]") store.stepLens(1);
      else if (key === "s") store.cycleSmoothing();
      else if (key === "-") store.stepVfRes(-1);
      else if (key === "=") store.stepVfRes(1);
      else if (key === "d") store.togglePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // ANCHOR:hooks
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas
        flat
        camera={{ position: OVERVIEW_CAMERA_POSITION, fov: 50, near: 0.05, far: 200 }}
        onCreated={({ camera }) => camera.lookAt(OVERVIEW_LOOK_AT[0], OVERVIEW_LOOK_AT[1], OVERVIEW_LOOK_AT[2])}
      >
        <color attach="background" args={[STAGE_BACKGROUND]} />
        <XR store={xrStore}>
          <StageMount />
          {/* ANCHOR:input */}
          <VirtualCamera>
            <BodyMonitor />
          </VirtualCamera>
          <HandMonitor>
            <PanelFace widthM={0.4} />
            {/* ANCHOR:hand-panel */}
          </HandMonitor>
          <HudMonitor>
            <PanelFace widthM={0.5} />
            {/* ANCHOR:hud-panel */}
          </HudMonitor>
          <Recorder />
          <DebugPanel />
          {/* ANCHOR:logic */}
          <Viewfinder />
        </XR>
      </Canvas>
      <div style={overlayStyle}>
        <strong>THROWAWAY spike</strong> (exploration): VR camera feel
        <div>Keys: R record or stop, P replay, [ and ] lens, S smoothing, - and = viewfinder size, J jitter test, D panel</div>
        <div>{saveStatus}</div>
        {downloadUrl && lastTake && (
          <div>
            <a href={downloadUrl} download={`${lastTake.id}.json`} style={{ color: "#88c0d0" }}>
              Download last take ({lastTake.id})
            </a>
          </div>
        )}
        <div>
          <a href="#/replay" style={{ color: "#88c0d0" }}>
            Open the replay page
          </a>
        </div>
        {/* ANCHOR:overlay */}
      </div>
    </div>
  );
}
