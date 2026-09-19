import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

/** matchMedia is an external store, so read it with useSyncExternalStore rather
 *  than mirroring it into state from an effect. The effect version rendered once
 *  with `undefined` (reported as `false`) before correcting itself, which reads
 *  as a layout flash on first paint — and is what `set-state-in-effect` objects to.
 *
 *  Note this now tracks the media query itself; the old code compared
 *  `window.innerWidth`, which could disagree with the query at the boundary. */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false // SSR snapshot — matches the previous `!!undefined`
  )
}
