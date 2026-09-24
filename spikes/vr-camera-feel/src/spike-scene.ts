import type { Stage } from "@/stage/types";

/** A greybox set around SET_CENTER ([0, 0, -3]): one actor and a few shapes to frame against. */
export const SPIKE_STAGE: Stage = {
  v: 1,
  objects: [
    { id: "rug", name: "Rug", kind: "primitive", shape: "plane", color: "#3b4252", transform: { position: [0, 0, -3], rotationY: 0, scale: 1 } },
    { id: "actor", name: "Actor", kind: "doll", color: "#d08770", pose: "stand", transform: { position: [0, 0, -3], rotationY: 0, scale: 1 } },
    { id: "table", name: "Table", kind: "primitive", shape: "box", color: "#8f9bb3", transform: { position: [1.3, 0, -3.4], rotationY: 0.3, scale: 0.8 } },
    { id: "wall", name: "Wall block", kind: "primitive", shape: "box", color: "#4c566a", transform: { position: [-2.4, 0, -5.2], rotationY: 0, scale: 2.5 } },
    { id: "column", name: "Column", kind: "primitive", shape: "cylinder", color: "#5e81ac", transform: { position: [2.6, 0, -5.6], rotationY: 0, scale: 2.2 } },
    { id: "ball", name: "Ball", kind: "primitive", shape: "sphere", color: "#a3be8c", transform: { position: [0.9, 0, -1.4], rotationY: 0, scale: 0.6 } },
  ],
};
