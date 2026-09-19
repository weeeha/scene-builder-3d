import { beforeEach, describe, expect, it } from "vitest";
import { yawQuat } from "./camera/pose";
import { makeTake, pushSample } from "./camera/take";
import { LENSES_MM } from "./constants";
import { INITIAL_STATE, useSpikeStore } from "./store";

function aTake() {
  const samples: number[] = [];
  pushSample(samples, 0, { position: [0, 1, 0], rotation: yawQuat(0) });
  pushSample(samples, 2, { position: [1, 1, 0], rotation: yawQuat(10) });
  return makeTake({ id: "take-1-1", number: 1, createdAt: 1, lensMm: 35, smoothing: 0, samples });
}

const store = () => useSpikeStore.getState();

beforeEach(() => {
  useSpikeStore.setState(INITIAL_STATE); // merges, so the actions stay in place
});

describe("lens, smoothing and viewfinder resolution", () => {
  it("starts on 35 mm, smoothing off, 960x412", () => {
    expect(LENSES_MM[store().lensIndex]).toBe(35);
    expect(store().smoothingIndex).toBe(0);
    expect(store().vfResIndex).toBe(1);
  });

  it("clamps the lens at both ends", () => {
    for (let i = 0; i < 10; i++) store().stepLens(1);
    expect(LENSES_MM[store().lensIndex]).toBe(135);
    for (let i = 0; i < 10; i++) store().stepLens(-1);
    expect(LENSES_MM[store().lensIndex]).toBe(18);
  });

  it("ignores lens and smoothing changes outside the idle phase", () => {
    store().startRecording();
    store().stepLens(1);
    store().cycleSmoothing();
    expect(store().lensIndex).toBe(2);
    expect(store().smoothingIndex).toBe(0);
  });

  it("wraps smoothing and clamps the viewfinder resolution", () => {
    for (let i = 0; i < 4; i++) store().cycleSmoothing();
    expect(store().smoothingIndex).toBe(0);
    store().stepVfRes(1);
    store().stepVfRes(1);
    expect(store().vfResIndex).toBe(2);
    for (let i = 0; i < 5; i++) store().stepVfRes(-1);
    expect(store().vfResIndex).toBe(0);
  });
});

describe("phase machine", () => {
  it("records only from idle and finishes back to idle with the take stored", () => {
    expect(store().startRecording()).toBe(true);
    expect(store().phase).toBe("recording");
    expect(store().startRecording()).toBe(false);
    expect(store().startReplay()).toBe(false);
    expect(store().startJitter()).toBe(false);
    store().finishRecording(aTake());
    expect(store().phase).toBe("idle");
    expect(store().lastTake?.id).toBe("take-1-1");
    expect(store().takeCounter).toBe(1);
  });

  it("ignores finishRecording when nothing is being recorded", () => {
    store().finishRecording(aTake());
    expect(store().lastTake).toBeNull();
    expect(store().takeCounter).toBe(0);
  });

  it("replays only when a take exists", () => {
    expect(store().startReplay()).toBe(false);
    store().startRecording();
    store().finishRecording(aTake());
    expect(store().startReplay()).toBe(true);
    expect(store().phase).toBe("replaying");
    store().toIdle();
    expect(store().phase).toBe("idle");
  });

  it("runs the jitter test from idle and stores its report", () => {
    expect(store().startJitter()).toBe(true);
    expect(store().phase).toBe("jitter");
    store().finishJitter({ angularRmsDeg: 0.2, positionRmsMm: 1.5, sampleCount: 720, lensMm: 85, smoothingName: "medium" });
    expect(store().phase).toBe("idle");
    expect(store().jitter?.lensMm).toBe(85);
  });
});

describe("status fields", () => {
  it("toggles the panel, sets the save status and merges probe results", () => {
    store().togglePanel();
    expect(store().panelVisible).toBe(false);
    store().setSaveStatus("saved take 1");
    expect(store().saveStatus).toBe("saved take 1");
    store().setProbe({ mic: "granted (flat)" });
    expect(store().probe).toEqual({ speechRecognition: false, webkitSpeechRecognition: false, mic: "granted (flat)" });
  });
});
