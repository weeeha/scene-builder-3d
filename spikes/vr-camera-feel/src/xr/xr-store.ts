import { createXRStore } from "@react-three/xr";

/**
 * True when the browser ships the WebXR API itself. Read BEFORE the store exists, because the library's
 * emulator defines navigator.xr once it is injected. Safari has no WebXR, so this stays false there.
 */
export const NATIVE_WEBXR = typeof navigator !== "undefined" && "xr" in navigator;

// Desktop Chrome ships navigator.xr with no headset behind it. The library would emulate a Quest 3 there, but its
// emulator (IWER 2.4) refuses to install while a native navigator.xr exists. So on localhost we ask the native API
// first, and only when it cannot do immersive VR do we shadow it with `undefined`, which lets the emulator in.
// A real headset reached through `adb reverse` also says "localhost": it answers true and keeps its native runtime.
if (NATIVE_WEBXR && window.location.hostname === "localhost") {
  const nativeVr = await navigator.xr!.isSessionSupported("immersive-vr").catch(() => false);
  if (!nativeVr) Object.defineProperty(navigator, "xr", { value: undefined, configurable: true });
}

export const xrStore = createXRStore({
  // Desktop Chrome has the API and no headset: there the library injects a Quest 3 emulator (localhost only).
  // Browsers without the API get no emulator, so the page stays a plain flat page.
  // The emulator's synthetic room only matters for AR, so it stays off. (The emulator packages also need the
  // single-three override in pnpm-workspace.yaml: with a second copy of three they black out the session.)
  emulate: NATIVE_WEBXR ? { type: "metaQuest3", syntheticEnvironment: false } : false,
  // By default the library also offers the browser a session for its own button, and it picks AR when the device
  // can do passthrough (a Quest 3 can). This spike's controls only run in VR, and the page has its own Enter VR button.
  offerSession: false,
  hand: false, // controllers only
  controller: {
    // The library binds its teleport arc to the trigger ("select", fires on release). Teleport therefore lives
    // on the LEFT trigger, and the right controller has every default pointer off: its trigger is record.
    left: { teleportPointer: true, rayPointer: false, grabPointer: false },
    right: { teleportPointer: false, rayPointer: false, grabPointer: false },
  },
});
