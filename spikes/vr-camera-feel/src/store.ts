import { create } from "zustand";
import type { JitterResult } from "./camera/jitter";
import type { Take } from "./camera/take";
import { LENSES_MM, SMOOTHING_LEVELS, VF_RESOLUTIONS } from "./constants";

export type Phase = "idle" | "recording" | "replaying" | "jitter";
export type JitterReport = JitterResult & { lensMm: number; smoothingName: string };
export type ProbeState = { speechRecognition: boolean; webkitSpeechRecognition: boolean; mic: string };

type SpikeData = {
  lensIndex: number;
  smoothingIndex: number;
  vfResIndex: number;
  phase: Phase;
  lastTake: Take | null;
  takeCounter: number;
  saveStatus: string;
  jitter: JitterReport | null;
  panelVisible: boolean;
  probe: ProbeState;
};

type SpikeActions = {
  stepLens(dir: -1 | 1): void;
  cycleSmoothing(): void;
  stepVfRes(dir: -1 | 1): void;
  togglePanel(): void;
  startRecording(): boolean;
  finishRecording(take: Take): void;
  startReplay(): boolean;
  startJitter(): boolean;
  finishJitter(report: JitterReport): void;
  toIdle(): void;
  setSaveStatus(saveStatus: string): void;
  setProbe(probe: Partial<ProbeState>): void;
};

export type SpikeState = SpikeData & SpikeActions;

export const INITIAL_STATE: SpikeData = {
  lensIndex: 2,
  smoothingIndex: 0,
  vfResIndex: 1,
  phase: "idle",
  lastTake: null,
  takeCounter: 0,
  saveStatus: "",
  jitter: null,
  panelVisible: true,
  probe: { speechRecognition: false, webkitSpeechRecognition: false, mic: "untested" },
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const useSpikeStore = create<SpikeState>()((set, get) => ({
  ...INITIAL_STATE,

  // Lens and smoothing are part of a take's record, so they only change between takes.
  stepLens: (dir) => {
    if (get().phase !== "idle") return;
    set((s) => ({ lensIndex: clamp(s.lensIndex + dir, 0, LENSES_MM.length - 1) }));
  },
  cycleSmoothing: () => {
    if (get().phase !== "idle") return;
    set((s) => ({ smoothingIndex: (s.smoothingIndex + 1) % SMOOTHING_LEVELS.length }));
  },
  // Changing the size recreates the render target, which can hitch. So it is locked while anything is being measured.
  stepVfRes: (dir) => {
    if (get().phase !== "idle") return;
    set((s) => ({ vfResIndex: clamp(s.vfResIndex + dir, 0, VF_RESOLUTIONS.length - 1) }));
  },
  togglePanel: () => set((s) => ({ panelVisible: !s.panelVisible })),

  startRecording: () => {
    if (get().phase !== "idle") return false;
    set({ phase: "recording", saveStatus: "" });
    return true;
  },
  finishRecording: (take) => {
    if (get().phase !== "recording") return;
    set((s) => ({ phase: "idle", lastTake: take, takeCounter: s.takeCounter + 1 }));
  },
  startReplay: () => {
    const s = get();
    if (s.phase !== "idle" || s.lastTake === null) return false;
    set({ phase: "replaying" });
    return true;
  },
  startJitter: () => {
    if (get().phase !== "idle") return false;
    set({ phase: "jitter" });
    return true;
  },
  finishJitter: (report) => {
    if (get().phase !== "jitter") return;
    set({ phase: "idle", jitter: report });
  },
  toIdle: () => set({ phase: "idle" }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setProbe: (probe) => set((s) => ({ probe: { ...s.probe, ...probe } })),
}));
