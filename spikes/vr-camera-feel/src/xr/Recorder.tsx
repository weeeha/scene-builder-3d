import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { pushFrame, readFpsMeter, resetFpsMeter } from "../camera/fps-meter";
import { measureJitter } from "../camera/jitter";
import { makeTake, pushSample, sampleCount, serializeTake, type Take } from "../camera/take";
import { JITTER_TEST_SEC, LENSES_MM, SMOOTHING_LEVELS } from "../constants";
import { runtime } from "../runtime";
import { useSpikeStore } from "../store";

async function saveTake(take: Take): Promise<void> {
  const { setSaveStatus } = useSpikeStore.getState();
  setSaveStatus(`saving take ${take.number}...`); // so a stuck save never reads as the previous take's success
  try {
    const response = await fetch("/takes", { method: "POST", body: serializeTake(take), signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setSaveStatus(`saved take ${take.number} (${take.durationSec.toFixed(1)} s)`);
  } catch (error) {
    // No dev server behind the page (static deploy), or the LAN dropped. The flat page offers a download instead.
    setSaveStatus(`save failed: ${(error as Error).message}`);
  }
}

/** "Cut": closes the take, stores it, and posts it to the dev server. Safe to call when nothing is recording. */
export function stopRecording(): void {
  const store = useSpikeStore.getState();
  if (store.phase !== "recording") return;
  // Freeze the take's frame-rate numbers first. Everything below (building, serializing and posting the take) is
  // bookkeeping, and it must not leak into the measurement the panel shows for question 1.
  const fps = readFpsMeter(runtime.fps);
  runtime.takeFps = { avgFps: fps.avgFps, worstMs: fps.worstMs, frames: fps.frames };
  if (sampleCount(runtime.samples) < 2) {
    runtime.samples = [];
    store.toIdle();
    store.setSaveStatus("nothing recorded");
    return;
  }
  const number = store.takeCounter + 1;
  const take = makeTake({
    id: `take-${number}-${Date.now()}`,
    number,
    createdAt: Date.now(),
    lensMm: LENSES_MM[store.lensIndex],
    smoothing: SMOOTHING_LEVELS[store.smoothingIndex].value,
    samples: runtime.samples,
  });
  runtime.samples = [];
  store.finishRecording(take);
  setTimeout(() => void saveTake(take), 0); // serializing thousands of numbers stays off the XR frame's call stack
}

/** "Action" and "cut" on one control: the right trigger in VR, the R key on the flat page. */
export function toggleRecording(): void {
  const store = useSpikeStore.getState();
  if (store.phase === "recording") {
    stopRecording();
    return;
  }
  if (!store.startRecording()) return;
  runtime.samples = [];
  runtime.phaseClock = 0;
  resetFpsMeter(runtime.fps); // question 1 reads fps over exactly one take
  runtime.takeFps = null;
  pushSample(runtime.samples, 0, runtime.cameraPose);
}

export function startReplay(): void {
  if (useSpikeStore.getState().startReplay()) runtime.phaseClock = 0;
}

export function startJitterTest(): void {
  if (!useSpikeStore.getState().startJitter()) return;
  runtime.samples = [];
  runtime.phaseClock = 0;
}

/** Advances the phase clock, samples the camera while recording or testing, and ends replays. */
export function Recorder() {
  const session = useXR((s) => s.session);
  const hadSession = useRef(false);

  useEffect(() => {
    if (session) {
      hadSession.current = true;
      return;
    }
    if (hadSession.current) {
      hadSession.current = false;
      stopRecording(); // the session ended mid-take (headset off, battery, browser menu): that is a cut
    }
  }, [session]);

  useFrame((_state, delta) => {
    pushFrame(runtime.fps, delta);
    const store = useSpikeStore.getState();
    if (store.phase === "idle") return;
    runtime.phaseClock += delta;

    if (store.phase === "recording") {
      pushSample(runtime.samples, runtime.phaseClock, runtime.cameraPose);
    } else if (store.phase === "jitter") {
      pushSample(runtime.samples, runtime.phaseClock, runtime.cameraPose);
      if (runtime.phaseClock >= JITTER_TEST_SEC) {
        const result = measureJitter(runtime.samples);
        runtime.samples = [];
        store.finishJitter({
          ...result,
          lensMm: LENSES_MM[store.lensIndex],
          smoothingName: SMOOTHING_LEVELS[store.smoothingIndex].name,
        });
      }
    } else if (store.phase === "replaying" && store.lastTake && runtime.phaseClock >= store.lastTake.durationSec) {
      store.toIdle();
    }
  }, -2);

  return null;
}
