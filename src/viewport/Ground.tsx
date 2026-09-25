import { Grid } from "@react-three/drei";

/** A 40 m grid on the floor plane. Named helper:ground so an offscreen
 * render can hide it. Raycast is disabled so a click here falls through
 * to the canvas's onPointerMissed handler, which clears selection,
 * rather than the grid itself catching the click. */
export function Ground() {
  return (
    <Grid
      name="helper:ground"
      args={[40, 40]}
      cellSize={1}
      sectionSize={5}
      cellColor="#3a4048"
      sectionColor="#5b6472"
      fadeDistance={60}
      raycast={() => undefined}
    />
  );
}
