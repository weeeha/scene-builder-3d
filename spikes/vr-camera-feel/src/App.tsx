import { Canvas } from "@react-three/fiber";
import { XR } from "@react-three/xr";
import { STAGE_BACKGROUND } from "@/stage/render/clip-constants";
import { OVERVIEW_CAMERA_POSITION, OVERVIEW_LOOK_AT } from "./constants";
import { StageMount } from "./xr/StageMount";
import { VirtualCamera } from "./xr/VirtualCamera";
import { BodyMonitor, HandMonitor, HudMonitor, Viewfinder } from "./xr/Viewfinder";
import { xrStore } from "./xr/xr-store";
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
            {/* ANCHOR:hand-panel */}
          </HandMonitor>
          <HudMonitor>
            {/* ANCHOR:hud-panel */}
          </HudMonitor>
          {/* ANCHOR:logic */}
          <Viewfinder />
        </XR>
      </Canvas>
      <div style={overlayStyle}>
        <strong>THROWAWAY spike</strong> (exploration): VR camera feel
        {/* ANCHOR:overlay */}
      </div>
    </div>
  );
}
