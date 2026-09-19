import { useMemo } from "react";
import { buildStageScene } from "@/stage/render/build-scene";
import { resolveObjects } from "@/stage/resolve";
import { SPIKE_STAGE } from "../spike-scene";

/** Mounts the set built by Film Planner's real scene builder: the code that renders the export renders here. */
export function StageMount() {
  const stage = useMemo(() => {
    const built = buildStageScene(resolveObjects(SPIKE_STAGE, { v: 1, objects: {} }));
    built.background = null; // a nested Scene's background is ignored anyway. App sets the real one.
    return built;
  }, []);
  return <primitive object={stage} />;
}
