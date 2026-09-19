import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { FORMAT_21_9, FULL_FRAME, vFovDeg } from "../camera/fov";
import { readFpsMeter } from "../camera/fps-meter";
import { HANDHELD_IMPLEMENTED } from "../camera/handheld";
import { LENSES_MM, SMOOTHING_LEVELS, VF_RESOLUTIONS } from "../constants";
import { runtime } from "../runtime";
import { useSpikeStore } from "../store";
import { createTextCanvas, type TextCanvas } from "../ui/text-canvas";

const PANEL_PX_W = 1024;
const PANEL_PX_H = 256;

// One panel texture shared by the hand panel and the flat HUD panel, created on first use (needs the DOM).
let panel: TextCanvas | null = null;
function getPanel(): TextCanvas {
  return (panel ??= createTextCanvas(PANEL_PX_W, PANEL_PX_H, 22));
}

/** The panel as a plane, anchored at its bottom edge so it can sit on top of a monitor. */
export function PanelFace({ widthM }: { widthM: number }) {
  const visible = useSpikeStore((s) => s.panelVisible);
  const heightM = widthM * (PANEL_PX_H / PANEL_PX_W);
  return (
    <mesh visible={visible} position={[0, heightM / 2, 0]}>
      <planeGeometry args={[widthM, heightM]} />
      <meshBasicMaterial map={getPanel().texture} toneMapped={false} />
    </mesh>
  );
}

/** Redraws the panel text four times a second. The numbers Nick reads out for the five questions live here. */
export function DebugPanel() {
  const session = useXR((s) => s.session);
  const sinceDraw = useRef(1);

  useFrame((_state, delta) => {
    sinceDraw.current += delta;
    if (sinceDraw.current < 0.25) return;
    sinceDraw.current = 0;

    const store = useSpikeStore.getState();
    const fps = readFpsMeter(runtime.fps);
    const lensMm = LENSES_MM[store.lensIndex];
    const [vfWidth, vfHeight] = VF_RESOLUTIONS[store.vfResIndex];
    const frameRate = (session as (XRSession & { frameRate?: number }) | undefined)?.frameRate;
    const jitter = store.jitter;

    getPanel().draw([
      `fps 1s ${fps.recentFps.toFixed(1)} | take avg ${fps.avgFps.toFixed(1)} | worst ${fps.worstMs.toFixed(1)} ms | n ${fps.frames}`,
      `target ${frameRate ? `${frameRate} Hz` : "n/a (flat page)"} | VF ${vfWidth}x${vfHeight}`,
      `lens ${lensMm} mm | vFOV ${vFovDeg(lensMm, FULL_FRAME, FORMAT_21_9).toFixed(1)} deg | smoothing ${SMOOTHING_LEVELS[store.smoothingIndex].name}`,
      `phase ${store.phase} ${runtime.phaseClock.toFixed(1)} s | grabbed ${runtime.grabbed ? "yes" : "no"} | handheld ${HANDHELD_IMPLEMENTED ? "custom" : "pass-through"}`,
      jitter
        ? `jitter ${jitter.angularRmsDeg.toFixed(3)} deg, ${jitter.positionRmsMm.toFixed(2)} mm rms @ ${jitter.lensMm} mm ${jitter.smoothingName} (n ${jitter.sampleCount})`
        : "jitter: not run yet",
      `take: ${store.saveStatus || `none saved yet (count ${store.takeCounter})`}`,
      `speech: SR ${store.probe.speechRecognition ? "yes" : "no"} | webkitSR ${store.probe.webkitSpeechRecognition ? "yes" : "no"}`,
      `mic: ${store.probe.mic}`,
    ]);
  });

  return null;
}
