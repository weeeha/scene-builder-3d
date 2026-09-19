# VR Camera Feel Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a throwaway WebXR page that lets Nick hold a virtual film camera in a Quest, so five questions about feel and feasibility get answered before any VR spec is written.

**Architecture:** Pure, unit-tested camera logic (FOV, take format, smoothing, jitter, fps) sits in `src/camera/`, with a thin React Three Fiber and `@react-three/xr` shell around it. The set is built by Film Planner's real `build-scene.ts`, copied as-is. A take stores timed camera poses as JSON. A Vite dev-server hook saves takes to disk, and a flat replay page plays them back through the same camera math.

**Tech Stack:** Vite 8, React 19.2, TypeScript 5.9, three 0.186, @react-three/fiber 9.7, @react-three/xr 6.6, Zustand 5, Vitest 5, pnpm 11, Node 26.

**Spec:** `docs/superpowers/specs/2026-09-18-vr-operator-design.md` (section 4; types from 5.1 to 5.3)

## Global Constraints

- Throwaway code. Branch `spike/vr-camera-feel`, created from `claude/vr-scene-preview-camera-eb380b` so the spec and this plan travel with it. Folder `spikes/vr-camera-feel/`. Never merged to `main`. No PR. Pushing the branch needs Nick's OK first.
- Commits use the repo's configured identity (`1083934+weeeha@users.noreply.github.com`). Every commit message ends with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Never push to `main`.
- Stage code is copied as-is from Film Planner at commit `58987e2`. The copied files under `src/stage/` are never edited.
- The spike's camera uses `src/camera/fov.ts`. It never calls `lensToVFovDeg`.
- One body: full frame 36 x 24 mm, id `full-frame`. One format: 21:9, id `21:9`.
- Lenses: 18, 24, 35, 50, 85, 135 mm. Default 35.
- Viewfinder resolutions: 640x274, 960x412, 1280x548. Default 960x412.
- Smoothing levels: off 0, light 0.33, medium 0.66, heavy 0.9. Default off.
- Monitor widths: 0.16 m on the camera body, 0.30 m in the left hand. Grab distance 0.25 m. Jitter test 10 s.
- The set is centred at `[0, 0, -3]`. The operator starts at the world origin facing -Z, three metres from the doll.
- Exact pinned versions, no carets: react 19.2.8, react-dom 19.2.8, three 0.186.0, @react-three/fiber 9.7.0, @react-three/xr 6.6.30, zustand 5.0.15, vite 8.3.0, vitest 5.0.1, @vitejs/plugin-react 6.1.1, @vitejs/plugin-basic-ssl 2.3.0, typescript 5.9.3, @types/three 0.186.0, @types/react 19.2.18, @types/react-dom 19.2.7, @types/node 24.13.5.
- One copy of three.js: `pnpm-workspace.yaml` overrides `three` to 0.186.0 for every package. The emulator packages (`@iwer/devui`, `@iwer/sem`) ask for ^0.165, and a second copy blacks out the emulated session.
- React stays on 19.2.x on purpose: `@react-three/fiber` 9.7.0 declares the peer range `react >=19 <19.3`. Do not upgrade it.
- Files on the Vite config's import graph (`vite.config.ts`, `takes-plugin.ts`, `src/camera/take.ts`, `src/camera/pose.ts`) write their relative imports WITH the `.ts` extension, and `tsconfig.json` sets `allowImportingTsExtensions`. Vite 8 warns on every run otherwise, because its future native config loader cannot resolve extensionless imports. Every other file imports without extensions.
- Inside `src/camera/`, `src/input/` and `src/flat/` use relative imports only. `takes-plugin.ts` is loaded by the Vite config, where the `@/` alias does not exist, and it imports from `src/camera/`. The `@/` alias (to `src/`) exists for the copied stage files, which use it.
- Every `useFrame` priority is zero or negative: input -4, camera -3, recorder -2, viewfinder -1, everything else 0. A positive priority switches off R3F's automatic rendering.
- No `new` of three.js objects inside a `useFrame` callback. Use module-level scratch objects. Garbage collection pauses would corrupt the frame-rate measurement.
- `src/camera/handheld.ts` has a body that Nick writes. No executor writes or changes that body without his say-so (Task 6).
- Done for a UI task means: the flat page checked in Chrome and in Safari, XR behaviour checked in desktop Chrome through the WebXR emulator. Headset checks are Nick's.
- All commands run from `spikes/vr-camera-feel/` unless a step says otherwise. Paths in **Files** blocks are relative to the repo root.

---

## File Structure

All under `spikes/vr-camera-feel/`.

| File | Responsibility |
| --- | --- |
| `README.md` | THROWAWAY label, run instructions, dev loops, controls, headset checklist |
| `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore` | Tooling |
| `takes-plugin.ts` (+ `takes-plugin.test.ts`) | Vite dev plugin: `POST /takes`, `GET /takes`, `GET /takes/<id>.json` |
| `takes/.gitkeep` | Recorded takes land here. `takes/*.json` is gitignored |
| `src/stage/**` | Copied from Film Planner, untouched: `types`, `lens`, `poses`, `resolve`, `render/build-scene`, `render/clip-constants`, three test files |
| `src/constants.ts` | Lenses, smoothing levels, viewfinder resolutions, sizes, set centre, overview camera |
| `src/camera/pose.ts` (+ test) | `Quat`, `CameraPose`, `lerpVec3`, `slerpQuat`, `forwardOf`, `angleBetweenDeg`, `yawQuat` |
| `src/camera/fov.ts` (+ test) | `CameraBody`, `FrameFormat`, `FULL_FRAME`, `FORMAT_21_9`, `usedSensorHeightMm`, `vFovDeg` |
| `src/camera/take.ts` (+ test) | `Take`, `pushSample`, `poseAt`, `makeTake`, `serializeTake`, `parseTake` |
| `src/camera/jitter.ts` (+ test) | `measureJitter` |
| `src/camera/fps-meter.ts` (+ test) | `createFpsMeter`, `pushFrame`, `resetFpsMeter`, `readFpsMeter` |
| `src/camera/handheld.ts` (+ test) | `handheld(hand, previous, dtSec, smoothing)`. Body written by Nick |
| `src/input/edges.ts` (+ test) | `createButtonEdge`, `createStickFlick` |
| `src/flat/scripted-path.ts` (+ test) | `scriptedHandPose(tSec)`: the camera's path when there is no headset |
| `src/store.ts` (+ test) | Zustand store: discrete UI state and the phase machine |
| `src/runtime.ts` | Mutable per-frame singletons shared by the frame loop |
| `src/spike-scene.ts` | `SPIKE_STAGE`: the hardcoded set |
| `src/ui/text-canvas.ts` | `createTextCanvas`: lines of text drawn into a `CanvasTexture` |
| `src/xr/xr-store.ts` | The single `createXRStore` instance |
| `src/xr/scene-refs.ts` | Shared handles: lens camera, objects hidden from the lens, monitor materials |
| `src/xr/StageMount.tsx` | Builds the set with `buildStageScene` and mounts it |
| `src/xr/VirtualCamera.tsx` | Camera body, lens camera, grab logic, applies `handheld()` |
| `src/xr/Viewfinder.tsx` | Render-target pass, `BodyMonitor`, `HandMonitor`, `HudMonitor`, frame lines, readout |
| `src/xr/Recorder.tsx` | Record, replay and jitter phases, saving takes, session end means cut |
| `src/xr/DebugPanel.tsx` | Panel text: fps, lens, phase, jitter, save status, probe |
| `src/xr/Locomotion.tsx` | `XROrigin`, teleport floor, snap turn |
| `src/xr/ControllerInput.tsx` | Quest controller input mapped to actions, grip world poses |
| `src/xr/probe.ts` (+ test) | Speech API detection and the mic probe |
| `src/replay/ReplayPage.tsx` | Lists takes, loads a file, plays a take through the lens at 21:9 |
| `src/App.tsx`, `src/main.tsx` | Composition, keyboard controls, Enter VR button, hash route |

---

### Task 1: Scaffold the spike and copy the stage layer

**Files:**
- Create: `spikes/vr-camera-feel/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `README.md`, `takes/.gitkeep`
- Create (copied): `spikes/vr-camera-feel/src/stage/{types,lens,poses,resolve}.ts`, `src/stage/{lens,poses,resolve}.test.ts`, `src/stage/render/{build-scene,clip-constants}.ts`

**Interfaces:**
- Consumes: Film Planner source at `/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/stage/` (commit `58987e2`).
- Produces: a working toolchain (`pnpm test`, `pnpm typecheck`), the `@/` alias to `src/`, and the copied exports `Stage`, `StageObject`, `Vec3` (`@/stage/types`), `resolveObjects` (`@/stage/resolve`), `buildStageScene(objects: StageObject[]): Scene` (`@/stage/render/build-scene`), `STAGE_BACKGROUND` (`@/stage/render/clip-constants`).

- [ ] **Step 1: Create the branch and the folder** (run from the repo root)

```bash
git switch -c spike/vr-camera-feel
mkdir -p spikes/vr-camera-feel/src/stage/render spikes/vr-camera-feel/takes
touch spikes/vr-camera-feel/takes/.gitkeep
```

- [ ] **Step 2: Write `spikes/vr-camera-feel/package.json`**

```json
{
  "name": "vr-camera-feel-spike",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "dev:http": "SPIKE_HTTP=1 vite",
    "build": "vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@react-three/fiber": "9.7.0",
    "@react-three/xr": "6.6.30",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "three": "0.186.0",
    "zustand": "5.0.15"
  },
  "devDependencies": {
    "@types/node": "24.13.5",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.7",
    "@types/three": "0.186.0",
    "@vitejs/plugin-basic-ssl": "2.3.0",
    "@vitejs/plugin-react": "6.1.1",
    "typescript": "5.9.3",
    "vite": "8.3.0",
    "vitest": "5.0.1"
  }
}
```

- [ ] **Step 3: Write `spikes/vr-camera-feel/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "types": ["node", "vite/client"],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "takes-plugin.ts", "takes-plugin.test.ts", "vite.config.ts"]
}
```

- [ ] **Step 4: Write `spikes/vr-camera-feel/vite.config.ts`** (the takes plugin joins in Task 8)

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { fileURLToPath } from "node:url";
import { takesPlugin } from "./takes-plugin.ts";

// HTTPS is the default because WebXR needs a secure context on the LAN.
// SPIKE_HTTP=1 serves plain http for localhost and for `adb reverse`.
const useHttps = process.env.SPIKE_HTTP !== "1";

export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : []), takesPlugin()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { host: true, port: 5173, strictPort: true },
  test: { environment: "node", include: ["src/**/*.test.ts", "takes-plugin.test.ts"] },
});
```

- [ ] **Step 5: Write `spikes/vr-camera-feel/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>THROWAWAY: VR camera feel spike (exploration)</title>
    <style>
      html, body, #root { margin: 0; height: 100%; background: #15171c; color: #e6e8ec; font-family: system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Write `spikes/vr-camera-feel/.gitignore`**

```
node_modules
dist
takes/*.json
```

- [ ] **Step 6b: Write `spikes/vr-camera-feel/pnpm-workspace.yaml`**

```yaml
# The emulator packages (@iwer/devui, @iwer/sem) ask for three ^0.165. Two copies of three in one page break the
# emulator's renderer ("material.onBuild is not a function"), so everything is pinned to the app's version.
overrides:
  three: 0.186.0
```

- [ ] **Step 7: Copy the stage layer from Film Planner, untouched**

```bash
SRC="/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/stage"
cp "$SRC/types.ts" "$SRC/lens.ts" "$SRC/lens.test.ts" "$SRC/poses.ts" "$SRC/poses.test.ts" "$SRC/resolve.ts" "$SRC/resolve.test.ts" src/stage/
cp "$SRC/render/build-scene.ts" "$SRC/render/clip-constants.ts" src/stage/render/
git -C "/Users/nickv/ClaudeCode Projects/Film Writer and Planner" rev-parse --short HEAD
```

Expected: the last command prints `58987e2`. If it prints something else, stop and tell Nick: the source moved, and the README must record the commit actually copied.

- [ ] **Step 8: Write `spikes/vr-camera-feel/README.md`** (first version, completed in Task 15)

```markdown
# THROWAWAY: VR camera feel spike

> **Status:** exploration. Throwaway code. This branch is never merged.
> Spec: `docs/superpowers/specs/2026-09-18-vr-operator-design.md`, section 4.

A WebXR page that answers five questions about holding a virtual film camera in a Quest:
frame rate, steadiness, viewfinder legibility, takes stored as poses, and the dev loop.

## Provenance

`src/stage/` is copied as-is from `weeeha/Film-Planner-` at commit `58987e2`
(`film-planner/src/stage/`). Do not edit those files here.

## Run

    pnpm install
    pnpm test
    pnpm dev:http     # http://localhost:5173 on this Mac
    pnpm dev          # https on the LAN, for the headset
```

- [ ] **Step 9: Install and verify the toolchain**

Run: `pnpm install`
Expected: finishes without a peer-dependency error for `react`. A warning about ignored build scripts is fine.

Run: `pnpm test`
Expected: 3 test files pass (`lens.test.ts`, `poses.test.ts`, `resolve.test.ts`), 0 failures.

Run: `pnpm typecheck`
Expected: exits 0 with no output.

- [ ] **Step 10: Commit** (run from the repo root)

```bash
git add spikes/vr-camera-feel
git commit -F - <<'MSG'
spike: scaffold VR camera feel spike, copy stage layer from Film Planner

Throwaway branch. Stage files copied as-is from Film-Planner- at 58987e2.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```


### Task 2: Pose math and field of view

**Files:**
- Create: `spikes/vr-camera-feel/src/camera/pose.ts`, `src/camera/fov.ts`
- Test: `spikes/vr-camera-feel/src/camera/pose.test.ts`, `src/camera/fov.test.ts`

**Interfaces:**
- Consumes: `Vec3` from `../stage/types` (Task 1).
- Produces:
  - `type Quat = [number, number, number, number]` (x, y, z, w), `type CameraPose = { position: Vec3; rotation: Quat }`, `IDENTITY_POSE`
  - `lerpVec3(a: Vec3, b: Vec3, t: number): Vec3`, `slerpQuat(a: Quat, b: Quat, t: number): Quat`, `forwardOf(rotation: Quat): Vec3`, `angleBetweenDeg(a: Quat, b: Quat): number`, `yawQuat(deg: number): Quat`
  - `type CameraBody`, `type FrameFormat`, `FULL_FRAME`, `FORMAT_21_9`, `usedSensorHeightMm(body, format): number`, `vFovDeg(lensMm: number, body: CameraBody, format: FrameFormat): number`

- [ ] **Step 1: Write the failing test `src/camera/pose.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { angleBetweenDeg, forwardOf, lerpVec3, slerpQuat, yawQuat, type Quat } from "./pose";

function expectQuatClose(actual: Quat, expected: Quat): void {
  for (let i = 0; i < 4; i++) expect(actual[i]).toBeCloseTo(expected[i], 6);
}

describe("lerpVec3", () => {
  it("returns the ends at t = 0 and t = 1 and the midpoint at t = 0.5", () => {
    expect(lerpVec3([0, 0, 0], [2, 4, -6], 0)).toEqual([0, 0, 0]);
    expect(lerpVec3([0, 0, 0], [2, 4, -6], 1)).toEqual([2, 4, -6]);
    expect(lerpVec3([0, 0, 0], [2, 4, -6], 0.5)).toEqual([1, 2, -3]);
  });
});

describe("slerpQuat", () => {
  it("returns the ends at t = 0 and t = 1", () => {
    expectQuatClose(slerpQuat(yawQuat(0), yawQuat(90), 0), yawQuat(0));
    expectQuatClose(slerpQuat(yawQuat(0), yawQuat(90), 1), yawQuat(90));
  });

  it("is yaw 45 halfway between yaw 0 and yaw 90", () => {
    expectQuatClose(slerpQuat(yawQuat(0), yawQuat(90), 0.5), yawQuat(45));
  });

  it("returns a unit quaternion", () => {
    const q = slerpQuat(yawQuat(10), yawQuat(170), 0.37);
    expect(Math.hypot(q[0], q[1], q[2], q[3])).toBeCloseTo(1, 9);
  });
});

describe("forwardOf", () => {
  it("looks down -Z for the identity rotation", () => {
    const f = forwardOf([0, 0, 0, 1]);
    expect(f[0]).toBeCloseTo(0, 6);
    expect(f[1]).toBeCloseTo(0, 6);
    expect(f[2]).toBeCloseTo(-1, 6);
  });

  it("looks down -X after a 90 degree yaw", () => {
    const f = forwardOf(yawQuat(90));
    expect(f[0]).toBeCloseTo(-1, 6);
    expect(f[1]).toBeCloseTo(0, 6);
    expect(f[2]).toBeCloseTo(0, 6);
  });
});

describe("angleBetweenDeg", () => {
  it("measures the angle between two look directions", () => {
    expect(angleBetweenDeg(yawQuat(0), yawQuat(10))).toBeCloseTo(10, 6);
    expect(angleBetweenDeg(yawQuat(25), yawQuat(25))).toBeCloseTo(0, 4);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm vitest run src/camera/pose.test.ts`
Expected: FAIL, cannot resolve `./pose`.

- [ ] **Step 3: Write `src/camera/pose.ts`**

```ts
import { Quaternion, Vector3 } from "three";
import type { Vec3 } from "../stage/types.ts";

export type Quat = [number, number, number, number]; // x, y, z, w
export type CameraPose = { position: Vec3; rotation: Quat };

export const IDENTITY_POSE: CameraPose = { position: [0, 0, 0], rotation: [0, 0, 0, 1] };

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const qa = new Quaternion();
const qb = new Quaternion();
const fwd = new Vector3();

/** Spherical interpolation between two unit quaternions. The result is normalized. */
export function slerpQuat(a: Quat, b: Quat, t: number): Quat {
  qa.set(a[0], a[1], a[2], a[3]);
  qb.set(b[0], b[1], b[2], b[3]);
  qa.slerp(qb, t).normalize();
  return [qa.x, qa.y, qa.z, qa.w];
}

/** Direction a camera with this rotation looks along. three.js cameras look down -Z. */
export function forwardOf(rotation: Quat): Vec3 {
  qa.set(rotation[0], rotation[1], rotation[2], rotation[3]);
  fwd.set(0, 0, -1).applyQuaternion(qa);
  return [fwd.x, fwd.y, fwd.z];
}

/** Angle in degrees between two unit quaternions' forward directions. */
export function angleBetweenDeg(a: Quat, b: Quat): number {
  const fa = forwardOf(a);
  const fb = forwardOf(b);
  const dot = Math.min(1, Math.max(-1, fa[0] * fb[0] + fa[1] * fb[1] + fa[2] * fb[2]));
  return (Math.acos(dot) * 180) / Math.PI;
}

/** Unit quaternion for a rotation of `deg` degrees about the world Y axis (yaw). */
export function yawQuat(deg: number): Quat {
  const half = (deg * Math.PI) / 360;
  return [0, Math.sin(half), 0, Math.cos(half)];
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `pnpm vitest run src/camera/pose.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the failing test `src/camera/fov.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { FORMAT_21_9, FULL_FRAME, usedSensorHeightMm, vFovDeg, type FrameFormat } from "./fov";

describe("usedSensorHeightMm", () => {
  it("crops the sensor height when the format is wider than the sensor", () => {
    expect(usedSensorHeightMm(FULL_FRAME, FORMAT_21_9)).toBeCloseTo(15.4286, 3);
  });

  it("uses the full sensor height when the format is narrower than the sensor", () => {
    const fourByThree: FrameFormat = { id: "4:3", name: "4:3", aspect: 4 / 3 };
    expect(usedSensorHeightMm(FULL_FRAME, fourByThree)).toBe(24);
  });
});

describe("vFovDeg on full frame at 21:9", () => {
  const fixtures: [number, number][] = [
    [18, 46.4],
    [24, 35.64],
    [35, 24.86],
    [50, 17.54],
    [85, 10.37],
    [135, 6.54],
  ];

  it.each(fixtures)("%d mm gives %d degrees vertical", (lensMm, expected) => {
    expect(vFovDeg(lensMm, FULL_FRAME, FORMAT_21_9)).toBeCloseTo(expected, 1);
  });

  it("matches the lens-chart horizontal field of view for 35 mm on full frame", () => {
    const vFovRad = (vFovDeg(35, FULL_FRAME, FORMAT_21_9) * Math.PI) / 180;
    const hFovDeg = (2 * Math.atan(FORMAT_21_9.aspect * Math.tan(vFovRad / 2)) * 180) / Math.PI;
    expect(hFovDeg).toBeCloseTo(54.43, 1);
  });
});

describe("vFovDeg on a format narrower than the sensor", () => {
  it("50 mm on full frame at 4:3 uses the whole 24 mm height", () => {
    const fourByThree: FrameFormat = { id: "4:3", name: "4:3", aspect: 4 / 3 };
    expect(vFovDeg(50, FULL_FRAME, fourByThree)).toBeCloseTo(26.99, 1);
  });
});
```

- [ ] **Step 6: Run it and see it fail**

Run: `pnpm vitest run src/camera/fov.test.ts`
Expected: FAIL, cannot resolve `./fov`.

- [ ] **Step 7: Write `src/camera/fov.ts`**

```ts
export type CameraBody = { id: string; name: string; sensorWmm: number; sensorHmm: number };
export type FrameFormat = { id: string; name: string; aspect: number };

export const FULL_FRAME: CameraBody = { id: "full-frame", name: "Full frame", sensorWmm: 36, sensorHmm: 24 };
export const FORMAT_21_9: FrameFormat = { id: "21:9", name: "21:9", aspect: 21 / 9 };

/** Sensor height actually used once the frame format is cropped out of the sensor. */
export function usedSensorHeightMm(body: CameraBody, format: FrameFormat): number {
  return Math.min(body.sensorHmm, body.sensorWmm / format.aspect);
}

/** Vertical field of view in degrees for a lens on a body, framed for a format. */
export function vFovDeg(lensMm: number, body: CameraBody, format: FrameFormat): number {
  const usedHeight = usedSensorHeightMm(body, format);
  return (2 * Math.atan(usedHeight / (2 * lensMm)) * 180) / Math.PI;
}
```

- [ ] **Step 8: Run it and see it pass**

Run: `pnpm vitest run src/camera/fov.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 9: Commit** (from the repo root)

```bash
git add spikes/vr-camera-feel/src/camera/pose.ts spikes/vr-camera-feel/src/camera/pose.test.ts spikes/vr-camera-feel/src/camera/fov.ts spikes/vr-camera-feel/src/camera/fov.test.ts
git commit -F - <<'MSG'
spike: pose math and body-aware field of view

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

### Task 3: Take format

**Files:**
- Create: `spikes/vr-camera-feel/src/camera/take.ts`
- Test: `spikes/vr-camera-feel/src/camera/take.test.ts`

**Interfaces:**
- Consumes: `CameraPose`, `lerpVec3`, `slerpQuat`, `yawQuat` from `./pose` (Task 2).
- Produces:
  - `TAKE_STRIDE = 8` (sample layout: `t, px, py, pz, qx, qy, qz, qw`), `type Take`
  - `sampleCount(samples: number[]): number`, `pushSample(samples: number[], tSec: number, pose: CameraPose): void`, `durationOf(samples: number[]): number`
  - `poseAt(samples: number[], tSec: number): CameraPose` (throws `"Take has no samples"` on an empty array)
  - `makeTake(args: { id: string; number: number; createdAt: number; lensMm: number; smoothing: number; samples: number[] }): Take`
  - `serializeTake(take: Take): string`, `parseTake(json: string): Take` (throws `Error("Invalid take: <reason>")`)

- [ ] **Step 1: Write the failing test `src/camera/take.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { yawQuat, type CameraPose } from "./pose";
import { durationOf, makeTake, parseTake, poseAt, pushSample, sampleCount, serializeTake, type Take } from "./take";

function twoSamples(): number[] {
  const samples: number[] = [];
  pushSample(samples, 0, { position: [0, 1, 0], rotation: yawQuat(0) });
  pushSample(samples, 1, { position: [2, 1, 0], rotation: yawQuat(90) });
  return samples;
}

function expectPoseClose(actual: CameraPose, expected: CameraPose): void {
  for (let i = 0; i < 3; i++) expect(actual.position[i]).toBeCloseTo(expected.position[i], 6);
  for (let i = 0; i < 4; i++) expect(actual.rotation[i]).toBeCloseTo(expected.rotation[i], 6);
}

function exampleTake(samples: number[] = twoSamples()): Take {
  return makeTake({ id: "take-1-1000", number: 1, createdAt: 1000, lensMm: 35, smoothing: 0.33, samples });
}

describe("sampling", () => {
  it("counts samples and reports the duration as the last timestamp", () => {
    expect(sampleCount(twoSamples())).toBe(2);
    expect(durationOf(twoSamples())).toBe(1);
    expect(durationOf([])).toBe(0);
  });
});

describe("poseAt", () => {
  it("returns a sample exactly at its timestamp", () => {
    expectPoseClose(poseAt(twoSamples(), 0), { position: [0, 1, 0], rotation: yawQuat(0) });
    expectPoseClose(poseAt(twoSamples(), 1), { position: [2, 1, 0], rotation: yawQuat(90) });
  });

  it("lerps position and slerps rotation between samples", () => {
    expectPoseClose(poseAt(twoSamples(), 0.5), { position: [1, 1, 0], rotation: yawQuat(45) });
  });

  it("clamps before the first and after the last sample", () => {
    expectPoseClose(poseAt(twoSamples(), -3), { position: [0, 1, 0], rotation: yawQuat(0) });
    expectPoseClose(poseAt(twoSamples(), 9), { position: [2, 1, 0], rotation: yawQuat(90) });
  });

  it("finds the right interval when sample times are uneven", () => {
    const samples: number[] = [];
    pushSample(samples, 0, { position: [0, 0, 0], rotation: yawQuat(0) });
    pushSample(samples, 0.1, { position: [1, 0, 0], rotation: yawQuat(0) });
    pushSample(samples, 1, { position: [3, 0, 0], rotation: yawQuat(0) });
    expectPoseClose(poseAt(samples, 0.55), { position: [2, 0, 0], rotation: yawQuat(0) });
  });

  it("throws on an empty take", () => {
    expect(() => poseAt([], 0)).toThrow("Take has no samples");
  });
});

describe("makeTake", () => {
  it("fills the fixed spike fields and the duration", () => {
    const take = exampleTake();
    expect(take).toMatchObject({
      v: 1, id: "take-1-1000", number: 1, createdAt: 1000, bodyId: "full-frame", formatId: "21:9",
      lensMm: 35, rig: { rig: "handheld", smoothing: 0.33 }, durationSec: 1,
    });
    expect(take.move.kind).toBe("path");
  });
});

describe("serializeTake and parseTake", () => {
  it("round-trips a take within one millionth", () => {
    const take = exampleTake();
    const parsed = parseTake(serializeTake(take));
    expect(parsed.id).toBe(take.id);
    expect(parsed.lensMm).toBe(35);
    expect(parsed.move.samples).toHaveLength(take.move.samples.length);
    parsed.move.samples.forEach((n, i) => expect(n).toBeCloseTo(take.move.samples[i], 6));
  });

  it("keeps a 900-sample take under 120000 characters", () => {
    const samples: number[] = [];
    for (let i = 0; i < 900; i++) {
      pushSample(samples, i / 90, { position: [Math.sin(i) * 3, 1.5 + Math.cos(i) * 0.2, -3 + Math.sin(i / 7)], rotation: yawQuat(i / 5) });
    }
    expect(serializeTake(exampleTake(samples)).length).toBeLessThan(120000);
  });

  it("rejects input that is not a playable take", () => {
    const good = JSON.parse(serializeTake(exampleTake()));
    const bad: unknown[] = [
      "this is not json",
      JSON.stringify({ ...good, v: 2 }),
      JSON.stringify({ ...good, id: "../x" }),
      JSON.stringify({ ...good, move: { kind: "framings" } }),
      JSON.stringify({ ...good, move: { kind: "path", samples: [0, 1, 2, 3, 4, 5, 6, 7, 8] } }),
      JSON.stringify({ ...good, move: { kind: "path", samples: [0, 0, 0, 0, 0, 0, 0, null] } }),
      JSON.stringify({ ...good, lensMm: 0 }),
    ];
    for (const json of bad) {
      expect(() => parseTake(json as string)).toThrow(/^Invalid take:/);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm vitest run src/camera/take.test.ts`
Expected: FAIL, cannot resolve `./take`.

- [ ] **Step 3: Write `src/camera/take.ts`**

```ts
import type { CameraPose } from "./pose.ts";
import { lerpVec3, slerpQuat } from "./pose.ts";

export const TAKE_STRIDE = 8; // t, px, py, pz, qx, qy, qz, qw

/** The spike's subset of the spec's Take (section 5.1): path moves on the handheld rig only. */
export type Take = {
  v: 1;
  id: string;
  number: number;
  createdAt: number;
  bodyId: string;
  formatId: string;
  lensMm: number;
  rig: { rig: "handheld"; smoothing: number };
  move: { kind: "path"; samples: number[] };
  durationSec: number;
};

export function sampleCount(samples: number[]): number {
  return Math.floor(samples.length / TAKE_STRIDE);
}

export function pushSample(samples: number[], tSec: number, pose: CameraPose): void {
  samples.push(tSec, pose.position[0], pose.position[1], pose.position[2],
    pose.rotation[0], pose.rotation[1], pose.rotation[2], pose.rotation[3]);
}

export function durationOf(samples: number[]): number {
  const n = sampleCount(samples);
  return n === 0 ? 0 : samples[(n - 1) * TAKE_STRIDE];
}

function readPose(samples: number[], i: number): CameraPose {
  const o = i * TAKE_STRIDE;
  return {
    position: [samples[o + 1], samples[o + 2], samples[o + 3]],
    rotation: [samples[o + 4], samples[o + 5], samples[o + 6], samples[o + 7]],
  };
}

/** Camera pose at tSec: clamps outside the take, lerps position and slerps rotation inside it. */
export function poseAt(samples: number[], tSec: number): CameraPose {
  const n = sampleCount(samples);
  if (n === 0) throw new Error("Take has no samples");
  if (tSec <= samples[0]) return readPose(samples, 0);
  const last = n - 1;
  if (tSec >= samples[last * TAKE_STRIDE]) return readPose(samples, last);
  let lo = 0;
  let hi = last; // invariant: t[lo] <= tSec < t[hi]
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid * TAKE_STRIDE] <= tSec) lo = mid;
    else hi = mid;
  }
  const t0 = samples[lo * TAKE_STRIDE];
  const t1 = samples[hi * TAKE_STRIDE];
  const u = t1 > t0 ? (tSec - t0) / (t1 - t0) : 0;
  const a = readPose(samples, lo);
  const b = readPose(samples, hi);
  return { position: lerpVec3(a.position, b.position, u), rotation: slerpQuat(a.rotation, b.rotation, u) };
}

export function makeTake(args: {
  id: string; number: number; createdAt: number; lensMm: number; smoothing: number; samples: number[];
}): Take {
  return {
    v: 1, id: args.id, number: args.number, createdAt: args.createdAt,
    bodyId: "full-frame", formatId: "21:9", lensMm: args.lensMm,
    rig: { rig: "handheld", smoothing: args.smoothing },
    move: { kind: "path", samples: args.samples },
    durationSec: durationOf(args.samples),
  };
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** JSON with numbers rounded to 6 decimals, which keeps a 10 s take under about 100 KB. */
export function serializeTake(take: Take): string {
  return JSON.stringify({ ...take, move: { kind: "path", samples: take.move.samples.map(round6) } });
}

function fail(reason: string): never {
  throw new Error("Invalid take: " + reason);
}

export function parseTake(json: string): Take {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { fail("not JSON"); }
  const t = raw as Partial<Take>;
  if (typeof t !== "object" || t === null) fail("not an object");
  if (t.v !== 1) fail("unsupported version");
  if (typeof t.id !== "string" || !/^[A-Za-z0-9_-]+$/.test(t.id)) fail("bad id");
  if (typeof t.number !== "number" || typeof t.createdAt !== "number") fail("bad number or createdAt");
  if (typeof t.lensMm !== "number" || !(t.lensMm > 0)) fail("bad lensMm");
  if (typeof t.bodyId !== "string" || typeof t.formatId !== "string") fail("bad body or format");
  if (!t.rig || t.rig.rig !== "handheld" || typeof t.rig.smoothing !== "number") fail("bad rig");
  if (!t.move || t.move.kind !== "path" || !Array.isArray(t.move.samples)) fail("bad move");
  const samples = t.move.samples;
  if (samples.length === 0 || samples.length % TAKE_STRIDE !== 0) fail("samples length");
  if (!samples.every((n) => typeof n === "number" && Number.isFinite(n))) fail("non-finite sample");
  if (typeof t.durationSec !== "number") fail("bad durationSec");
  return t as Take;
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `pnpm vitest run src/camera/take.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Typecheck and commit** (commit from the repo root)

Run: `pnpm typecheck`
Expected: exits 0.

```bash
git add spikes/vr-camera-feel/src/camera/take.ts spikes/vr-camera-feel/src/camera/take.test.ts
git commit -F - <<'MSG'
spike: take format, timed camera poses with interpolation and JSON

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```


### Task 4: Measurement: jitter and frame rate

**Files:**
- Create: `spikes/vr-camera-feel/src/camera/jitter.ts`, `src/camera/fps-meter.ts`
- Test: `spikes/vr-camera-feel/src/camera/jitter.test.ts`, `src/camera/fps-meter.test.ts`

**Interfaces:**
- Consumes: `forwardOf`, `yawQuat` from `./pose`; `TAKE_STRIDE`, `sampleCount`, `pushSample` from `./take`.
- Produces:
  - `type JitterResult = { angularRmsDeg: number; positionRmsMm: number; sampleCount: number }`, `measureJitter(samples: number[]): JitterResult`
  - `type FpsMeter`, `createFpsMeter(): FpsMeter`, `pushFrame(m: FpsMeter, dtSec: number): void`, `resetFpsMeter(m: FpsMeter): void`, `readFpsMeter(m: FpsMeter): { avgFps: number; worstMs: number; recentFps: number; frames: number }`

- [ ] **Step 1: Write the failing test `src/camera/jitter.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { measureJitter } from "./jitter";
import { yawQuat } from "./pose";
import { pushSample } from "./take";

describe("measureJitter", () => {
  it("returns zeros for an empty capture", () => {
    expect(measureJitter([])).toEqual({ angularRmsDeg: 0, positionRmsMm: 0, sampleCount: 0 });
  });

  it("returns zero jitter for a perfectly still camera", () => {
    const samples: number[] = [];
    for (let i = 0; i < 100; i++) pushSample(samples, i / 72, { position: [0, 1.5, 0], rotation: yawQuat(20) });
    const result = measureJitter(samples);
    expect(result.sampleCount).toBe(100);
    expect(result.angularRmsDeg).toBeCloseTo(0, 4);
    expect(result.positionRmsMm).toBeCloseTo(0, 6);
  });

  it("reports half a degree for a look direction shaking half a degree each way", () => {
    const samples: number[] = [];
    for (let i = 0; i < 100; i++) pushSample(samples, i / 72, { position: [0, 1.5, 0], rotation: yawQuat(i % 2 === 0 ? 0.5 : -0.5) });
    expect(measureJitter(samples).angularRmsDeg).toBeCloseTo(0.5, 3);
  });

  it("reports one millimetre for a position shaking one millimetre each way", () => {
    const samples: number[] = [];
    for (let i = 0; i < 100; i++) pushSample(samples, i / 72, { position: [i % 2 === 0 ? 0.001 : -0.001, 1.5, 0], rotation: yawQuat(0) });
    expect(measureJitter(samples).positionRmsMm).toBeCloseTo(1, 3);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm vitest run src/camera/jitter.test.ts`
Expected: FAIL, cannot resolve `./jitter`.

- [ ] **Step 3: Write `src/camera/jitter.ts`**

```ts
import { forwardOf } from "./pose";
import { TAKE_STRIDE, sampleCount } from "./take";

export type JitterResult = { angularRmsDeg: number; positionRmsMm: number; sampleCount: number };

/** RMS deviation of the look direction (degrees) and of the position (mm) from their means. */
export function measureJitter(samples: number[]): JitterResult {
  const n = sampleCount(samples);
  if (n === 0) return { angularRmsDeg: 0, positionRmsMm: 0, sampleCount: 0 };
  const forwards: [number, number, number][] = [];
  const mean = [0, 0, 0];
  const meanPos = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const o = i * TAKE_STRIDE;
    const f = forwardOf([samples[o + 4], samples[o + 5], samples[o + 6], samples[o + 7]]);
    forwards.push(f);
    mean[0] += f[0]; mean[1] += f[1]; mean[2] += f[2];
    meanPos[0] += samples[o + 1]; meanPos[1] += samples[o + 2]; meanPos[2] += samples[o + 3];
  }
  const len = Math.hypot(mean[0], mean[1], mean[2]) || 1;
  mean[0] /= len; mean[1] /= len; mean[2] /= len;
  meanPos[0] /= n; meanPos[1] /= n; meanPos[2] /= n;
  let angSq = 0;
  let posSq = 0;
  for (let i = 0; i < n; i++) {
    const o = i * TAKE_STRIDE;
    const f = forwards[i];
    const dot = Math.min(1, Math.max(-1, f[0] * mean[0] + f[1] * mean[1] + f[2] * mean[2]));
    const deg = (Math.acos(dot) * 180) / Math.PI;
    angSq += deg * deg;
    const dx = samples[o + 1] - meanPos[0];
    const dy = samples[o + 2] - meanPos[1];
    const dz = samples[o + 3] - meanPos[2];
    posSq += dx * dx + dy * dy + dz * dz;
  }
  return { angularRmsDeg: Math.sqrt(angSq / n), positionRmsMm: Math.sqrt(posSq / n) * 1000, sampleCount: n };
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `pnpm vitest run src/camera/jitter.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing test `src/camera/fps-meter.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { createFpsMeter, pushFrame, readFpsMeter, resetFpsMeter } from "./fps-meter";

describe("fps meter", () => {
  it("has no rolling fps before the first full second", () => {
    const m = createFpsMeter();
    for (let i = 0; i < 10; i++) pushFrame(m, 1 / 90);
    expect(readFpsMeter(m).recentFps).toBe(0);
  });

  // 100 frames, not 90: summing 1/90 ninety times can land a hair under 1.0,
  // which delays the one-second rollover by a frame.
  it("reports 90 fps average, rolling 90 fps and an 11.1 ms worst frame at a steady 90 Hz", () => {
    const m = createFpsMeter();
    for (let i = 0; i < 100; i++) pushFrame(m, 1 / 90);
    const read = readFpsMeter(m);
    expect(read.frames).toBe(100);
    expect(read.avgFps).toBeCloseTo(90, 5);
    expect(read.recentFps).toBeCloseTo(90, 5);
    expect(read.worstMs).toBeCloseTo(11.111, 2);
  });

  it("remembers the single worst frame", () => {
    const m = createFpsMeter();
    for (let i = 0; i < 50; i++) pushFrame(m, 1 / 90);
    pushFrame(m, 0.04);
    for (let i = 0; i < 50; i++) pushFrame(m, 1 / 90);
    expect(readFpsMeter(m).worstMs).toBeCloseTo(40, 6);
  });

  it("reset clears the since-reset numbers and keeps the rolling fps", () => {
    const m = createFpsMeter();
    for (let i = 0; i < 100; i++) pushFrame(m, 1 / 90);
    resetFpsMeter(m);
    const read = readFpsMeter(m);
    expect(read.frames).toBe(0);
    expect(read.avgFps).toBe(0);
    expect(read.worstMs).toBe(0);
    expect(read.recentFps).toBeCloseTo(90, 5);
  });
});
```

- [ ] **Step 6: Run it and see it fail**

Run: `pnpm vitest run src/camera/fps-meter.test.ts`
Expected: FAIL, cannot resolve `./fps-meter`.

- [ ] **Step 7: Write `src/camera/fps-meter.ts`**

```ts
export type FpsMeter = {
  frames: number; totalSec: number; worstMs: number;
  recentSec: number; recentFrames: number; recentFps: number;
};

export function createFpsMeter(): FpsMeter {
  return { frames: 0, totalSec: 0, worstMs: 0, recentSec: 0, recentFrames: 0, recentFps: 0 };
}

export function pushFrame(m: FpsMeter, dtSec: number): void {
  m.frames += 1;
  m.totalSec += dtSec;
  if (dtSec * 1000 > m.worstMs) m.worstMs = dtSec * 1000;
  m.recentSec += dtSec;
  m.recentFrames += 1;
  if (m.recentSec >= 1) {
    m.recentFps = m.recentFrames / m.recentSec;
    m.recentSec = 0;
    m.recentFrames = 0;
  }
}

/** Resets the since-reset numbers. The rolling one-second fps keeps running. */
export function resetFpsMeter(m: FpsMeter): void {
  m.frames = 0;
  m.totalSec = 0;
  m.worstMs = 0;
}

export function readFpsMeter(m: FpsMeter): { avgFps: number; worstMs: number; recentFps: number; frames: number } {
  return { avgFps: m.totalSec > 0 ? m.frames / m.totalSec : 0, worstMs: m.worstMs, recentFps: m.recentFps, frames: m.frames };
}
```

- [ ] **Step 8: Run it and see it pass**

Run: `pnpm vitest run src/camera/fps-meter.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 9: Commit** (from the repo root)

```bash
git add spikes/vr-camera-feel/src/camera/jitter.ts spikes/vr-camera-feel/src/camera/jitter.test.ts spikes/vr-camera-feel/src/camera/fps-meter.ts spikes/vr-camera-feel/src/camera/fps-meter.test.ts
git commit -F - <<'MSG'
spike: jitter metric and frame-rate meter

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

### Task 5: Constants, input edges and the scripted path

**Files:**
- Create: `spikes/vr-camera-feel/src/constants.ts`, `src/input/edges.ts`, `src/flat/scripted-path.ts`
- Test: `spikes/vr-camera-feel/src/input/edges.test.ts`, `src/flat/scripted-path.test.ts`

**Interfaces:**
- Consumes: `CameraPose`, `forwardOf` from `../camera/pose`; `Vec3` from `./stage/types`.
- Produces:
  - Constants: `LENSES_MM`, `SMOOTHING_LEVELS`, `VF_RESOLUTIONS`, `VF_MSAA_SAMPLES`, `BODY_MONITOR_WIDTH_M`, `HAND_MONITOR_WIDTH_M`, `HUD_MONITOR_WIDTH_M`, `GRAB_DISTANCE_M`, `JITTER_TEST_SEC`, `CLIP_ASPECT`, `SET_CENTER`, `OVERVIEW_CAMERA_POSITION`, `OVERVIEW_LOOK_AT`, `XR_CAMERA_SPAWN`
  - `createButtonEdge(): (pressed: boolean) => boolean`, `createStickFlick(threshold?: number, rearm?: number): (value: number) => -1 | 0 | 1`
  - `scriptedHandPose(tSec: number): CameraPose`

- [ ] **Step 1: Write `src/constants.ts`** (plain data, no test)

```ts
import type { Vec3 } from "./stage/types";

export const LENSES_MM = [18, 24, 35, 50, 85, 135] as const;

export const SMOOTHING_LEVELS = [
  { name: "off", value: 0 },
  { name: "light", value: 0.33 },
  { name: "medium", value: 0.66 },
  { name: "heavy", value: 0.9 },
] as const;

/** Viewfinder render-target sizes, all 21:9. Question 1 of the spike steps through them. */
export const VF_RESOLUTIONS = [
  [640, 274],
  [960, 412],
  [1280, 548],
] as const;

/** MSAA samples on the viewfinder target. 0 is cheapest. Try 4 in the headset if edges crawl. */
export const VF_MSAA_SAMPLES = 0;

export const BODY_MONITOR_WIDTH_M = 0.16;
export const HAND_MONITOR_WIDTH_M = 0.3;
export const HUD_MONITOR_WIDTH_M = 0.5;
export const GRAB_DISTANCE_M = 0.25;
export const JITTER_TEST_SEC = 10;
export const CLIP_ASPECT = 21 / 9;

/** Clip planes of the lens. The live camera and the replay page share them, so a take replays exactly. */
export const LENS_NEAR_M = 0.05;
export const LENS_FAR_M = 200;

/** The set sits three metres in front of the operator, who starts at the world origin facing -Z. */
export const SET_CENTER: Vec3 = [0, 0, -3];

/** The flat page's overview camera. */
export const OVERVIEW_CAMERA_POSITION: Vec3 = [3, 2.2, 1];
export const OVERVIEW_LOOK_AT: Vec3 = [0, 1, -3];

/** Where the camera body waits when a VR session starts: within reach, looking at the doll. */
export const XR_CAMERA_SPAWN: Vec3 = [0.3, 1.2, -0.6];
```

- [ ] **Step 2: Write the failing test `src/input/edges.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { createButtonEdge, createStickFlick } from "./edges";

describe("createButtonEdge", () => {
  it("fires only on the frame the button goes down", () => {
    const edge = createButtonEdge();
    const seen = [false, true, true, false, true].map((pressed) => edge(pressed));
    expect(seen).toEqual([false, true, false, false, true]);
  });
});

describe("createStickFlick", () => {
  it("fires once per flick and re-arms near the centre", () => {
    const flick = createStickFlick();
    const seen = [0, 0.5, 0.8, 0.9, 0.2, -0.75, -0.9, 0.1, 0.71].map((value) => flick(value));
    expect(seen).toEqual([0, 0, 1, 0, 0, -1, 0, 0, 1]);
  });

  it("does not fire again when the stick swings across without resting at the centre", () => {
    const flick = createStickFlick();
    expect([0.9, -0.9].map((value) => flick(value))).toEqual([1, 0]);
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `pnpm vitest run src/input/edges.test.ts`
Expected: FAIL, cannot resolve `./edges`.

- [ ] **Step 4: Write `src/input/edges.ts`**

```ts
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
```

- [ ] **Step 5: Run it and see it pass**

Run: `pnpm vitest run src/input/edges.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Write the failing test `src/flat/scripted-path.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { forwardOf } from "../camera/pose";
import { SET_CENTER } from "../constants";
import { scriptedHandPose } from "./scripted-path";

describe("scriptedHandPose", () => {
  it.each([0, 5, 13])("orbits 3 m from the set centre at 1.5 m height (t = %d s)", (t) => {
    const pose = scriptedHandPose(t);
    const dx = pose.position[0] - SET_CENTER[0];
    const dz = pose.position[2] - SET_CENTER[2];
    expect(Math.hypot(dx, dz)).toBeCloseTo(3, 6);
    expect(pose.position[1]).toBeCloseTo(1.5, 6);
  });

  it.each([0, 5, 13])("always looks at the doll's chest (t = %d s)", (t) => {
    const pose = scriptedHandPose(t);
    const toTarget = [SET_CENTER[0] - pose.position[0], 1.2 - pose.position[1], SET_CENTER[2] - pose.position[2]];
    const length = Math.hypot(toTarget[0], toTarget[1], toTarget[2]);
    const forward = forwardOf(pose.rotation);
    const dot = (forward[0] * toTarget[0] + forward[1] * toTarget[1] + forward[2] * toTarget[2]) / length;
    expect(dot).toBeGreaterThan(0.999);
  });
});
```

- [ ] **Step 7: Run it and see it fail**

Run: `pnpm vitest run src/flat/scripted-path.test.ts`
Expected: FAIL, cannot resolve `./scripted-path`.

- [ ] **Step 8: Write `src/flat/scripted-path.ts`**

```ts
import { Matrix4, Quaternion, Vector3 } from "three";
import type { CameraPose } from "../camera/pose";
import { SET_CENTER } from "../constants";

const eye = new Vector3();
const target = new Vector3(SET_CENTER[0], 1.2, SET_CENTER[2]);
const up = new Vector3(0, 1, 0);
const m = new Matrix4();
const q = new Quaternion();

/** A slow orbit around the doll, 3 m out and 1.5 m up, one lap per 20 s, always looking at its chest. */
export function scriptedHandPose(tSec: number): CameraPose {
  const a = (tSec / 20) * Math.PI * 2;
  eye.set(SET_CENTER[0] + Math.sin(a) * 3, 1.5, SET_CENTER[2] + Math.cos(a) * 3);
  m.lookAt(eye, target, up); // camera convention: -Z points from the eye to the target
  q.setFromRotationMatrix(m);
  return { position: [eye.x, eye.y, eye.z], rotation: [q.x, q.y, q.z, q.w] };
}
```

- [ ] **Step 9: Run it and see it pass**

Run: `pnpm vitest run src/flat/scripted-path.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 10: Commit** (from the repo root)

```bash
git add spikes/vr-camera-feel/src/constants.ts spikes/vr-camera-feel/src/input spikes/vr-camera-feel/src/flat
git commit -F - <<'MSG'
spike: constants, input edge helpers and the scripted camera path

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

### Task 6: Handheld rig scaffold and property tests (Nick writes the body)

**Files:**
- Create: `spikes/vr-camera-feel/src/camera/handheld.ts`
- Test: `spikes/vr-camera-feel/src/camera/handheld.test.ts`

**Interfaces:**
- Consumes: `CameraPose`, `angleBetweenDeg`, `yawQuat`, `lerpVec3`, `slerpQuat` from `./pose`.
- Produces: `handheld(hand: CameraPose, previous: CameraPose, dtSec: number, smoothing: number): CameraPose` and `HANDHELD_IMPLEMENTED: boolean`. Until Nick writes the body, `handheld` returns `hand` unchanged and `HANDHELD_IMPLEMENTED` is `false`. Every later task works with that pass-through.

- [ ] **Step 1: Write the test `src/camera/handheld.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { HANDHELD_IMPLEMENTED, handheld } from "./handheld";
import { angleBetweenDeg, yawQuat, type CameraPose } from "./pose";

const START: CameraPose = { position: [0, 1.5, 0], rotation: yawQuat(0) };
const HAND: CameraPose = { position: [0.5, 1.5, 0], rotation: yawQuat(30) };

function distance(a: CameraPose, b: CameraPose): number {
  return Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]);
}

/** Steps the rig from START toward a hand held still at HAND and returns where the camera ends up. */
function run(hz: number, seconds: number, smoothing: number, onStep?: (pose: CameraPose) => void): CameraPose {
  let pose = START;
  const steps = Math.round(hz * seconds);
  for (let i = 0; i < steps; i++) {
    pose = handheld(HAND, pose, 1 / hz, smoothing);
    onStep?.(pose);
  }
  return pose;
}

/** Share of the way from START to HAND covered by one 1/72 s step. */
function progressInOneStep(smoothing: number): number {
  return distance(handheld(HAND, START, 1 / 72, smoothing), START) / distance(HAND, START);
}

describe("handheld, for any filter", () => {
  it("is welded to the hand when smoothing is 0", () => {
    expect(handheld(HAND, START, 1 / 72, 0)).toEqual(HAND);
  });

  it("converges on a hand that holds still", () => {
    const end = run(72, 5, 0.9);
    expect(distance(end, HAND)).toBeLessThan(0.005);
    expect(angleBetweenDeg(end.rotation, HAND.rotation)).toBeLessThan(0.5);
  });

  it("always returns a unit quaternion", () => {
    run(72, 3, 0.66, (pose) => {
      const r = pose.rotation;
      expect(Math.abs(Math.hypot(r[0], r[1], r[2], r[3]) - 1)).toBeLessThan(1e-6);
    });
  });

  it("feels the same at 72 Hz and 90 Hz", () => {
    const at72 = run(72, 0.5, 0.9);
    const at90 = run(90, 0.5, 0.9);
    expect(distance(at72, at90)).toBeLessThan(0.001);
    expect(angleBetweenDeg(at72.rotation, at90.rotation)).toBeLessThan(0.1);
  });
});

describe.skipIf(!HANDHELD_IMPLEMENTED)("handheld, with Nick's smoothing", () => {
  it("lags behind the hand when smoothing is heavy", () => {
    const progress = progressInOneStep(0.9);
    expect(progress).toBeGreaterThan(0.001);
    expect(progress).toBeLessThan(0.5);
  });

  it("lags more as smoothing grows", () => {
    expect(progressInOneStep(0.33)).toBeGreaterThan(progressInOneStep(0.66));
    expect(progressInOneStep(0.66)).toBeGreaterThan(progressInOneStep(0.9));
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm vitest run src/camera/handheld.test.ts`
Expected: FAIL, cannot resolve `./handheld`.

- [ ] **Step 3: Write the scaffold `src/camera/handheld.ts`**

```ts
import type { CameraPose } from "./pose";
// Helpers for the body: import { lerpVec3, slerpQuat } from "./pose";

/** Flip to true in the same commit that gives handheld() a real body. It switches on the last two property tests. */
export const HANDHELD_IMPLEMENTED = false;

/**
 * The handheld rig: how the camera follows the operator's hand.
 * `smoothing` runs from 0 (camera welded to the hand) to 1 (heaviest smoothing).
 * `previous` is the camera pose this function returned last frame. `dtSec` is the frame time.
 *
 * Trade-offs to weigh. This function decides how operating feels:
 * - Lag against steadiness. More smoothing calms long lenses and makes the camera trail the hand.
 * - Position against rotation. Rotation shake is what ruins an 85 mm frame. Position lag is what makes the
 *   camera feel detached from your hand. They can take different strengths.
 * - Frame-rate independence. A fixed blend per frame feels different at 72 Hz and 90 Hz. Blend by time:
 *   alpha = 1 - Math.exp(-dtSec / tau), with tau in seconds growing with `smoothing`.
 * - Roll. Extra damping on roll keeps horizons level. It needs a swing-twist split, so treat it as optional.
 * - A One Euro filter adapts to speed (steady when still, quick when moving). About 30 lines. A possible follow-up.
 */
export function handheld(hand: CameraPose, previous: CameraPose, dtSec: number, smoothing: number): CameraPose {
  // TODO(Nick): about ten lines. Until then the camera is welded to the hand.
  return hand;
}
```

- [ ] **Step 4: Run it and see the expected result**

Run: `pnpm vitest run src/camera/handheld.test.ts`
Expected: 4 tests pass and 2 are reported as skipped. The pass-through satisfies the four general properties. The two skipped ones need real smoothing.

Run: `pnpm typecheck`
Expected: exits 0. (`previous`, `dtSec` and `smoothing` are unused for now. `strict` does not flag unused parameters.)

- [ ] **Step 5: Commit the scaffold** (from the repo root)

```bash
git add spikes/vr-camera-feel/src/camera/handheld.ts spikes/vr-camera-feel/src/camera/handheld.test.ts
git commit -F - <<'MSG'
spike: handheld rig scaffold and property tests, body left for Nick

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

- [ ] **Step 6: STOP and hand the function to Nick**

Do not write the body. Tell Nick: "`spikes/vr-camera-feel/src/camera/handheld.ts` is ready for you. Four property tests pass with the pass-through and two are skipped until you write the body and set `HANDHELD_IMPLEMENTED = true`. Run `pnpm vitest run src/camera/handheld.test.ts` to check your version." Then carry on with Task 7. Everything after this task works with the pass-through.

If Nick says "you write it", use the reference implementation in the appendix at the end of this plan, set `HANDHELD_IMPLEMENTED = true`, run the test file (expected: 6 pass, 0 skipped), and commit with the message `spike: handheld smoothing (reference implementation, approved by Nick)`. Never commit a body Nick did not write or approve.


### Task 7: Store and runtime

**Files:**
- Create: `spikes/vr-camera-feel/src/store.ts`, `src/runtime.ts`
- Test: `spikes/vr-camera-feel/src/store.test.ts`

**Interfaces:**
- Consumes: `Take`, `makeTake`, `pushSample` from `./camera/take`; `JitterResult` from `./camera/jitter`; `createFpsMeter` from `./camera/fps-meter`; `CameraPose` from `./camera/pose`; `LENSES_MM`, `SMOOTHING_LEVELS`, `VF_RESOLUTIONS` from `./constants`.
- Produces:
  - `type Phase = "idle" | "recording" | "replaying" | "jitter"`, `type JitterReport`, `type ProbeState`, `type SpikeState`, `INITIAL_STATE`, `useSpikeStore`
  - Store actions: `stepLens(dir: -1 | 1)`, `cycleSmoothing()`, `stepVfRes(dir: -1 | 1)`, `togglePanel()`, `startRecording(): boolean`, `finishRecording(take: Take)`, `startReplay(): boolean`, `startJitter(): boolean`, `finishJitter(report: JitterReport)`, `toIdle()`, `setSaveStatus(s: string)`, `setProbe(p: Partial<ProbeState>)`
  - `runtime`: `{ cameraPose, handPose, leftHandPose, grabbed, samples, phaseClock, fps, flatClock, inXR }`

- [ ] **Step 1: Write the failing test `src/store.test.ts`**

```ts
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

  it("ignores lens, smoothing and viewfinder size changes outside the idle phase", () => {
    store().startRecording();
    store().stepLens(1);
    store().cycleSmoothing();
    store().stepVfRes(1);
    expect(store().lensIndex).toBe(2);
    expect(store().smoothingIndex).toBe(0);
    expect(store().vfResIndex).toBe(1);
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
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm vitest run src/store.test.ts`
Expected: FAIL, cannot resolve `./store`.

- [ ] **Step 3: Write `src/store.ts`**

```ts
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
```

- [ ] **Step 4: Run it and see it pass**

Run: `pnpm vitest run src/store.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Write `src/runtime.ts`** (plain mutable singletons, no test)

```ts
import { createFpsMeter } from "./camera/fps-meter";
import type { CameraPose } from "./camera/pose";

/**
 * Values that change every frame live here, outside React and outside Zustand,
 * so that a 90 Hz loop never triggers a re-render. Components read and write them inside useFrame.
 */
export const runtime = {
  /** World pose of the lens (the camera body group's origin is the optical centre). This is what a take records. */
  cameraPose: { position: [0, 1.5, 0], rotation: [0, 0, 0, 1] } as CameraPose,
  /** World pose of the right grip this frame. Null when untracked or outside VR. */
  handPose: null as CameraPose | null,
  /** World pose of the left grip: carries the hand monitor and the debug panel. */
  leftHandPose: null as CameraPose | null,
  grabbed: false,
  /** Sample buffer of the take or jitter test in progress (stride 8, see take.ts). */
  samples: [] as number[],
  /** Seconds since the current phase began. */
  phaseClock: 0,
  fps: createFpsMeter(),
  /** Frame-rate numbers of the last finished take, frozen at the moment of "cut". Null until one exists. */
  takeFps: null as { avgFps: number; worstMs: number; frames: number } | null,
  /** Seconds since page load. Drives the scripted path in flat mode. */
  flatClock: 0,
  inXR: false,
};
```

- [ ] **Step 6: Typecheck and commit** (commit from the repo root)

Run: `pnpm typecheck`
Expected: exits 0.

```bash
git add spikes/vr-camera-feel/src/store.ts spikes/vr-camera-feel/src/store.test.ts spikes/vr-camera-feel/src/runtime.ts
git commit -F - <<'MSG'
spike: UI store with phase machine, per-frame runtime singletons

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

### Task 8: Takes dev-server plugin

**Files:**
- Create: `spikes/vr-camera-feel/takes-plugin.ts`
- Test: `spikes/vr-camera-feel/takes-plugin.test.ts`
- Modify: `spikes/vr-camera-feel/vite.config.ts`

**Interfaces:**
- Consumes: `parseTake`, `serializeTake`, `makeTake`, `pushSample` from `./src/camera/take`; `yawQuat` from `./src/camera/pose`.
- Produces:
  - `type TakeSummary = { id: string; number: number; lensMm: number; durationSec: number; createdAt: number }`
  - `saveTakeJson(dir: string, json: string): { id: string }`, `listTakes(dir: string): TakeSummary[]` (newest first), `readTakeJson(dir: string, id: string): string | null`, `takesPlugin(dir?: string): Plugin`
  - HTTP on the dev server: `POST /takes` (body: take JSON, max 5 MB) returns `{ "id": "..." }` or 400 / 413 with `{ "error": "..." }`; `GET /takes` returns `TakeSummary[]`; `GET /takes/<id>.json` returns the take or 404.

- [ ] **Step 1: Write the failing test `takes-plugin.test.ts`**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { yawQuat } from "./src/camera/pose";
import { makeTake, pushSample, serializeTake } from "./src/camera/take";
import { listTakes, readTakeJson, saveTakeJson } from "./takes-plugin";

function takeJson(id: string, number: number, createdAt: number): string {
  const samples: number[] = [];
  pushSample(samples, 0, { position: [0, 1, 0], rotation: yawQuat(0) });
  pushSample(samples, 1.5, { position: [1, 1, 0], rotation: yawQuat(20) });
  return serializeTake(makeTake({ id, number, createdAt, lensMm: 50, smoothing: 0.66, samples }));
}

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "takes-"));
});

describe("saveTakeJson", () => {
  it("writes <id>.json and returns the id", () => {
    expect(saveTakeJson(dir, takeJson("take-1-100", 1, 100))).toEqual({ id: "take-1-100" });
    expect(fs.existsSync(path.join(dir, "take-1-100.json"))).toBe(true);
  });

  it("creates the folder when it is missing", () => {
    const nested = path.join(dir, "not-there-yet");
    saveTakeJson(nested, takeJson("take-1-100", 1, 100));
    expect(fs.existsSync(path.join(nested, "take-1-100.json"))).toBe(true);
  });

  it("rejects invalid takes and unsafe ids without writing anything", () => {
    expect(() => saveTakeJson(dir, "{}")).toThrow(/^Invalid take:/);
    const unsafe = takeJson("take-1-100", 1, 100).replace("take-1-100", "../escape");
    expect(() => saveTakeJson(dir, unsafe)).toThrow(/^Invalid take:/);
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});

describe("listTakes", () => {
  it("returns an empty list for a missing folder", () => {
    expect(listTakes(path.join(dir, "missing"))).toEqual([]);
  });

  it("lists summaries newest first and skips files that are not takes", () => {
    saveTakeJson(dir, takeJson("take-1-100", 1, 100));
    saveTakeJson(dir, takeJson("take-2-200", 2, 200));
    fs.writeFileSync(path.join(dir, "junk.json"), "not a take");
    fs.writeFileSync(path.join(dir, "notes.txt"), "ignore me");
    expect(listTakes(dir)).toEqual([
      { id: "take-2-200", number: 2, lensMm: 50, durationSec: 1.5, createdAt: 200 },
      { id: "take-1-100", number: 1, lensMm: 50, durationSec: 1.5, createdAt: 100 },
    ]);
  });
});

describe("readTakeJson", () => {
  it("returns the stored JSON, or null when the take does not exist", () => {
    const json = takeJson("take-1-100", 1, 100);
    saveTakeJson(dir, json);
    expect(readTakeJson(dir, "take-1-100")).toBe(json);
    expect(readTakeJson(dir, "take-9-900")).toBeNull();
  });

  it("refuses ids that could leave the folder", () => {
    fs.writeFileSync(path.join(dir, "secret.json"), "{}");
    expect(readTakeJson(path.join(dir, "sub"), "../secret")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm vitest run takes-plugin.test.ts`
Expected: FAIL, cannot resolve `./takes-plugin`.

- [ ] **Step 3: Write `takes-plugin.ts`**

```ts
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { parseTake } from "./src/camera/take.ts";

export type TakeSummary = { id: string; number: number; lensMm: number; durationSec: number; createdAt: number };

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const DEFAULT_DIR = fileURLToPath(new URL("./takes", import.meta.url));

/** Validates the JSON as a take (which also vets the id) and writes it to <dir>/<id>.json. */
export function saveTakeJson(dir: string, json: string): { id: string } {
  const take = parseTake(json);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, take.id + ".json"), json);
  return { id: take.id };
}

/** Summaries of every valid take in the folder, newest first. Files that do not parse are left out. */
export function listTakes(dir: string): TakeSummary[] {
  if (!fs.existsSync(dir)) return [];
  const summaries: TakeSummary[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const take = parseTake(fs.readFileSync(path.join(dir, file), "utf8"));
      summaries.push({ id: take.id, number: take.number, lensMm: take.lensMm, durationSec: take.durationSec, createdAt: take.createdAt });
    } catch {
      // Not a take. The list simply does not show it.
    }
  }
  return summaries.sort((a, b) => b.createdAt - a.createdAt);
}

export function readTakeJson(dir: string, id: string): string | null {
  if (!ID_PATTERN.test(id)) return null;
  const file = path.join(dir, id + ".json");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

/** Resolves with the body text, or null when it is larger than 5 MB. Keeps draining so the socket stays healthy. */
function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(tooLarge ? null : Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Dev-server only: the headset POSTs takes here and the replay page reads them back. */
export function takesPlugin(dir: string = DEFAULT_DIR): Plugin {
  return {
    name: "spike-takes",
    configureServer(server) {
      server.middlewares.use("/takes", (req, res) => {
        const url = (req.url ?? "/").split("?")[0]; // the "/takes" prefix is already stripped
        const isRoot = url === "/" || url === "";

        if (req.method === "POST" && isRoot) {
          readBody(req)
            .then((body) => {
              if (body === null) return send(res, 413, { error: "Take larger than 5 MB" });
              try {
                send(res, 200, saveTakeJson(dir, body));
              } catch (error) {
                send(res, 400, { error: (error as Error).message });
              }
            })
            .catch(() => send(res, 500, { error: "Could not read the request body" }));
          return;
        }

        if (req.method === "GET" && isRoot) return send(res, 200, listTakes(dir));

        const match = req.method === "GET" ? /^\/([A-Za-z0-9_-]+)\.json$/.exec(url) : null;
        if (match) {
          const json = readTakeJson(dir, match[1]);
          return json === null ? send(res, 404, { error: "No such take" }) : send(res, 200, json);
        }

        send(res, 404, { error: "Not found" });
      });
    },
  };
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `pnpm vitest run takes-plugin.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Wire the plugin into `vite.config.ts`**

Replace the whole file with:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { fileURLToPath } from "node:url";
import { takesPlugin } from "./takes-plugin.ts";

// HTTPS is the default because WebXR needs a secure context on the LAN.
// SPIKE_HTTP=1 serves plain http for localhost and for `adb reverse`.
const useHttps = process.env.SPIKE_HTTP !== "1";

export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : []), takesPlugin()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { host: true, port: 5173, strictPort: true },
  test: { environment: "node", include: ["src/**/*.test.ts", "takes-plugin.test.ts"] },
});
```

- [ ] **Step 6: Check the endpoints by hand**

Run in one terminal: `pnpm dev:http`
Run in another:

```bash
curl -s http://localhost:5173/takes
curl -s -X POST --data '{"v":2}' http://localhost:5173/takes
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/takes/nope.json
```

Expected, in order: `[]`, then `{"error":"Invalid take: unsupported version"}`, then `404`. Stop the dev server with Ctrl+C. (The page itself 404s until Task 9 adds `src/main.tsx`. That is fine here.)

- [ ] **Step 7: Full test run, typecheck, commit** (commit from the repo root)

Run: `pnpm test`
Expected: all files pass. `handheld.test.ts` shows 2 skipped.

Run: `pnpm typecheck`
Expected: exits 0.

```bash
git add spikes/vr-camera-feel/takes-plugin.ts spikes/vr-camera-feel/takes-plugin.test.ts spikes/vr-camera-feel/vite.config.ts
git commit -F - <<'MSG'
spike: dev-server hook that saves and serves takes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```


### Task 9: Flat scene: the set, the camera body and the viewfinder

**Files:**
- Create: `spikes/vr-camera-feel/src/spike-scene.ts`, `src/ui/text-canvas.ts`, `src/xr/xr-store.ts`, `src/xr/scene-refs.ts`, `src/xr/StageMount.tsx`, `src/xr/VirtualCamera.tsx`, `src/xr/Viewfinder.tsx`, `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: `buildStageScene`, `resolveObjects`, `STAGE_BACKGROUND`, `Stage` (Task 1); `vFovDeg`, `FULL_FRAME`, `FORMAT_21_9` (Task 2); `poseAt` (Task 3); `handheld` (Task 6); constants and `scriptedHandPose` (Task 5); `useSpikeStore`, `runtime` (Task 7).
- Produces:
  - `SPIKE_STAGE: Stage`
  - `createTextCanvas(width: number, height: number, fontPx: number): TextCanvas` where `TextCanvas = { texture: CanvasTexture; draw(lines: string[], colors?: (string | undefined)[]): void; dispose(): void }`
  - `xrStore`, `NATIVE_WEBXR: boolean`
  - `sceneRefs: { lensCamera; hideFromLens: Set<Object3D>; monitorMaterials: Set<MeshBasicMaterial>; viewfinderTexture }`
  - Components: `StageMount`, `VirtualCamera({ children })`, `Viewfinder`, `BodyMonitor`, `HandMonitor({ children })`, `HudMonitor({ children })`, `App`
  - `App.tsx` carries seven `ANCHOR:` comments. Later tasks insert exact lines above them.

This task has no unit tests: it is React and WebGL glue. Its checks are the typecheck, the existing tests, and the manual list in Step 11.

- [ ] **Step 1: Write `src/spike-scene.ts`**

```ts
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
```

- [ ] **Step 2: Write `src/ui/text-canvas.ts`**

```ts
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

export type TextCanvas = {
  texture: CanvasTexture;
  draw(lines: string[], colors?: (string | undefined)[]): void;
  dispose(): void;
};

/** A 2D canvas used as a texture: the cheapest way to show changing text inside a WebXR scene. */
export function createTextCanvas(width: number, height: number, fontPx: number): TextCanvas {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is not available");
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  const lineHeight = Math.round(fontPx * 1.35);

  return {
    texture,
    draw(lines, colors = []) {
      ctx.fillStyle = "#0b0d11";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${fontPx}px ui-monospace, Menlo, monospace`;
      ctx.textBaseline = "top";
      lines.forEach((line, i) => {
        ctx.fillStyle = colors[i] ?? "#e6e8ec";
        ctx.fillText(line, 12, 8 + i * lineHeight);
      });
      texture.needsUpdate = true;
    },
    dispose() {
      texture.dispose();
    },
  };
}
```

- [ ] **Step 3: Write `src/xr/xr-store.ts`**

```ts
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
// Only a clear "no" removes the native object. A rejection or a call that hangs counts as "keep native", and the
// 1.5 s cap guarantees this top-level await can never leave the page blank.
if (NATIVE_WEBXR && window.location.hostname === "localhost") {
  const nativeVr = await Promise.race([
    navigator.xr!.isSessionSupported("immersive-vr").catch(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 1500)),
  ]);
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
```

- [ ] **Step 4: Write `src/xr/scene-refs.ts`**

```ts
import type { MeshBasicMaterial, Object3D, PerspectiveCamera, Texture } from "three";

/** Handles shared between the camera, the monitors and the viewfinder pass, without prop drilling. */
export const sceneRefs = {
  /** The lens: the camera the viewfinder pass renders through. */
  lensCamera: null as PerspectiveCamera | null,
  /** Objects switched off during the viewfinder pass: monitors, the panel, the camera body. */
  hideFromLens: new Set<Object3D>(),
  /** Materials that display the viewfinder picture. They get the new texture when the resolution changes. */
  monitorMaterials: new Set<MeshBasicMaterial>(),
  viewfinderTexture: null as Texture | null,
};
```

- [ ] **Step 5: Write `src/xr/StageMount.tsx`**

```tsx
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
```

- [ ] **Step 6: Write `src/xr/VirtualCamera.tsx`**

```tsx
import { useEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { FORMAT_21_9, FULL_FRAME, vFovDeg } from "../camera/fov";
import { handheld } from "../camera/handheld";
import type { CameraPose } from "../camera/pose";
import { poseAt } from "../camera/take";
import { CLIP_ASPECT, LENSES_MM, LENS_FAR_M, LENS_NEAR_M, SMOOTHING_LEVELS } from "../constants";
import { scriptedHandPose } from "../flat/scripted-path";
import { runtime } from "../runtime";
import { useSpikeStore } from "../store";
import { sceneRefs } from "./scene-refs";

// Scratch objects: nothing three.js is allocated inside the frame loop.
const handMatrix = new Matrix4();
const bodyMatrix = new Matrix4();
const offsetMatrix = new Matrix4();
const targetMatrix = new Matrix4();
const pos = new Vector3();
const quat = new Quaternion();
const scale = new Vector3();
const ONE = new Vector3(1, 1, 1);

function poseToMatrix(pose: CameraPose, out: Matrix4): Matrix4 {
  pos.set(pose.position[0], pose.position[1], pose.position[2]);
  quat.set(pose.rotation[0], pose.rotation[1], pose.rotation[2], pose.rotation[3]);
  return out.compose(pos, quat, ONE);
}

function matrixToPose(m: Matrix4): CameraPose {
  m.decompose(pos, quat, scale);
  return { position: [pos.x, pos.y, pos.z], rotation: [quat.x, quat.y, quat.z, quat.w] };
}

/**
 * The camera body. The group's origin is the optical centre, so `runtime.cameraPose` is the lens pose
 * and a recorded take replays exactly. The visible body sits behind the origin (+Z).
 */
export function VirtualCamera({ children }: { children?: ReactNode }) {
  const body = useRef<Group>(null);
  const bodyMesh = useRef<Group>(null);
  const lens = useRef<PerspectiveCamera>(null);
  const wasGrabbed = useRef(false);
  const lensIndex = useSpikeStore((s) => s.lensIndex);

  useEffect(() => {
    const cam = lens.current;
    if (!cam) return;
    cam.fov = vFovDeg(LENSES_MM[lensIndex], FULL_FRAME, FORMAT_21_9);
    cam.aspect = CLIP_ASPECT;
    cam.updateProjectionMatrix();
  }, [lensIndex]);

  useEffect(() => {
    const mesh = bodyMesh.current;
    sceneRefs.lensCamera = lens.current;
    if (mesh) sceneRefs.hideFromLens.add(mesh);
    return () => {
      sceneRefs.lensCamera = null;
      if (mesh) sceneRefs.hideFromLens.delete(mesh);
    };
  }, []);

  useFrame((_state, delta) => {
    const { phase, lastTake, smoothingIndex } = useSpikeStore.getState();
    runtime.flatClock += delta;

    let hand: CameraPose | null;
    if (runtime.inXR) {
      hand = runtime.handPose;
    } else {
      hand = scriptedHandPose(runtime.flatClock); // no headset: the camera flies a scripted orbit
      runtime.grabbed = true;
    }

    if (phase === "replaying" && lastTake) {
      runtime.cameraPose = poseAt(lastTake.move.samples, runtime.phaseClock);
      wasGrabbed.current = false;
    } else if (runtime.grabbed && hand) {
      poseToMatrix(hand, handMatrix);
      if (!wasGrabbed.current) {
        // First frame of a grab: remember where the camera sits relative to the hand, so it does not jump.
        poseToMatrix(runtime.cameraPose, bodyMatrix);
        offsetMatrix.copy(handMatrix).invert().multiply(bodyMatrix);
        if (!runtime.inXR) offsetMatrix.identity(); // flat mode: the scripted pose is the camera pose
      }
      targetMatrix.multiplyMatrices(handMatrix, offsetMatrix);
      runtime.cameraPose = handheld(matrixToPose(targetMatrix), runtime.cameraPose, delta, SMOOTHING_LEVELS[smoothingIndex].value);
      wasGrabbed.current = true;
    } else {
      wasGrabbed.current = false; // released: the camera floats where it was left, like a locked-off tripod
    }

    const group = body.current;
    if (group) {
      const p = runtime.cameraPose;
      group.position.set(p.position[0], p.position[1], p.position[2]);
      group.quaternion.set(p.rotation[0], p.rotation[1], p.rotation[2], p.rotation[3]);
    }
  }, -3);

  return (
    <group ref={body}>
      <group ref={bodyMesh}>
        <mesh position={[0, 0, 0.13]}>
          <boxGeometry args={[0.14, 0.1, 0.18]} />
          <meshStandardMaterial color="#2e3440" />
        </mesh>
        <mesh position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.045, 0.06, 24]} />
          <meshStandardMaterial color="#111318" />
        </mesh>
      </group>
      <perspectiveCamera ref={lens} near={LENS_NEAR_M} far={LENS_FAR_M} />
      {children}
    </group>
  );
}
```

- [ ] **Step 7: Write `src/xr/Viewfinder.tsx`**

```tsx
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { Group, Matrix4, MeshBasicMaterial, Object3D, Quaternion, Vector3, WebGLRenderTarget } from "three";
import {
  BODY_MONITOR_WIDTH_M, CLIP_ASPECT, HAND_MONITOR_WIDTH_M, HUD_MONITOR_WIDTH_M, JITTER_TEST_SEC, LENSES_MM,
  OVERVIEW_CAMERA_POSITION, OVERVIEW_LOOK_AT, VF_MSAA_SAMPLES, VF_RESOLUTIONS,
} from "../constants";
import { runtime } from "../runtime";
import { useSpikeStore } from "../store";
import { createTextCanvas, type TextCanvas } from "../ui/text-canvas";
import { sceneRefs } from "./scene-refs";

const READOUT_PX_W = 512;
const READOUT_PX_H = 48;

// One readout strip shared by every monitor, created on first use (needs the DOM).
let readout: TextCanvas | null = null;
function getReadout(): TextCanvas {
  return (readout ??= createTextCanvas(READOUT_PX_W, READOUT_PX_H, 30));
}

const hide = (o: Object3D) => {
  o.visible = false;
};
const show = (o: Object3D) => {
  o.visible = true;
};

/** Registers an object to be switched off while the lens renders. Use an OUTER group: inner groups keep their own visibility. */
function useHiddenFromLens(ref: RefObject<Object3D | null>): void {
  useEffect(() => {
    const object = ref.current;
    if (!object) return;
    sceneRefs.hideFromLens.add(object);
    return () => {
      sceneRefs.hideFromLens.delete(object);
    };
  }, [ref]);
}

/**
 * Renders the scene through the lens into a texture, once per frame, before the main render.
 * While a VR session is presenting, three.js swaps in the headset's cameras on EVERY render call,
 * so this pass switches `xr.enabled` off, renders, and restores the flag and the previous target.
 */
export function Viewfinder() {
  const vfResIndex = useSpikeStore((s) => s.vfResIndex);
  const origin = useXR((s) => s.origin);
  const readoutClock = useRef(1);
  const lastLabel = useRef("");

  const target = useMemo(() => {
    const [width, height] = VF_RESOLUTIONS[vfResIndex];
    return new WebGLRenderTarget(width, height, { samples: VF_MSAA_SAMPLES });
  }, [vfResIndex]);

  useEffect(() => {
    sceneRefs.viewfinderTexture = target.texture;
    sceneRefs.monitorMaterials.forEach((material) => {
      material.map = target.texture;
      material.needsUpdate = true;
    });
    return () => target.dispose();
  }, [target]);

  useFrame(({ gl, scene }, delta) => {
    const lensCamera = sceneRefs.lensCamera;
    if (!lensCamera) return;

    const previousTarget = gl.getRenderTarget(); // during a session this is three's XR target, not null
    const previousXrEnabled = gl.xr.enabled;
    // Without an <XROrigin> the library reports the scene itself as the origin. Hiding that would blank the lens.
    const xrOrigin = origin && origin !== scene ? origin : null;
    const originWasVisible = xrOrigin ? xrOrigin.visible : false;
    sceneRefs.hideFromLens.forEach(hide); // also prevents sampling the texture we are rendering into
    if (xrOrigin) xrOrigin.visible = false; // controller models and the teleport arc
    gl.xr.enabled = false;
    gl.setRenderTarget(target);
    gl.render(scene, lensCamera);
    gl.setRenderTarget(previousTarget);
    gl.xr.enabled = previousXrEnabled;
    if (xrOrigin) xrOrigin.visible = originWasVisible;
    sceneRefs.hideFromLens.forEach(show);

    // Readout text, ten times a second at most, and only when it changed.
    readoutClock.current += delta;
    if (readoutClock.current < 0.1) return;
    readoutClock.current = 0;
    const { lensIndex, phase } = useSpikeStore.getState();
    const lens = `${LENSES_MM[lensIndex]}mm`;
    const t = runtime.phaseClock;
    let label = lens;
    let color = "#e6e8ec";
    if (phase === "recording") {
      label = `${lens}   REC ${t.toFixed(1)}s`;
      color = "#ff5555";
    } else if (phase === "replaying") {
      label = `${lens}   PLAY ${t.toFixed(1)}s`;
      color = "#8fbcbb";
    } else if (phase === "jitter") {
      label = `${lens}   HOLD STILL ${Math.max(0, JITTER_TEST_SEC - t).toFixed(1)}s`;
      color = "#ebcb8b";
    }
    if (label !== lastLabel.current) {
      lastLabel.current = label;
      getReadout().draw([label], [color]);
    }
  }, -1);

  return null;
}

/** The picture, a white frame line, a centre cross and the readout strip underneath. */
function MonitorFace({ widthM }: { widthM: number }) {
  const material = useRef<MeshBasicMaterial>(null);
  const heightM = widthM / CLIP_ASPECT;
  const stripHeightM = widthM * (READOUT_PX_H / READOUT_PX_W);

  useEffect(() => {
    const m = material.current;
    if (!m) return;
    sceneRefs.monitorMaterials.add(m);
    if (sceneRefs.viewfinderTexture) {
      m.map = sceneRefs.viewfinderTexture;
      m.needsUpdate = true;
    }
    return () => {
      sceneRefs.monitorMaterials.delete(m);
    };
  }, []);

  const frame = useMemo(() => {
    const w = widthM / 2;
    const h = heightM / 2;
    return new Float32Array([-w, -h, 0, w, -h, 0, w, h, 0, -w, h, 0]);
  }, [widthM, heightM]);

  const cross = useMemo(() => {
    const c = widthM * 0.02;
    return new Float32Array([-c, 0, 0, c, 0, 0, 0, -c, 0, 0, c, 0]);
  }, [widthM]);

  return (
    <group>
      <mesh>
        <planeGeometry args={[widthM, heightM]} />
        <meshBasicMaterial ref={material} toneMapped={false} />
      </mesh>
      <lineLoop position={[0, 0, 0.0005]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[frame, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" toneMapped={false} />
      </lineLoop>
      <lineSegments position={[0, 0, 0.0005]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[cross, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" toneMapped={false} />
      </lineSegments>
      <mesh position={[0, -(heightM / 2) - stripHeightM / 2 - 0.004, 0]}>
        <planeGeometry args={[widthM, stripHeightM]} />
        <meshBasicMaterial map={getReadout().texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** On-camera monitor: top rear of the body, tilted 20 degrees up toward the operator. Mount it inside VirtualCamera. */
export function BodyMonitor() {
  const outer = useRef<Group>(null);
  useHiddenFromLens(outer);
  return (
    <group ref={outer} position={[0, 0.11, 0.2]} rotation={[-0.35, 0, 0]}>
      <MonitorFace widthM={BODY_MONITOR_WIDTH_M} />
    </group>
  );
}

/** Left-hand monitor: follows `runtime.leftHandPose`, invisible outside VR. Children sit above the picture. */
export function HandMonitor({ children }: { children?: ReactNode }) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  useHiddenFromLens(outer);
  const heightM = HAND_MONITOR_WIDTH_M / CLIP_ASPECT;

  useFrame(() => {
    const group = outer.current;
    const face = inner.current;
    if (!group || !face) return;
    const pose = runtime.leftHandPose;
    face.visible = runtime.inXR && pose !== null;
    if (!pose) return;
    group.position.set(pose.position[0], pose.position[1], pose.position[2]);
    group.quaternion.set(pose.rotation[0], pose.rotation[1], pose.rotation[2], pose.rotation[3]);
  });

  return (
    <group ref={outer}>
      <group ref={inner} visible={false} position={[0, 0.16, -0.04]} rotation={[-0.5, 0, 0]}>
        <MonitorFace widthM={HAND_MONITOR_WIDTH_M} />
        <group position={[0, heightM / 2 + 0.015, 0]}>{children}</group>
      </group>
    </group>
  );
}

/** Flat-page monitor: parked in the lower right of the overview camera's view, invisible in VR. */
export function HudMonitor({ children }: { children?: ReactNode }) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  useHiddenFromLens(outer);
  const heightM = HUD_MONITOR_WIDTH_M / CLIP_ASPECT;

  const placement = useMemo(() => {
    const eye = new Vector3(OVERVIEW_CAMERA_POSITION[0], OVERVIEW_CAMERA_POSITION[1], OVERVIEW_CAMERA_POSITION[2]);
    const lookAt = new Vector3(OVERVIEW_LOOK_AT[0], OVERVIEW_LOOK_AT[1], OVERVIEW_LOOK_AT[2]);
    const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(eye, lookAt, new Vector3(0, 1, 0)));
    const offset = new Vector3(0.5, -0.42, -1.4).applyQuaternion(quaternion); // right, down, forward of the camera (fits a 4:3 window)
    return { position: eye.add(offset), quaternion };
  }, []);

  useFrame(() => {
    if (inner.current) inner.current.visible = !runtime.inXR;
  });

  return (
    <group ref={outer} position={placement.position} quaternion={placement.quaternion}>
      <group ref={inner}>
        <MonitorFace widthM={HUD_MONITOR_WIDTH_M} />
        <group position={[0, heightM / 2 + 0.015, 0]}>{children}</group>
      </group>
    </group>
  );
}
```

- [ ] **Step 8: Write `src/App.tsx`**

The file carries seven `ANCHOR:` comments, each on its own line: `imports`, `hooks`, `input`, `hand-panel`, `hud-panel`, `logic`, `overlay`. Tasks 10 to 14 insert exact lines directly ABOVE an anchor and leave the anchor in place, so keep them character for character.

```tsx
import { Canvas } from "@react-three/fiber";
import { XR } from "@react-three/xr";
import { STAGE_BACKGROUND } from "@/stage/render/clip-constants";
import { OVERVIEW_CAMERA_POSITION, OVERVIEW_LOOK_AT } from "./constants";
import { StageMount } from "./xr/StageMount";
import { VirtualCamera } from "./xr/VirtualCamera";
import { BodyMonitor, HandMonitor, HudMonitor, Viewfinder } from "./xr/Viewfinder";
import { xrStore } from "./xr/xr-store";
// ANCHOR:imports

const overlayStyle = {
  position: "absolute",
  top: 12,
  left: 12,
  maxWidth: 420,
  padding: "10px 12px",
  background: "rgba(11, 13, 17, 0.82)",
  borderRadius: 8,
  fontSize: 13,
  lineHeight: 1.5,
} as const;

export function App() {
  // ANCHOR:hooks
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas
        flat
        camera={{ position: OVERVIEW_CAMERA_POSITION, fov: 50, near: 0.05, far: 200 }}
        onCreated={({ camera }) => camera.lookAt(OVERVIEW_LOOK_AT[0], OVERVIEW_LOOK_AT[1], OVERVIEW_LOOK_AT[2])}
      >
        <color attach="background" args={[STAGE_BACKGROUND]} />
        <XR store={xrStore}>
          <StageMount />
          {/* ANCHOR:input */}
          <VirtualCamera>
            <BodyMonitor />
          </VirtualCamera>
          <HandMonitor>
            {/* ANCHOR:hand-panel */}
          </HandMonitor>
          <HudMonitor>
            {/* ANCHOR:hud-panel */}
          </HudMonitor>
          {/* ANCHOR:logic */}
          <Viewfinder />
        </XR>
      </Canvas>
      <div style={overlayStyle}>
        <strong>THROWAWAY spike</strong> (exploration): VR camera feel
        {/* ANCHOR:overlay */}
      </div>
    </div>
  );
}
```

`flat` on the Canvas means no tone mapping and sRGB output, the same look as Film Planner's clip exporter.

- [ ] **Step 9: Write `src/main.tsx`**

```tsx
import { createRoot } from "react-dom/client";
import { App } from "./App";

// No StrictMode on purpose: its double-mounted effects fight the module-level singletons of this spike.
const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");
createRoot(root).render(<App />);
```

- [ ] **Step 10: Typecheck and run the tests**

Run: `pnpm typecheck`
Expected: exits 0.

Run: `pnpm test`
Expected: all files pass, 2 skipped in `handheld.test.ts`.

- [ ] **Step 11: Check the page in Chrome and in Safari**

Run: `pnpm dev:http`, then open `http://localhost:5173` in Chrome, then in Safari. In each browser:

1. The set shows on a dark background: floor grid, an orange doll standing on a rug, a table block, a wall block, a column, a ball.
2. A small dark camera body circles the doll, one lap in about 20 seconds.
3. A monitor sits in the lower right. It shows the view through the lens: the doll near the centre of the frame, the background sliding past as the camera orbits. It has a white frame line, a small centre cross, and a strip under it reading `35mm`.
4. The monitor picture does NOT contain the monitor itself or the camera body.
5. The top-left overlay reads "THROWAWAY spike (exploration): VR camera feel".
6. The browser console shows no errors. (In Chrome, messages from the WebXR emulator are fine.)

If the monitor is white or black, the render target is not reaching the material: check `sceneRefs.monitorMaterials` registration in `MonitorFace` and the effect in `Viewfinder`.

- [ ] **Step 12: Commit** (from the repo root)

```bash
git add spikes/vr-camera-feel/src
git commit -F - <<'MSG'
spike: flat scene with the real stage builder, camera body and viewfinder pass

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```


### Task 10: Recorder, debug panel and keyboard controls

**Files:**
- Create: `spikes/vr-camera-feel/src/xr/Recorder.tsx`, `src/xr/DebugPanel.tsx`
- Modify: `spikes/vr-camera-feel/src/App.tsx` (insert above anchors `imports`, `hooks`, `hand-panel`, `hud-panel`, `logic`, `overlay`)

**Interfaces:**
- Consumes: `useSpikeStore`, `runtime` (Task 7); `pushSample`, `sampleCount`, `makeTake`, `serializeTake`, `Take` (Task 3); `measureJitter` (Task 4); `pushFrame`, `resetFpsMeter`, `readFpsMeter` (Task 4); `vFovDeg`, `FULL_FRAME`, `FORMAT_21_9` (Task 2); `HANDHELD_IMPLEMENTED` (Task 6); `createTextCanvas` (Task 9); `POST /takes` (Task 8).
- Produces:
  - `toggleRecording(): void`, `stopRecording(): void`, `startReplay(): void`, `startJitterTest(): void`, component `Recorder`
  - Components `DebugPanel` (logic, renders nothing) and `PanelFace({ widthM }: { widthM: number })` (the textured plane, anchored at its bottom edge)

- [ ] **Step 1: Write `src/xr/Recorder.tsx`**

```tsx
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { pushFrame, readFpsMeter, resetFpsMeter } from "../camera/fps-meter";
import { measureJitter } from "../camera/jitter";
import { makeTake, pushSample, sampleCount, serializeTake, type Take } from "../camera/take";
import { JITTER_TEST_SEC, LENSES_MM, SMOOTHING_LEVELS } from "../constants";
import { runtime } from "../runtime";
import { useSpikeStore } from "../store";

async function saveTake(take: Take): Promise<void> {
  const { setSaveStatus } = useSpikeStore.getState();
  setSaveStatus(`saving take ${take.number}...`); // so a stuck save never reads as the previous take's success
  try {
    const response = await fetch("/takes", { method: "POST", body: serializeTake(take), signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setSaveStatus(`saved take ${take.number} (${take.durationSec.toFixed(1)} s)`);
  } catch (error) {
    // No dev server behind the page (static deploy), or the LAN dropped. The flat page offers a download instead.
    setSaveStatus(`save failed: ${(error as Error).message}`);
  }
}

/** "Cut": closes the take, stores it, and posts it to the dev server. Safe to call when nothing is recording. */
export function stopRecording(): void {
  const store = useSpikeStore.getState();
  if (store.phase !== "recording") return;
  // Freeze the take's frame-rate numbers first. Everything below (building, serializing and posting the take) is
  // bookkeeping, and it must not leak into the measurement the panel shows for question 1.
  const fps = readFpsMeter(runtime.fps);
  runtime.takeFps = { avgFps: fps.avgFps, worstMs: fps.worstMs, frames: fps.frames };
  if (sampleCount(runtime.samples) < 2) {
    runtime.samples = [];
    store.toIdle();
    store.setSaveStatus("nothing recorded");
    return;
  }
  const number = store.takeCounter + 1;
  const take = makeTake({
    id: `take-${number}-${Date.now()}`,
    number,
    createdAt: Date.now(),
    lensMm: LENSES_MM[store.lensIndex],
    smoothing: SMOOTHING_LEVELS[store.smoothingIndex].value,
    samples: runtime.samples,
  });
  runtime.samples = [];
  store.finishRecording(take);
  setTimeout(() => void saveTake(take), 0); // serializing thousands of numbers stays off the XR frame's call stack
}

/** "Action" and "cut" on one control: the right trigger in VR, the R key on the flat page. */
export function toggleRecording(): void {
  const store = useSpikeStore.getState();
  if (store.phase === "recording") {
    stopRecording();
    return;
  }
  if (!store.startRecording()) return;
  runtime.samples = [];
  runtime.phaseClock = 0;
  resetFpsMeter(runtime.fps); // question 1 reads fps over exactly one take
  runtime.takeFps = null;
  pushSample(runtime.samples, 0, runtime.cameraPose);
}

export function startReplay(): void {
  if (useSpikeStore.getState().startReplay()) runtime.phaseClock = 0;
}

export function startJitterTest(): void {
  if (!useSpikeStore.getState().startJitter()) return;
  runtime.samples = [];
  runtime.phaseClock = 0;
}

/** Advances the phase clock, samples the camera while recording or testing, and ends replays. */
export function Recorder() {
  const session = useXR((s) => s.session);
  const hadSession = useRef(false);

  useEffect(() => {
    if (session) {
      hadSession.current = true;
      return;
    }
    if (hadSession.current) {
      hadSession.current = false;
      stopRecording(); // the session ended mid-take (headset off, battery, browser menu): that is a cut
    }
  }, [session]);

  useFrame((_state, delta) => {
    pushFrame(runtime.fps, delta);
    const store = useSpikeStore.getState();
    if (store.phase === "idle") return;
    runtime.phaseClock += delta;

    if (store.phase === "recording") {
      pushSample(runtime.samples, runtime.phaseClock, runtime.cameraPose);
    } else if (store.phase === "jitter") {
      pushSample(runtime.samples, runtime.phaseClock, runtime.cameraPose);
      if (runtime.phaseClock >= JITTER_TEST_SEC) {
        const result = measureJitter(runtime.samples);
        runtime.samples = [];
        store.finishJitter({
          ...result,
          lensMm: LENSES_MM[store.lensIndex],
          smoothingName: SMOOTHING_LEVELS[store.smoothingIndex].name,
        });
      }
    } else if (store.phase === "replaying" && store.lastTake && runtime.phaseClock >= store.lastTake.durationSec) {
      store.toIdle();
    }
  }, -2);

  return null;
}
```

- [ ] **Step 2: Write `src/xr/DebugPanel.tsx`**

```tsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { FORMAT_21_9, FULL_FRAME, vFovDeg } from "../camera/fov";
import { readFpsMeter } from "../camera/fps-meter";
import { HANDHELD_IMPLEMENTED } from "../camera/handheld";
import { LENSES_MM, SMOOTHING_LEVELS, VF_RESOLUTIONS } from "../constants";
import { runtime } from "../runtime";
import { useSpikeStore } from "../store";
import { createTextCanvas, type TextCanvas } from "../ui/text-canvas";

const PANEL_PX_W = 1024;
const PANEL_PX_H = 256;

// One panel texture shared by the hand panel and the flat HUD panel, created on first use (needs the DOM).
let panel: TextCanvas | null = null;
function getPanel(): TextCanvas {
  return (panel ??= createTextCanvas(PANEL_PX_W, PANEL_PX_H, 22));
}

/** The panel as a plane, anchored at its bottom edge so it can sit on top of a monitor. */
export function PanelFace({ widthM }: { widthM: number }) {
  const visible = useSpikeStore((s) => s.panelVisible);
  const heightM = widthM * (PANEL_PX_H / PANEL_PX_W);
  return (
    <mesh visible={visible} position={[0, heightM / 2, 0]}>
      <planeGeometry args={[widthM, heightM]} />
      <meshBasicMaterial map={getPanel().texture} toneMapped={false} />
    </mesh>
  );
}

/** Redraws the panel text four times a second. The numbers Nick reads out for the five questions live here. */
export function DebugPanel() {
  const session = useXR((s) => s.session);
  const sinceDraw = useRef(1);

  useFrame((_state, delta) => {
    sinceDraw.current += delta;
    if (sinceDraw.current < 0.25) return;
    sinceDraw.current = 0;

    const store = useSpikeStore.getState();
    const fps = readFpsMeter(runtime.fps);
    const lensMm = LENSES_MM[store.lensIndex];
    const [vfWidth, vfHeight] = VF_RESOLUTIONS[store.vfResIndex];
    const frameRate = (session as (XRSession & { frameRate?: number }) | undefined)?.frameRate;
    const jitter = store.jitter;

    // While recording, the take's numbers are live. After "cut" they are the frozen reading, untouched by later frames.
    const recording = store.phase === "recording";
    const take = recording ? fps : runtime.takeFps;
    const takeLine = take
      ? `fps 1s ${fps.recentFps.toFixed(1)} | ${recording ? "this take" : "last take"} avg ${take.avgFps.toFixed(1)} | worst ${take.worstMs.toFixed(1)} ms | n ${take.frames}`
      : `fps 1s ${fps.recentFps.toFixed(1)} | no take yet`;

    getPanel().draw([
      takeLine,
      `target ${frameRate ? `${frameRate} Hz` : "n/a (flat page)"} | VF ${vfWidth}x${vfHeight}`,
      `lens ${lensMm} mm | vFOV ${vFovDeg(lensMm, FULL_FRAME, FORMAT_21_9).toFixed(1)} deg | smoothing ${SMOOTHING_LEVELS[store.smoothingIndex].name}`,
      `phase ${store.phase} ${runtime.phaseClock.toFixed(1)} s | grabbed ${runtime.grabbed ? "yes" : "no"} | handheld ${HANDHELD_IMPLEMENTED ? "custom" : "pass-through"}`,
      jitter
        ? `jitter ${jitter.angularRmsDeg.toFixed(3)} deg, ${jitter.positionRmsMm.toFixed(2)} mm rms @ ${jitter.lensMm} mm ${jitter.smoothingName} (n ${jitter.sampleCount})`
        : "jitter: not run yet",
      `take: ${store.saveStatus || `none saved yet (count ${store.takeCounter})`}`,
      `speech: SR ${store.probe.speechRecognition ? "yes" : "no"} | webkitSR ${store.probe.webkitSpeechRecognition ? "yes" : "no"}`,
      `mic: ${store.probe.mic}`,
    ]);
  });

  return null;
}
```

- [ ] **Step 3: Insert into `src/App.tsx`**

Each block goes directly ABOVE the named anchor line. Leave the anchors in place.

Above `// ANCHOR:imports`:

```tsx
import { useEffect, useMemo } from "react";
import { serializeTake } from "./camera/take";
import { useSpikeStore } from "./store";
import { DebugPanel, PanelFace } from "./xr/DebugPanel";
import { Recorder, startJitterTest, startReplay, toggleRecording } from "./xr/Recorder";
```

Above `// ANCHOR:hooks`:

```tsx
  const lastTake = useSpikeStore((s) => s.lastTake);
  const saveStatus = useSpikeStore((s) => s.saveStatus);

  // A download link for the last take: the fallback when no dev server is there to receive the POST.
  const downloadUrl = useMemo(
    () => (lastTake ? URL.createObjectURL(new Blob([serializeTake(lastTake)], { type: "application/json" })) : null),
    [lastTake],
  );
  useEffect(
    () => () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    },
    [downloadUrl],
  );

  // Flat-page controls. They mirror the controller bindings of spec section 4.5.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const store = useSpikeStore.getState();
      const key = event.key.toLowerCase();
      if (key === "r") toggleRecording();
      else if (key === "p") startReplay();
      else if (key === "j") startJitterTest();
      else if (key === "[") store.stepLens(-1);
      else if (key === "]") store.stepLens(1);
      else if (key === "s") store.cycleSmoothing();
      else if (key === "-") store.stepVfRes(-1);
      else if (key === "=") store.stepVfRes(1);
      else if (key === "d") store.togglePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
```

Above `{/* ANCHOR:hand-panel */}`:

```tsx
            <PanelFace widthM={0.4} />
```

Above `{/* ANCHOR:hud-panel */}`:

```tsx
            <PanelFace widthM={0.5} />
```

Above `{/* ANCHOR:logic */}`:

```tsx
          <Recorder />
          <DebugPanel />
```

Above `{/* ANCHOR:overlay */}`:

```tsx
        <div>Keys: R record or stop, P replay, [ and ] lens, S smoothing, - and = viewfinder size, J jitter test, D panel</div>
        <div>{saveStatus}</div>
        {downloadUrl && lastTake && (
          <div>
            <a href={downloadUrl} download={`${lastTake.id}.json`} style={{ color: "#88c0d0" }}>
              Download last take ({lastTake.id})
            </a>
          </div>
        )}
```

- [ ] **Step 4: Typecheck and run the tests**

Run: `pnpm typecheck`
Expected: exits 0.

Run: `pnpm test`
Expected: all files pass, 2 skipped.

- [ ] **Step 5: Check in Chrome and in Safari**

Run: `pnpm dev:http`, open `http://localhost:5173`. In each browser:

1. A text panel sits above the lower-right monitor. Its first line shows `fps 1s` near the display's refresh rate (60 or 120 on a Mac) after a second.
2. Press `]` twice: the panel reads `lens 85 mm | vFOV 10.4 deg`, the monitor strip reads `85mm`, and the monitor picture is visibly tighter on the doll. Press `[` twice to return to 35 mm (`vFOV 24.9 deg`).
3. Press `=`: the panel reads `VF 1280x548`. Press `-` twice: `VF 640x274` and the picture gets softer. Press `=` once to return to `VF 960x412`.
4. Press `R`: the strip turns red and counts `REC 0.0s` upward. While recording, `]` does nothing (lens is locked during a take). Press `R` again after about 5 seconds: the overlay and the panel read `saved take 1 (5.x s)`, and `ls takes/` shows one `take-1-<timestamp>.json`.
5. Press `P`: the strip reads `PLAY`, the camera body jumps back to where the take began and repeats the recorded move, then the scripted orbit resumes.
6. Press `J`: the strip counts `HOLD STILL` down from 10. When it ends the panel shows `jitter ... deg, ... mm rms @ 35 mm off (n ...)`. The numbers are large here because the scripted camera is moving. That is expected on the flat page.
7. Press `S`: `smoothing light`. Press `D`: the panel disappears. Press `D` again: it returns.
8. Click "Download last take": a `take-1-<timestamp>.json` file downloads.
9. No console errors.

- [ ] **Step 6: Commit** (from the repo root)

```bash
git add spikes/vr-camera-feel/src/xr/Recorder.tsx spikes/vr-camera-feel/src/xr/DebugPanel.tsx spikes/vr-camera-feel/src/App.tsx
git commit -F - <<'MSG'
spike: recorder, debug panel and flat-page keyboard controls

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

### Task 11: Replay page

**Files:**
- Create: `spikes/vr-camera-feel/src/replay/ReplayPage.tsx`
- Modify: `spikes/vr-camera-feel/src/main.tsx` (full replacement), `spikes/vr-camera-feel/src/App.tsx` (insert above anchor `overlay`)

**Interfaces:**
- Consumes: `parseTake`, `poseAt`, `Take` (Task 3); `vFovDeg`, `FULL_FRAME`, `FORMAT_21_9` (Task 2); `StageMount` (Task 9); `GET /takes`, `GET /takes/<id>.json` and `type TakeSummary` (Task 8).
- Produces: component `ReplayPage`, shown when `location.hash === "#/replay"`.

This page answers question 4 of the spec: a take made of poses survives the trip to the desk and plays back as the same move.

- [ ] **Step 1: Write `src/replay/ReplayPage.tsx`**

```tsx
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { STAGE_BACKGROUND } from "@/stage/render/clip-constants";
import type { TakeSummary } from "../../takes-plugin";
import { FORMAT_21_9, FULL_FRAME, vFovDeg } from "../camera/fov";
import { parseTake, poseAt, type Take } from "../camera/take";
import { CLIP_ASPECT, LENS_FAR_M, LENS_NEAR_M } from "../constants";
import { StageMount } from "../xr/StageMount";

type RigProps = { take: Take; playing: boolean; restartToken: number; onTime(tSec: number): void };

/** Drives the canvas's own camera through the take: this camera IS the lens, at the take's focal length. */
function LensRig({ take, playing, restartToken, onTime }: RigProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const clock = useRef(0);
  const sinceReport = useRef(1);

  useEffect(() => {
    clock.current = 0;
  }, [take, restartToken]);

  useEffect(() => {
    camera.fov = vFovDeg(take.lensMm, FULL_FRAME, FORMAT_21_9);
    camera.near = LENS_NEAR_M;
    camera.far = LENS_FAR_M;
    camera.updateProjectionMatrix();
  }, [camera, take]);

  useFrame((_state, delta) => {
    if (playing) clock.current = Math.min(take.durationSec, clock.current + delta);
    const pose = poseAt(take.move.samples, clock.current);
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    camera.quaternion.set(pose.rotation[0], pose.rotation[1], pose.rotation[2], pose.rotation[3]);
    sinceReport.current += delta;
    if (sinceReport.current >= 0.2) {
      sinceReport.current = 0;
      onTime(clock.current);
    }
  });

  return null;
}

const linkStyle = { color: "#88c0d0" } as const;
const buttonStyle = { marginRight: 8, padding: "4px 10px" } as const;

export function ReplayPage() {
  const [summaries, setSummaries] = useState<TakeSummary[]>([]);
  const [listNote, setListNote] = useState("loading takes...");
  const [take, setTake] = useState<Take | null>(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(true);
  const [restartToken, setRestartToken] = useState(0);
  const [time, setTime] = useState(0);

  useEffect(() => {
    fetch("/takes")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<TakeSummary[]>;
      })
      .then((list) => {
        setSummaries(list);
        setListNote(list.length === 0 ? "No takes yet. Record one on the main page." : "");
      })
      .catch(() => setListNote("No dev server here to list takes. Load a downloaded take file instead."));
  }, []);

  function show(json: string): void {
    try {
      setTake(parseTake(json));
      setError("");
      setPlaying(true);
      setTime(0);
      setRestartToken((n) => n + 1);
    } catch (e) {
      setTake(null);
      setError((e as Error).message);
    }
  }

  function loadFromServer(id: string): void {
    fetch(`/takes/${id}.json`)
      .then((response) => response.text())
      .then(show)
      .catch((e: Error) => setError(`Could not load ${id}: ${e.message}`));
  }

  function loadFromFile(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) void file.text().then(show);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 18 }}>THROWAWAY spike (exploration): take replay</h1>
      <p>
        <a href="#/" style={linkStyle}>Back to the camera page</a>
      </p>

      <div style={{ marginBottom: 12 }}>
        {summaries.map((s) => (
          <button key={s.id} style={buttonStyle} onClick={() => loadFromServer(s.id)}>
            Take {s.number}: {s.lensMm} mm, {s.durationSec.toFixed(1)} s
          </button>
        ))}
        <span>{listNote}</span>
      </div>

      <label style={{ display: "block", marginBottom: 12 }}>
        Load a take file: <input type="file" accept="application/json,.json" onChange={loadFromFile} />
      </label>

      {error && <p style={{ color: "#ff5555" }}>{error}</p>}

      {take && (
        <>
          <div style={{ width: "100%", aspectRatio: String(CLIP_ASPECT), background: "#000" }}>
            <Canvas flat>
              <color attach="background" args={[STAGE_BACKGROUND]} />
              <StageMount />
              <LensRig take={take} playing={playing} restartToken={restartToken} onTime={setTime} />
            </Canvas>
          </div>
          <p>
            <button style={buttonStyle} onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "Play"}
            </button>
            <button
              style={buttonStyle}
              onClick={() => {
                setRestartToken((n) => n + 1);
                setPlaying(true);
              }}
            >
              Restart
            </button>
            Take {take.number} | {take.lensMm} mm | smoothing {take.rig.smoothing} | {time.toFixed(1)} / {take.durationSec.toFixed(1)} s
          </p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/main.tsx`**

```tsx
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ReplayPage } from "./replay/ReplayPage";

/** Hash routing: no server rewrite needed, so it also works on a static deploy. */
function Root() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return hash === "#/replay" ? <ReplayPage /> : <App />;
}

// No StrictMode on purpose: its double-mounted effects fight the module-level singletons of this spike.
const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");
createRoot(root).render(<Root />);
```

- [ ] **Step 3: Insert the link into `src/App.tsx`**

Above `{/* ANCHOR:overlay */}`:

```tsx
        <div>
          <a href="#/replay" style={{ color: "#88c0d0" }}>
            Open the replay page
          </a>
        </div>
```

- [ ] **Step 4: Typecheck and run the tests**

Run: `pnpm typecheck`
Expected: exits 0.

Run: `pnpm test`
Expected: all files pass, 2 skipped.

- [ ] **Step 5: Check in Chrome and in Safari**

Run: `pnpm dev:http`. In each browser:

1. On `http://localhost:5173` press `]` once (50 mm), press `R`, wait about 6 seconds, press `R`. The overlay reads `saved take <n> (6.x s)`.
2. Click "Open the replay page". The URL ends in `#/replay` and a button reads `Take <n>: 50 mm, 6.x s`.
3. Click that button. A 21:9 picture appears and plays the same orbit segment that was recorded, framed like the monitor showed it at 50 mm. The line under it counts up to the take's duration and stops there.
4. Click "Restart": it plays again from the start. Click "Pause": the picture freezes and the counter stops.
5. Use "Load a take file" with the file downloaded in Task 10: it plays too.
6. Load any non-take JSON file (for example `package.json`): a red line reads `Invalid take: ...` and no picture shows.
7. Click "Back to the camera page": the camera page returns. No console errors.

- [ ] **Step 6: Commit** (from the repo root)

```bash
git add spikes/vr-camera-feel/src/replay spikes/vr-camera-feel/src/main.tsx spikes/vr-camera-feel/src/App.tsx
git commit -F - <<'MSG'
spike: replay page plays a recorded take through the lens at 21:9

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```


### Task 12: XR session: Enter VR, teleport and snap turn

**Files:**
- Create: `spikes/vr-camera-feel/src/xr/Locomotion.tsx`
- Modify: `spikes/vr-camera-feel/src/App.tsx` (insert above anchors `imports`, `hooks`, `input`, `overlay`)

**Interfaces:**
- Consumes: `xrStore`, `NATIVE_WEBXR` (Task 9). From `@react-three/xr`: `XROrigin`, `TeleportTarget`, `useXRControllerLocomotion`.
- Produces: component `Locomotion`. It owns the `XROrigin`, so from this task on `useXR((s) => s.origin)` is defined, and the XR camera and both controllers are parented under that origin.

How the library behaves (verified against `pmndrs/xr` main on 2026-09-18):
- The teleport pointer is driven by the WebXR `select` event pair, which is the trigger. The jump happens on release. `onTeleport` receives a `Vector3` world point.
- `useXRControllerLocomotion(target, translation, rotation, translationControllerHand)` always puts rotation on the hand OPPOSITE to `translationControllerHand`. Passing `"right"` with translation switched off puts snap turn on the LEFT stick, which keeps the right stick free for lens and viewfinder size.

- [ ] **Step 1: Write `src/xr/Locomotion.tsx`**

```tsx
import { useRef, useState } from "react";
import { TeleportTarget, XROrigin, useXRControllerLocomotion } from "@react-three/xr";
import { Vector3, type Group } from "three";

/** The operator's feet. Teleport moves the origin, the left stick snap-turns it. Nothing else moves the view. */
export function Locomotion() {
  const origin = useRef<Group>(null);
  const [position, setPosition] = useState(() => new Vector3(0, 0, 0));

  // translation off, snap rotation 45 degrees, translation hand "right" so that rotation lands on the LEFT stick
  useXRControllerLocomotion(origin, false, { type: "snap", degrees: 45 }, "right");

  return (
    <>
      <XROrigin ref={origin} position={position} />
      <TeleportTarget onTeleport={setPosition}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -3]}>
          <planeGeometry args={[20, 20]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </TeleportTarget>
    </>
  );
}
```

- [ ] **Step 2: Insert into `src/App.tsx`**

Each block goes directly ABOVE the named anchor line.

Above `// ANCHOR:imports`:

```tsx
import { useState } from "react";
import { Locomotion } from "./xr/Locomotion";
import { NATIVE_WEBXR } from "./xr/xr-store";
```

Above `// ANCHOR:hooks`:

```tsx
  const [vrStatus, setVrStatus] = useState("");
```

Above `{/* ANCHOR:input */}`:

```tsx
          <Locomotion />
```

Above `{/* ANCHOR:overlay */}`:

```tsx
        {NATIVE_WEBXR && (
          <div style={{ marginTop: 6 }}>
            <button
              style={{ padding: "6px 14px", fontSize: 14 }}
              onClick={() => {
                xrStore.enterVR().catch((e: Error) => setVrStatus(`VR not available: ${e.message}`));
              }}
            >
              Enter VR
            </button>
            <span> {vrStatus}</span>
          </div>
        )}
```

- [ ] **Step 3: Typecheck and run the tests**

Run: `pnpm typecheck`
Expected: exits 0.

Run: `pnpm test`
Expected: all files pass, 2 skipped.

- [ ] **Step 4: Check the flat page in Chrome and in Safari**

Run: `pnpm dev:http`, open `http://localhost:5173`.

1. Chrome: an "Enter VR" button shows in the overlay. Everything from Task 10 still works (press `R` twice, a take is saved).
2. Safari: there is NO "Enter VR" button. Everything from Task 10 still works. No console errors.

- [ ] **Step 5: Check the session in desktop Chrome through the emulator**

The library injects a Meta Quest 3 emulator on `localhost` when no real headset runtime is present. Its overlay toggles with Cmd + Option + E on a Mac (Win + Alt + E on Windows). The overlay lets you move the headset and both controllers and press their buttons.

1. Click "Enter VR". The canvas switches to the headset's view: you stand at the origin looking at the doll about three metres ahead.
2. The camera body still flies its scripted orbit and the lower-right monitor is still in the world. That is expected in this task. Controller input arrives in Task 13.
3. In the emulator overlay, aim the LEFT controller at the floor a few metres away. Press and release its trigger. A teleport arc shows while the trigger is held, and on release the view jumps to that spot.
4. Push the LEFT thumbstick to the right and let go: the view turns 45 degrees in one step. Push it left: it turns back.
5. Press the RIGHT trigger: nothing teleports (the right controller has no pointers).
6. Leave the session from the emulator overlay (or press Esc). The flat page returns and keeps running.

- [ ] **Step 6: Commit** (from the repo root)

```bash
git add spikes/vr-camera-feel/src/xr/Locomotion.tsx spikes/vr-camera-feel/src/App.tsx
git commit -F - <<'MSG'
spike: XR session with Enter VR, teleport on the left trigger, snap turn on the left stick

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

### Task 13: Controller input: grab, record, lens, replay, jitter

**Files:**
- Create: `spikes/vr-camera-feel/src/xr/ControllerInput.tsx`
- Modify: `spikes/vr-camera-feel/src/App.tsx` (insert above anchors `imports`, `input`)

**Interfaces:**
- Consumes: `runtime`, `useSpikeStore` (Task 7); `createButtonEdge`, `createStickFlick` (Task 5); `toggleRecording`, `startReplay`, `startJitterTest` (Task 10); `GRAB_DISTANCE_M`, `XR_CAMERA_SPAWN` (Task 5); the origin created by `Locomotion` (Task 12). From `@react-three/xr`: `useXR`, `useXRInputSourceState`.
- Produces: component `ControllerInput`. Every frame in VR it writes `runtime.inXR`, `runtime.handPose`, `runtime.leftHandPose`, `runtime.grabbed`, and fires store actions from button edges. The file carries three `ANCHOR:` comments for Task 14.

Library facts used here:
- `useXRInputSourceState("controller", "right" | "left")` returns `undefined` or a state with `inputSource: XRInputSource` and `gamepad`, a record of components. A component is `{ state: "default" | "touched" | "pressed"; button?: number; xAxis?: number; yAxis?: number }`.
- Component ids on Quest Touch controllers: both hands `xr-standard-trigger`, `xr-standard-squeeze`, `xr-standard-thumbstick`; right hand `a-button`, `b-button`; left hand `x-button`, `y-button`.
- `useFrame`'s third argument is the `XRFrame`. The XR camera and the controllers live under the origin object, so a grip's world matrix is `origin.matrixWorld x frame.getPose(gripSpace, referenceSpace)`. This path uses only WebXR and three.js, so it keeps working if the library's component API moves.
- Pushing a thumbstick away from you gives a NEGATIVE `yAxis` in WebXR.

- [ ] **Step 1: Write `src/xr/ControllerInput.tsx`**

```tsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useXR, useXRInputSourceState } from "@react-three/xr";
import { Matrix4, Quaternion, Vector3, type Object3D } from "three";
import type { CameraPose } from "../camera/pose";
import { GRAB_DISTANCE_M, XR_CAMERA_SPAWN } from "../constants";
import { createButtonEdge, createStickFlick } from "../input/edges";
import { runtime } from "../runtime";
import { useSpikeStore } from "../store";
import { startJitterTest, startReplay, toggleRecording } from "./Recorder";
// ANCHOR:imports

type PadComponent = { state: "default" | "touched" | "pressed"; button?: number; xAxis?: number; yAxis?: number };
type ControllerLike = { inputSource: XRInputSource; gamepad: Record<string, PadComponent | undefined> } | undefined;

const scratchMatrix = new Matrix4();
const scratchPosition = new Vector3();
const scratchQuaternion = new Quaternion();
const scratchScale = new Vector3();

function pressed(controller: ControllerLike, id: string): boolean {
  return controller?.gamepad[id]?.state === "pressed";
}

/** World pose of a controller's grip, or null when any piece of the chain is missing this frame. */
function gripWorldPose(
  frame: XRFrame | undefined,
  referenceSpace: XRReferenceSpace | null,
  controller: ControllerLike,
  origin: Object3D | undefined,
): CameraPose | null {
  const gripSpace = controller?.inputSource.gripSpace;
  if (!frame || !referenceSpace || !gripSpace || !origin) return null;
  const pose = frame.getPose(gripSpace, referenceSpace);
  if (!pose) return null;
  scratchMatrix.fromArray(pose.transform.matrix).premultiply(origin.matrixWorld); // world = origin x local
  scratchMatrix.decompose(scratchPosition, scratchQuaternion, scratchScale);
  return {
    position: [scratchPosition.x, scratchPosition.y, scratchPosition.z],
    rotation: [scratchQuaternion.x, scratchQuaternion.y, scratchQuaternion.z, scratchQuaternion.w],
  };
}

export function ControllerInput() {
  const right = useXRInputSourceState("controller", "right");
  const left = useXRInputSourceState("controller", "left");
  const origin = useXR((s) => s.origin);
  const mode = useXR((s) => s.mode);
  const wasInXR = useRef(false);

  const edges = useMemo(
    () => ({
      trigger: createButtonEdge(),
      a: createButtonEdge(),
      b: createButtonEdge(),
      x: createButtonEdge(),
      y: createButtonEdge(),
      lens: createStickFlick(),
      viewfinderSize: createStickFlick(),
      // ANCHOR:edges
    }),
    [],
  );

  useFrame((state, _delta, frame) => {
    const inXR = mode === "immersive-vr";
    runtime.inXR = inXR;
    if (!inXR) {
      wasInXR.current = false;
      runtime.handPose = null;
      runtime.leftHandPose = null;
      return; // VirtualCamera runs the scripted path and owns `grabbed` on the flat page
    }

    if (!wasInXR.current) {
      // Session start: park the camera within reach, looking at the doll, and let go of it.
      wasInXR.current = true;
      runtime.grabbed = false;
      runtime.cameraPose = { position: [XR_CAMERA_SPAWN[0], XR_CAMERA_SPAWN[1], XR_CAMERA_SPAWN[2]], rotation: [0, 0, 0, 1] };
    }

    const referenceSpace = state.gl.xr.getReferenceSpace();
    runtime.handPose = gripWorldPose(frame, referenceSpace, right, origin);
    runtime.leftHandPose = gripWorldPose(frame, referenceSpace, left, origin);

    // Grab: squeeze while the hand is on the camera. Once grabbed it stays grabbed until the squeeze ends.
    const squeezing = pressed(right, "xr-standard-squeeze");
    if (!squeezing || !runtime.handPose) {
      runtime.grabbed = false;
    } else if (!runtime.grabbed) {
      const h = runtime.handPose.position;
      const c = runtime.cameraPose.position;
      runtime.grabbed = Math.hypot(h[0] - c[0], h[1] - c[1], h[2] - c[2]) < GRAB_DISTANCE_M;
    }

    const store = useSpikeStore.getState();
    if (edges.trigger(pressed(right, "xr-standard-trigger"))) toggleRecording();

    const stick = right?.gamepad["xr-standard-thumbstick"];
    const lensStep = edges.lens(stick?.xAxis ?? 0);
    if (lensStep !== 0) store.stepLens(lensStep);
    const sizeStep = edges.viewfinderSize(-(stick?.yAxis ?? 0)); // stick away from you is negative yAxis
    if (sizeStep !== 0) store.stepVfRes(sizeStep);

    if (edges.a(pressed(right, "a-button"))) startReplay();
    if (edges.b(pressed(right, "b-button"))) startJitterTest();
    if (edges.x(pressed(left, "x-button"))) store.cycleSmoothing();
    if (edges.y(pressed(left, "y-button"))) store.togglePanel();
    // The left trigger and the left stick belong to the library: teleport and snap turn. They are not read here.
    // ANCHOR:left-hand
  }, -4);

  return null;
}
```

- [ ] **Step 2: Insert into `src/App.tsx`**

Above `// ANCHOR:imports`:

```tsx
import { ControllerInput } from "./xr/ControllerInput";
```

Above `{/* ANCHOR:input */}` (so it sits after `<Locomotion />`):

```tsx
          <ControllerInput />
```

- [ ] **Step 3: Typecheck and run the tests**

Run: `pnpm typecheck`
Expected: exits 0. If TypeScript rejects passing `right` or `left` as a `ControllerLike`, the library's state type has drifted: compare it with the two fields used here (`inputSource`, `gamepad`) and adjust the local `ControllerLike` type only.

Run: `pnpm test`
Expected: all files pass, 2 skipped.

- [ ] **Step 4: Check the flat page in Chrome and in Safari**

Run: `pnpm dev:http`, open `http://localhost:5173` in both. The camera still orbits, `R`, `P`, `J`, `[`, `]` still work, and the console is clean. (Outside VR this component only clears the hand poses.)

- [ ] **Step 5: Check every control in desktop Chrome through the emulator**

Enter VR, open the emulator overlay (Cmd + Option + E).

1. The lower-right flat monitor is gone. The camera body floats still, a little right of centre and about 0.6 m ahead. The panel reads `grabbed no`.
2. A monitor with the text panel above it follows the LEFT controller.
3. Move the RIGHT controller onto the camera body and hold its squeeze (grip) button: the panel reads `grabbed yes`. Move the controller: the camera follows without jumping, and both monitors show the lens view changing. Release squeeze: the camera stays where you left it.
4. Squeeze with the right controller more than 0.25 m away from the camera: `grabbed` stays `no`.
5. Right trigger: the strip under the picture turns red and counts `REC`. Right trigger again: the panel reads `saved take <n> (...)` and `ls takes/` shows the new file.
6. Right thumbstick flick right: `lens 50 mm`. Flick left: `lens 35 mm`. Flick up: `VF 1280x548`. Flick down: `VF 960x412`. One flick gives one step, even if the stick is held.
7. A button: the camera replays the last take, the strip reads `PLAY`, then the camera stops at the take's last pose.
8. B button: `HOLD STILL` counts down from 10, then the panel shows a jitter line. With the emulator's perfectly still controller the numbers are near zero.
9. Left X: smoothing cycles off, light, medium, heavy. Left Y: the panel hides and returns.
10. Left trigger still teleports. Left stick still snap-turns. After a teleport the camera can still be grabbed where it floats.
11. Start recording with the right trigger, then leave the session from the emulator while `REC` is counting. Back on the flat page the overlay reads `saved take <n+1> (...)`: a session that ends mid-take counts as a cut.

- [ ] **Step 6: Commit** (from the repo root)

```bash
git add spikes/vr-camera-feel/src/xr/ControllerInput.tsx spikes/vr-camera-feel/src/App.tsx
git commit -F - <<'MSG'
spike: Quest controller input, grab, record, lens, replay, jitter test

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

### Task 14: Speech and microphone probe

**Files:**
- Create: `spikes/vr-camera-feel/src/xr/probe.ts`
- Test: `spikes/vr-camera-feel/src/xr/probe.test.ts`
- Modify: `spikes/vr-camera-feel/src/xr/ControllerInput.tsx` (insert above its three anchors), `spikes/vr-camera-feel/src/App.tsx` (insert above anchors `imports`, `hooks`, `overlay`)

**Interfaces:**
- Consumes: `useSpikeStore` (`setProbe`), `runtime.inXR` (Task 7); `createButtonEdge` (Task 5).
- Produces: `detectSpeechApis(win: object): { speechRecognition: boolean; webkitSpeechRecognition: boolean }`, `runMicProbe(): Promise<void>`.

This is a report-only probe. It tells the V4 spec whether the Quest browser exposes speech recognition and whether it grants the microphone while a VR session is running. It adds no voice feature.

- [ ] **Step 1: Write the failing test `src/xr/probe.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { detectSpeechApis } from "./probe";

describe("detectSpeechApis", () => {
  it("reports both APIs missing on a bare object", () => {
    expect(detectSpeechApis({})).toEqual({ speechRecognition: false, webkitSpeechRecognition: false });
  });

  it("detects the standard name", () => {
    expect(detectSpeechApis({ SpeechRecognition: class {} })).toEqual({ speechRecognition: true, webkitSpeechRecognition: false });
  });

  it("detects the webkit-prefixed name", () => {
    expect(detectSpeechApis({ webkitSpeechRecognition: class {} })).toEqual({ speechRecognition: false, webkitSpeechRecognition: true });
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm vitest run src/xr/probe.test.ts`
Expected: FAIL, cannot resolve `./probe`.

- [ ] **Step 3: Write `src/xr/probe.ts`**

```ts
import { runtime } from "../runtime";
import { useSpikeStore } from "../store";

/** Which speech-recognition constructors the browser exposes. `win` is `window` in the app and a fake in tests. */
export function detectSpeechApis(win: object): { speechRecognition: boolean; webkitSpeechRecognition: boolean } {
  return {
    speechRecognition: "SpeechRecognition" in win,
    webkitSpeechRecognition: "webkitSpeechRecognition" in win,
  };
}

/** Asks for the microphone once and records what happened, tagged with where it was asked from. */
export async function runMicProbe(): Promise<void> {
  const { setProbe } = useSpikeStore.getState();
  const where = runtime.inXR ? "in VR" : "flat";
  if (!navigator.mediaDevices?.getUserMedia) {
    setProbe({ mic: `unavailable (${where})` });
    return;
  }
  setProbe({ mic: `asking (${where})` });
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop()); // the probe only wants the answer
    setProbe({ mic: `granted (${where})` });
  } catch (error) {
    setProbe({ mic: `denied: ${(error as Error).name} (${where})` });
  }
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `pnpm vitest run src/xr/probe.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Insert into `src/xr/ControllerInput.tsx`**

Above `// ANCHOR:imports`:

```tsx
import { runMicProbe } from "./probe";
```

Above `// ANCHOR:edges`:

```tsx
      leftSqueeze: createButtonEdge(),
```

Above `// ANCHOR:left-hand`:

```tsx
    if (edges.leftSqueeze(pressed(left, "xr-standard-squeeze"))) void runMicProbe();
```

- [ ] **Step 6: Insert into `src/App.tsx`**

Above `// ANCHOR:imports`:

```tsx
import { detectSpeechApis, runMicProbe } from "./xr/probe";
```

Above `// ANCHOR:hooks`:

```tsx
  // Probe for the V4 spec: which speech APIs exist, and (on M or the left grip) whether the mic is granted.
  useEffect(() => {
    useSpikeStore.getState().setProbe(detectSpeechApis(window));
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "m") void runMicProbe();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
```

Above `{/* ANCHOR:overlay */}`:

```tsx
        <div>M asks for the microphone (probe only)</div>
```

- [ ] **Step 7: Typecheck and run the tests**

Run: `pnpm typecheck`
Expected: exits 0.

Run: `pnpm test`
Expected: all files pass, 2 skipped.

- [ ] **Step 8: Check in Chrome, in Safari and in the emulator**

Run: `pnpm dev:http`, open `http://localhost:5173`.

1. Chrome and Safari: the panel's last two lines read `speech: SR <yes|no> | webkitSR <yes|no>` and `mic: untested`. Write down what each browser reports.
2. Press `M`. The browser asks for the microphone. Allow it: the panel reads `mic: granted (flat)`. In the other browser deny it: `mic: denied: NotAllowedError (flat)`.
3. Chrome, in VR through the emulator: press the LEFT squeeze button. The panel reads `mic: granted (in VR)` (permission was already given in step 2).

- [ ] **Step 9: Commit** (from the repo root)

```bash
git add spikes/vr-camera-feel/src/xr/probe.ts spikes/vr-camera-feel/src/xr/probe.test.ts spikes/vr-camera-feel/src/xr/ControllerInput.tsx spikes/vr-camera-feel/src/App.tsx
git commit -F - <<'MSG'
spike: speech API detection and mic probe on the left grip

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```


### Task 15: README, final verification, hand-over

**Files:**
- Modify: `spikes/vr-camera-feel/README.md` (full replacement)

**Interfaces:**
- Consumes: everything built in Tasks 1 to 14.
- Produces: the run instructions, the three dev loops, the controls, and the one-page headset checklist Nick works from.

- [ ] **Step 1: Replace `README.md`**

````markdown
# THROWAWAY: VR camera feel spike

> **Status:** exploration. Throwaway code. This branch is never merged.
> Spec: `docs/superpowers/specs/2026-09-18-vr-operator-design.md`, section 4.

A WebXR page that answers five questions about holding a virtual film camera in a Quest:
frame rate, steadiness, viewfinder legibility, takes stored as poses, and the dev loop.
The answers go into section 4.10 of the spec. The code stays here.

## Provenance

`src/stage/` is copied as-is from `weeeha/Film-Planner-` at commit `58987e2`
(`film-planner/src/stage/`). Do not edit those files here.

The camera uses `src/camera/fov.ts`, which derives the field of view from sensor, format and lens.
"85 mm" here means a real 85 mm on full frame, cropped to 21:9.

## Run

    pnpm install
    pnpm test
    pnpm dev:http     # http://localhost:5173 on this Mac (flat page, emulator in Chrome)
    pnpm dev          # https on the LAN, for the headset

Flat page: `/`. Replay page: `/#/replay`.

## Getting it onto the headset

WebXR needs a secure context, and on the Quest `localhost` means the Quest itself.

1. **Wi-Fi, HTTPS (first choice).** Mac and Quest on the same network. Run `pnpm dev`. Vite prints a
   `Network: https://<mac-ip>:5173/` line. Open that URL in the Quest browser. It warns about the
   self-signed certificate: choose Advanced, then Proceed. Takes you record are saved into `takes/` on the Mac.
2. **USB, adb (fallback).** Quest in developer mode, cable connected, then:

       adb devices
       adb reverse tcp:5173 tcp:5173
       pnpm dev:http

   Open `http://localhost:5173` in the Quest browser. The port is forwarded to the Mac, and localhost counts as secure.
3. **Vercel preview (only after Nick says yes).** A static build as its own Vercel project, preview only,
   labeled exploration. No dev server runs there, so takes are not saved: use "Download last take" on the
   flat page and load the file on the replay page.

## Controls in the headset

| Input | Action |
| --- | --- |
| Right grip | Grab the camera when the hand is within 0.25 m of it. Release and it floats in place. |
| Right trigger | Start and stop recording. |
| Right stick left / right | Previous / next lens: 18, 24, 35, 50, 85, 135 mm. |
| Right stick up / down | Viewfinder size up / down: 640x274, 960x412, 1280x548. |
| A | Replay the last take. |
| B | Run the 10 s jitter test. |
| Left trigger | Teleport: aim the arc, release to jump. |
| Left stick left / right | Snap turn, 45 degrees. |
| Left hand | Holds the second monitor, with the debug panel above it. |
| Left grip | Mic probe: asks for the microphone while the session runs. |
| X | Cycle smoothing: off, light, medium, heavy. |
| Y | Show or hide the debug panel. |

Flat-page keys: `R` record or stop, `P` replay, `[` `]` lens, `S` smoothing, `-` `=` viewfinder size,
`J` jitter test, `D` panel, `M` mic probe.

## Headset checklist

Work top to bottom. It takes about 20 minutes. Write the results into the table at the end.

Before the timed questions: clear the headset's boundary (Guardian) prompt, enter VR, and spend ten seconds on
locomotion, which no desktop check has exercised yet: aim the LEFT trigger's arc at the floor and release to
teleport, then flick the LEFT stick to snap-turn. During a jitter test, or a take you mean to keep, keep your left
hand off the stick and the trigger: a teleport or a turn is recorded faithfully and ruins that trial.

If the panel says `handheld pass-through`, the smoothing levels do nothing yet. Write the body of
`src/camera/handheld.ts` first (about ten lines, trade-offs are in the file), or ask for the reference version.

**Question 5, dev loop (do this first, it is how you get in).** Which loop got the page onto the headset:
Wi-Fi HTTPS, adb, or Vercel? Change a colour in `src/spike-scene.ts`, save, reload the page in the headset:
how many seconds from saving to seeing it?

**Question 1, frame rate.** Enter VR. Line 2 of the panel shows `target NN Hz`. Grab the camera, pull the right
trigger, operate for 30 seconds (the strip under the picture counts), pull the trigger again. Read line 1:
`last take avg` and `worst`. Those two numbers are frozen at the cut, so saving the take cannot disturb them.
It passes when `last take avg` is within 1 of the target and `worst` stays under twice the frame budget
(2 x 1000 / target: 27.8 ms at 72 Hz, 22.2 ms at 90 Hz, 16.7 ms at 120 Hz). Do it once per viewfinder size.
Change the size between takes (right stick up and down): it is locked while a take or a test is running.
Write down the largest size that passes.

**Question 2, steadiness.** Flick the lens to 85 mm. Frame the doll's head and shoulders. For each smoothing
level (X cycles them): press B, hold as still as you can until the countdown ends, write down the jitter line.
Then judge the picture itself: at which level does an 85 mm hold read as handheld footage instead of an
earthquake? Repeat once at 50 mm. It passes when at least one level is usable at 85 mm.

**Question 3, legibility.** Hold the camera at chest height. On the monitor on the camera body: can you judge
headroom and see what sits at the frame edges? Same question for the monitor in your left hand.
Which one would you keep? Does a larger viewfinder size change the answer?

**Question 4, takes as poses.** Record a 10 second take with a clear move: walk in on the doll, then pan to the
column. Take the headset off. On the Mac open `/#/replay`, click the take. Is it the move you made, from start
to end, on the same lens?

**Probe, speech and microphone.** Read the last two panel lines: which speech APIs exist? In VR press the LEFT
grip: does a permission prompt appear, does the session survive it, and what does the `mic:` line say afterwards?

| # | Question | Result | Notes |
| --- | --- | --- | --- |
| 1 | Frame rate: largest passing viewfinder size, avg fps, worst ms | | |
| 2 | Steadiness: usable smoothing level at 85 mm, its jitter numbers | | |
| 3 | Legibility: monitor you would keep, and its size | | |
| 4 | Takes as poses: replay matches the move (yes / no) | | |
| 5 | Dev loop: which loop, seconds per iteration | | |
| P | Probe: speech APIs, mic inside the session | | |
````

- [ ] **Step 2: Final verification, automated part**

Run: `pnpm test`
Expected: every file passes. `handheld.test.ts` shows 2 skipped, or 0 skipped if Nick has written the body.

Run: `pnpm typecheck`
Expected: exits 0.

Run: `pnpm build`
Expected: finishes with a `dist/` folder and no errors. (A warning about chunk size is fine.)

- [ ] **Step 3: Final verification, flat page in Chrome and in Safari**

Run: `pnpm dev:http`, open `http://localhost:5173` in each browser.

1. The set, the orbiting camera body, the lower-right monitor with frame line, cross and `35mm` strip, and the text panel above it all show.
2. `]` tightens the picture and updates the panel. `R` twice saves a take (`ls takes/`). `P` replays it. `J` reports jitter.
3. `/#/replay` lists the take and plays it at 21:9.
4. Chrome shows "Enter VR". Safari does not.
5. The console is free of errors in both.

- [ ] **Step 4: Final verification, VR in desktop Chrome through the emulator**

Enter VR and run items 1 to 11 of Task 13 Step 5 once more, plus item 3 of Task 14 Step 8. Every item behaves as written there.

- [ ] **Step 5: Final verification, the HTTPS loop on the Mac**

Stop the http server. Run: `pnpm dev`
Expected: Vite prints a `Local: https://localhost:5173/` line and a `Network: https://<mac-ip>:5173/` line. Open the Local URL in Chrome, accept the certificate warning, and see the page load. Copy the Network URL for Nick.

- [ ] **Step 6: Commit** (from the repo root)

```bash
git add spikes/vr-camera-feel/README.md
git commit -F - <<'MSG'
spike: README with dev loops, controls and the headset checklist

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

- [ ] **Step 7: STOP and hand over to Nick**

Do not push. Do not deploy. Tell Nick, in this order:

1. What was verified and how: test counts, typecheck, build, Chrome, Safari, emulator items. Say plainly that nothing was checked in a real headset.
2. The two URLs: `http://localhost:5173` for the Mac, and the `Network: https://<mac-ip>:5173/` URL for the Quest.
3. That `handheld.ts` is still his to write, if it is.
4. Two questions, as numbered options: (1) push branch `spike/vr-camera-feel` to `github.com/weeeha/scene-builder-3d` (no PR, never merged)? (2) also make a Vercel preview as its own project, preview only, labeled exploration?

Push or deploy only what he approves.

### Task 16: Findings after Nick's headset run

**This task depends on a human.** It starts only after Nick has run the checklist in the headset and reported his results. Until then it stays open.

**Files:**
- Modify: `docs/superpowers/specs/2026-09-18-vr-operator-design.md` (section 4.10, on branch `claude/vr-scene-preview-camera-eb380b`)

**Interfaces:**
- Consumes: Nick's filled-in results table from the README checklist.
- Produces: the findings in the spec, and a go or no-go line per spec section 4.9.

- [ ] **Step 1: Switch to the spec branch** (from the repo root)

```bash
git switch claude/vr-scene-preview-camera-eb380b
```

If that branch is checked out in another worktree, do the edit there instead of switching.

- [ ] **Step 2: Fill in section 4.10**

Replace each `pending` cell in the table of section 4.10 with Nick's result, in his words and numbers. Put conditions and surprises in the Notes column. Format of a filled row, for shape only:

```markdown
| 1 | Frame rate | pass at 960x412, fail at 1280x548 | 72 Hz target. avg 71.9, worst 19.4 ms at 960x412. avg 64.2 at 1280x548. |
```

Do not invent or round away anything Nick did not report. If a question was not tested, write `not tested` and why.

- [ ] **Step 3: Add the verdict under the table**

One paragraph headed `**Verdict (YYYY-MM-DD):**` with the actual date. Apply the rule of spec section 4.9: it is no-go if the browser could not hold the refresh rate even at 640x274, or if a 50 mm handheld frame was unusable at every smoothing level. Otherwise it is go. State which, state the viewfinder size and smoothing level the V specs should start from, and state what the probe means for V4 (browser speech recognition, an on-device keyword model, or trigger only).

- [ ] **Step 4: Commit** (from the repo root)

```bash
git add docs/superpowers/specs/2026-09-18-vr-operator-design.md
git commit -F - <<'MSG'
Spec: record the VR camera feel spike findings and verdict

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

- [ ] **Step 5: Report to Nick**

Give him the verdict in two sentences and the next step from spec section 3: the suite spec (S) with the camera model (F) designed in. If the verdict is no-go, say that the platform decision reopens before any V spec is written.

---

## Appendix: reference implementation of `handheld()`

Use only if Nick says so (Task 6, Step 6). It is a time-based exponential filter: the same strength on position and rotation, no roll damping. Full file:

```ts
import { lerpVec3, slerpQuat, type CameraPose } from "./pose";

/** Flip to true in the same commit that gives handheld() a real body. It switches on the last two property tests. */
export const HANDHELD_IMPLEMENTED = true;

/** Time constant of the filter at smoothing = 1, in seconds. */
const MAX_TAU_SEC = 0.35;

/**
 * The handheld rig: how the camera follows the operator's hand.
 * A one-pole low-pass filter blended by TIME, so it feels the same at 72 Hz and 90 Hz:
 * alpha = 1 - exp(-dt / tau), with tau growing with `smoothing`.
 */
export function handheld(hand: CameraPose, previous: CameraPose, dtSec: number, smoothing: number): CameraPose {
  if (smoothing <= 0) return hand;
  const tau = smoothing * MAX_TAU_SEC;
  const alpha = 1 - Math.exp(-dtSec / tau);
  return {
    position: lerpVec3(previous.position, hand.position, alpha),
    rotation: slerpQuat(previous.rotation, hand.rotation, alpha),
  };
}
```

Expected with this body: `pnpm vitest run src/camera/handheld.test.ts` reports 6 passed, 0 skipped.
