import { create } from "zustand";

export type WriteTarget = "set" | "shot";
export type CameraMode = "shot" | "orbit" | "plan";
export type GizmoMode = "translate" | "rotate" | "scale";

export type EditorState = {
  selectedObjectId: string | null;
  gizmoMode: GizmoMode;
  writeTarget: WriteTarget;
  cameraMode: CameraMode;
  select(id: string | null): void;
  setGizmoMode(m: GizmoMode): void;
  setWriteTarget(t: WriteTarget): void;
  setCameraMode(m: CameraMode): void;
};

export const useEditorStore = create<EditorState>()((set) => ({
  selectedObjectId: null,
  gizmoMode: "translate",
  writeTarget: "shot",
  cameraMode: "orbit",
  select(id) {
    set({ selectedObjectId: id });
  },
  setGizmoMode(m) {
    set({ gizmoMode: m });
  },
  setWriteTarget(t) {
    set({ writeTarget: t });
  },
  setCameraMode(m) {
    set({ cameraMode: m });
  },
}));
