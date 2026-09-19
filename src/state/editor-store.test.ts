/// <reference types="node" />
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@/state/editor-store";
import { usePlaybackStore } from "@/state/playback-store";

beforeEach(() => {
  useEditorStore.setState({
    selectedObjectId: null,
    gizmoMode: "translate",
    writeTarget: "shot",
    cameraMode: "orbit",
  });
  usePlaybackStore.setState({ time: 0, playing: false });
});

describe("useEditorStore", () => {
  it("defaults to translate, shot, orbit and nothing selected", () => {
    const state = useEditorStore.getState();
    expect(state.selectedObjectId).toBeNull();
    expect(state.gizmoMode).toBe("translate");
    expect(state.writeTarget).toBe("shot");
    expect(state.cameraMode).toBe("orbit");
  });

  it("select, setGizmoMode, setWriteTarget and setCameraMode update state", () => {
    useEditorStore.getState().select("obj-1");
    expect(useEditorStore.getState().selectedObjectId).toBe("obj-1");

    useEditorStore.getState().setGizmoMode("rotate");
    expect(useEditorStore.getState().gizmoMode).toBe("rotate");

    useEditorStore.getState().setWriteTarget("set");
    expect(useEditorStore.getState().writeTarget).toBe("set");

    useEditorStore.getState().setCameraMode("plan");
    expect(useEditorStore.getState().cameraMode).toBe("plan");
  });
});

describe("usePlaybackStore", () => {
  it("defaults to time 0 and not playing", () => {
    const state = usePlaybackStore.getState();
    expect(state.time).toBe(0);
    expect(state.playing).toBe(false);
  });

  it("setTime and setPlaying update state", () => {
    usePlaybackStore.getState().setTime(2.5);
    expect(usePlaybackStore.getState().time).toBe(2.5);
    usePlaybackStore.getState().setPlaying(true);
    expect(usePlaybackStore.getState().playing).toBe(true);
  });
});

describe("store isolation", () => {
  it("neither editor-store nor playback-store imports document-store", () => {
    const here = fileURLToPath(import.meta.url);
    const dir = here.slice(0, here.lastIndexOf("/"));
    const editorSource = readFileSync(`${dir}/editor-store.ts`, "utf-8");
    const playbackSource = readFileSync(`${dir}/playback-store.ts`, "utf-8");
    expect(editorSource).not.toMatch(/document-store/);
    expect(playbackSource).not.toMatch(/document-store/);
  });
});
