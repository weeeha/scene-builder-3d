/** Returns true only on the frame a button goes from released to pressed. */
export function createButtonEdge(): (pressed: boolean) => boolean {
  let was = false;
  return (pressed) => {
    const rising = pressed && !was;
    was = pressed;
    return rising;
  };
}

/** Turns an analog axis into single flicks: fires -1 or +1 once past the threshold, re-arms near center. */
export function createStickFlick(threshold = 0.7, rearm = 0.3): (value: number) => -1 | 0 | 1 {
  let armed = true;
  return (value) => {
    if (armed && Math.abs(value) >= threshold) {
      armed = false;
      return value > 0 ? 1 : -1;
    }
    if (!armed && Math.abs(value) <= rearm) armed = true;
    return 0;
  };
}
