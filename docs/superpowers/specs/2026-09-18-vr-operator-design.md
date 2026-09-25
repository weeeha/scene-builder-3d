# VR operator mode: concept and spike design

> **Status:** exploration · **Stage:** design approved in chat 2026-09-18, written review pending
> **Builds approved by this document:** the spike in section 4, nothing else.
> Anything published from this work starts unlisted and is labeled `exploration`.

## TL;DR

- A VR mode for scene-builder-3d. You put on a Quest, pick a shot, stand in the set at 1:1, take the shot's camera in your hand, change lens, body and rig, call "action", film a take, call "cut". The take lands on that shot in the suite.
- It runs in the headset's browser through WebXR, inside the same app as the flat editor: one scene format, one renderer, one lens function. Scene, shot, camera and take stay plain versioned JSON, so a native client remains possible later.
- A take stores timed camera poses. The clip is rendered afterwards on the desktop by the deterministic exporter, so the headset never captures video.
- The work is cut into pieces: suite skeleton (S), camera model v2 (F), then Scout (V1), Operate handheld (V2), Rigs (V3), Director's calls (V4). Each gets its own spec, plan and PR.
- First build: a throwaway headset spike that answers five questions about feel and feasibility.

## 1. What it is

A camera operator's seat inside the previs suite. It feels like a game (you hold a camera, you hear "action", you film) and it has a professional purpose: finding frames and moves with your body, on rigs that behave like real ones, so the move you previs is a move a crew can repeat.

The loop:

1. Open a scene in the headset. Its shot list comes along.
2. Pick a shot. You stand in the set at true scale. The shot's camera sits where it was framed, and a viewfinder monitor shows its view.
3. Take the camera. Move it, reframe, change lens, body, format or rig.
4. Say "action" or pull the trigger. The scene plays and the camera move is recorded.
5. Say "cut" or pull the trigger again. The take is saved to the shot and selected.
6. Back at the desk, the flat editor plays the take and the exporter renders it.

Target hardware: Meta Quest (2, 3, 3S or Pro) with controllers, in the Meta Quest Browser. **Assumption to confirm in review:** the headset is a Quest. It was inferred from the VR Museum project.

## 2. Decisions

| # | Question | Choice | Why |
| --- | --- | --- | --- |
| 1 | What "saying actions" means | Director's calls. "Action" starts playback and recording, "cut" stops both. | A small addition on top of recording. Voice-directed blocking would be its own project. |
| 2 | What "type of camera" means | Lens, rig, and body with format. All three. | Nick's call. Body and format change the domain layer, so they land in F. |
| 3 | Platform | WebXR mode inside the suite. Scene contract kept as plain versioned JSON. | Headset, editor and export share one camera function, so the viewfinder shows the frame the export produces. One store, no sync service. A native client can read the same JSON if the browser hits a ceiling. |
| 4 | Order | Headset spike, then the suite spec, then V1 to V4. | Feel is the one risk a spec can't settle, and testing it needs nothing from the suite. |
| 5 | What a take stores | Timed camera poses. | VR has to hold the headset's refresh rate. Export is offline and deterministic. Keeping them apart removes in-headset video capture. |

Considered and set aside: a native Quest app in Unity (like VR Museum). It offers more rendering headroom and Meta's Voice SDK. It also means a second renderer that must agree with the first on FOV, aspect and poses, an export and sync path, and a build-and-sideload loop. The tested TypeScript stage layer could not be ported with its tests, which breaks this repo's "port, do not re-invent" rule. It remains the fallback if the spike fails (section 4.9).

## 3. Pieces and order

| # | Piece | What you can do when it is done | Needs |
| --- | --- | --- | --- |
| S | Suite walking skeleton (decided in the README) | Scene page, shot page, stage, shot strip in the browser | nothing |
| F | Camera model v2, in the domain layer | Bodies and formats, recorded camera paths, takes per shot with one selected | S |
| V1 | Scout | Enter VR from a shot, stand in the set at 1:1, move around, jump between shots, see each shot's frame on a viewfinder monitor. Read-only | S |
| V2 | Operate, handheld | Grab the camera, swap lens and body, set start and end framing by hand, record a handheld take | V1, F |
| V3 | Rigs | Tripod, dolly, crane, drone | V2 |
| V4 | Director's calls | "Action" and "cut" by voice, take numbering | V2, and a timeline in the suite so there is something to play |

Piece F is merged into **M3 Camera and motion**. V1 to V4 are **M5 to M8** in
[`docs/roadmap.md`](../../roadmap.md), each with its own spec file:
[M5 VR Scout](2026-09-25-vr-scout-design.md),
[M6 VR Operate handheld](2026-09-25-vr-operate-design.md),
[M7 VR Rigs](2026-09-25-vr-rigs-design.md),
[M8 VR Director's calls](2026-09-25-vr-directors-calls-design.md).

Sequence: spike → findings written into section 4.10 → suite spec S with F designed in (its own brainstorm) → V1, V2, V3, V4.

Two notes on dependencies:

- V1 is small once S exists. The stage is authored in meters (`DOLL` in `poses.ts` stands about 1.75 m) and WebXR treats one three.js unit as one meter, so the set appears at true scale with no conversion. `@react-three/xr` wraps the scene graph the flat page already renders.
- V4 needs character movement over time. In the stage layer today a character holds one static pose per shot. Until the timeline and pose spans from Scene Builder v2 land in the suite, "action" plays a still set.

## 4. The spike: VR camera feel

Throwaway code. Its output is answers.

### 4.1 Questions and pass criteria

| # | Question | How it is measured | Pass |
| --- | --- | --- | --- |
| 1 | Frame rate. Does the Quest browser hold its refresh rate while also rendering the viewfinder? | Debug panel in the headset: average fps and worst frame time over a 30 s handheld take. Viewfinder resolution steps: 640×274, 960×412, 1280×548. | Average fps equals the headset refresh rate (72 or 90) and the worst frame stays under twice the frame budget, at 960×412 or higher. Record the highest resolution that passes. |
| 2 | Steadiness. Is a handheld frame usable on long lenses? | Smoothing levels off, light, medium, heavy. A "hold still for 10 s" test at 85 mm reports RMS angular jitter in degrees and RMS position jitter in mm. | At some smoothing level an 85 mm static hold reads as handheld footage to Nick. Record that level and its jitter numbers as the reference. |
| 3 | Legibility. Can framing be judged on the viewfinder? | The same picture on two monitors: one on the camera body, one in the left hand. | Nick can judge headroom and frame edges on at least one of them. Record the preferred placement and monitor size. |
| 4 | Takes as poses. Does a take survive the trip to the desk? | Record a take in the headset, save it as JSON, replay it on a flat page on the Mac. | The replay shows the same move from start to end with the same lens. |
| 5 | Dev loop. How does a build reach the headset? | Try LAN HTTPS, `adb reverse`, Vercel preview. | Record which worked and the time from saving a file to seeing the change in the headset. |

Free probe, report only: whether `SpeechRecognition` exists in the Quest browser, and whether `getUserMedia({ audio: true })` resolves inside an immersive session. One line on the debug panel. It decides how V4 detects "action" and "cut".

### 4.2 Scope

In:

- A greybox set with one doll at true scale, built by the real `build-scene.ts` copied from Film Planner and mounted through `<primitive object={scene} />`.
- A camera body grabbed with the right controller.
- Lens swap across 18, 24, 35, 50, 85, 135 mm.
- Frame lines at the 21:9 clip aspect.
- Record, replay in the headset, replay on the flat page.
- Teleport and snap turn.

Out: rigs other than handheld, voice commands, bodies and formats (one fixed body: full frame, one fixed format: 21:9), the shot list, a real backend, hand tracking, suite UI, polish.

### 4.3 Stack and location

Vite, React 19.2, TypeScript, three, `@react-three/fiber`, `@react-three/xr`, Zustand, Vitest, pnpm. React stays on 19.2.x because `@react-three/fiber` 9.7 declares the peer range `react >=19 <19.3`. Vite is used because the spike tests feel, and Vite serves HTTPS on the LAN with one plugin (`@vitejs/plugin-basic-ssl`). The R3F and XR components move into Next.js client components unchanged later. Library versions are pinned. The `@react-three/xr` 6.6.30 API was checked against its source on 2026-09-18 while the plan was written, and the plan records the library facts it relies on.

Branch `spike/vr-camera-feel`, folder `spikes/vr-camera-feel/`, README marked THROWAWAY. The branch is pushed and never merged. Only the findings merge, through this document's PR.

### 4.4 Structure

```
spikes/vr-camera-feel/
  README.md        THROWAWAY label, how to run, the five questions, source commit of the copied stage code
  src/stage/       copied as-is from Film Planner: types, lens, poses, resolve, render/build-scene,
                   render/clip-constants (+ the tests for lens, poses and resolve). The `@/` import alias is kept.
  src/spike-scene.ts   the hardcoded Stage: floor grid, a few boxes as walls and a table, one doll
  src/camera/      pure functions, unit-tested
    fov.ts           vFovDeg(lensMm, body, format), the corrected math from section 5.3
    handheld.ts      handheld(hand, previous, dtSec, smoothing) → pose
    jitter.ts        samples → RMS angular jitter (deg) and RMS position jitter (mm)
    take.ts          Take type from section 5.1, sampling, JSON in and out
  src/xr/          thin shell
    VirtualCamera.tsx   grabbable body, owns the PerspectiveCamera, applies handheld()
    Viewfinder.tsx      render-target pass, two monitors, frame lines, lens and REC readout
    Recorder.tsx        trigger start and stop, one sample per XR frame, replay
    DebugPanel.tsx      fps average and worst frame, lens, smoothing, jitter result, speech and mic probe
    Locomotion.tsx      teleport, snap turn
  src/replay/ReplayPage.tsx   flat page: list takes, play one through the same camera on the same set
  src/App.tsx      Canvas, XR store, Enter VR button (hidden when navigator.xr is missing)
```

The spike uses `fov.ts` for its camera so that "85 mm" means a real 85 mm on full frame cropped to 21:9. Film Planner's `lens.ts` comes along only because `build-scene.ts` imports it. The spike's camera never calls it (see section 5.3).

Spike constants, all adjustable in code during the headset run:

- Takes are saved with `bodyId: "full-frame"`, `formatId: "21:9"` and `rig: { rig: "handheld", smoothing }`.
- Smoothing levels map to `smoothing` = 0 (off), 0.33 (light), 0.66 (medium), 0.9 (heavy). What the number does is defined by `handheld.ts`.
- Monitor widths start at 0.16 m on the camera body (about a 7-inch on-camera monitor) and 0.30 m in the left hand.
- The camera can be grabbed when the right controller is within 0.25 m of it.

`handheld.ts` is written by Nick, about ten lines. The plan prepares the file, the signature, the tests and the trade-off notes. The tests assert properties that hold for any filter he chooses:

- `smoothing = 0` returns the hand pose exactly.
- With a constant hand pose the output converges to it.
- The output rotation stays a unit quaternion.
- The result after 1 s is the same, within tolerance, whether stepped at 72 Hz or 90 Hz. Smoothing has to depend on `dt`, or the camera feels different on different headsets.

Viewfinder pass: while an XR session is presenting, three.js substitutes the headset's stereo cameras on every `render` call, including render-target passes. The viewfinder pass sets `renderer.xr.enabled = false`, renders the lens camera into its target, then restores the flag and the previous render target.

Jitter metric: over the hold, take the camera's forward vector per sample, compute the mean direction, and report the RMS of the angle between each sample and the mean. Position jitter is the RMS distance from the mean position.

### 4.5 Controls

| Input | Action |
| --- | --- |
| Right grip | Grab the camera when the hand is near it. Releasing leaves it floating in place, like a locked-off tripod. |
| Right trigger | Start and stop recording. |
| Right stick left / right | Previous / next lens. |
| Right stick up / down | Viewfinder resolution step up / down (question 1). |
| A | Replay the last take. |
| B | Run the 10 s jitter test. |
| Left trigger | Teleport: aim the arc, release to jump. `@react-three/xr` binds its teleport pointer to the trigger. |
| Left stick left / right | Snap turn, 45 degrees. |
| Left hand | Holds the second monitor, with the debug panel above it. |
| Left grip | Run the mic probe: ask for the microphone while the session is running. |
| X | Cycle smoothing level. |
| Y | Toggle the debug panel. |

### 4.6 Getting a take to the Mac

The Vite dev server gets a `POST /takes` hook (a `configureServer` middleware, dev only) that writes each take as JSON into `spikes/vr-camera-feel/takes/`. The replay page lists that folder. On a static deploy with no dev server, the page offers the take as a file download instead.

### 4.7 Dev loop

1. Primary: `vite --host` over HTTPS with a self-signed certificate. On the Quest, open `https://<mac-ip>:5173` and accept the certificate warning once. WebXR needs a secure context, and on the Quest `localhost` means the Quest itself.
2. Fallback: `adb reverse tcp:5173 tcp:5173` over USB. The Quest's `localhost:5173` then reaches the Mac, and localhost counts as secure.
3. Stable link: a Vercel preview as its own project, preview only, labeled `exploration`. The target is confirmed with Nick before any deploy. Take transfer uses the download path from 4.6.

### 4.8 Who verifies what

Claude: unit tests pass. The flat page renders in Chrome and Safari. In flat mode the camera flies a scripted path, so viewfinder, recorder and replay can be checked with no headset. The Enter VR button is hidden in Safari. The XR session, grab, record and replay are driven in desktop Chrome through the WebXR emulator.

Nick: the five questions with the headset on, from a one-page checklist in the spike README. Feel is his call.

### 4.9 Done, and go / no-go

Done means the five questions and the probe are answered in section 4.10 and the spike branch is left unmerged.

Update 2026-09-19: PR #2 merged the spike branch after all. The code lives in `spikes/vr-camera-feel/` on `main`, with its own package.json, and the app's build, tests and lint skip that folder.

No-go: the browser can't hold refresh rate even at 640×274, or a 50 mm handheld frame is unusable at every smoothing level. In that case the platform decision reopens (Unity, section 2) before any V spec is written. The JSON contract in section 5.1 carries over to either platform.

### 4.10 Findings

Filled in after the headset run. Until then every row reads `pending`.

| # | Question | Result | Notes |
| --- | --- | --- | --- |
| 1 | Frame rate | pending | |
| 2 | Steadiness | pending | |
| 3 | Legibility | pending | |
| 4 | Takes as poses | pending | |
| 5 | Dev loop | pending | |
| P | Speech and mic probe | pending | |

### 4.11 Library findings from the desktop run

Found while building the spike on 2026-09-18 and 19, before the headset run. None of them are in the libraries' docs. V1 and every later V piece start from these fixes instead of finding them again. Paths are relative to `spikes/vr-camera-feel/`.

| # | Behaviour | Fix used in the spike | Where |
| --- | --- | --- | --- |
| L1 | Without an `<XROrigin>`, `useXR(s => s.origin)` returns the scene itself. Hiding the origin during the viewfinder's lens pass hid everything, and the monitor went black. | Hide the origin only when it is not the scene. | `src/xr/Viewfinder.tsx` |
| L2 | IWER 2.4, the emulator behind `createXRStore({ emulate })`, does not install while a native `navigator.xr` exists, and desktop Chrome always has one. @pmndrs/xr 6.6.30 does not force the install, so no XR behaviour can be checked on the desktop. | On localhost only, ask `isSessionSupported("immersive-vr")` with a 1.5 s timeout. Only on a clear `false`, shadow `navigator.xr` with `undefined` before creating the store. A rejection or a timeout keeps the native runtime, so a Quest over `adb reverse` never gets the emulator. | `src/xr/xr-store.ts` |
| L3 | `@iwer/devui` and `@iwer/sem` depend on three ^0.165. The second copy of three made every emulated frame throw "material.onBuild is not a function" and blacked out the session. | Override three to one version for every package in `pnpm-workspace.yaml` (pnpm 11 ignores `pnpm.overrides` in package.json). The emulator's synthetic environment is off. | `pnpm-workspace.yaml`, `src/xr/xr-store.ts` |
| L4 | `createXRStore` offers a session by default and prefers `immersive-ar` on a headset with passthrough, such as a Quest 3. Input gated on `mode === "immersive-vr"` then does nothing. | `offerSession: false`, plus the page's own Enter VR button. | `src/xr/xr-store.ts` |
| L5 | @react-three/fiber 9.7 declares `react >=19 <19.3`, so a plain `npm ci` fails once React 19.3 resolves. | Pin react and react-dom to 19.2.x. The app does the same since PR #3. | `package.json` |
| L6 | Vite 8 loads `vite.config.ts` as native ESM, so every import reachable from it needs an explicit `.ts` extension. The app is on Vite 7 and not affected yet. | Explicit extensions on the config's import graph. | `vite.config.ts` |

## 5. Architecture of the real thing

Six decisions. F, V1, V2, V3 and V4 each refine their part in their own spec.

### 5.1 Everything the camera does is a take

A shot holds a list of takes and one selected take. Setting start and end framing in the flat editor produces a take as well, so flat and VR produce the same thing, and v1 data migrates to "one take, selected".

Nick decided on 2026-09-25 that a take's move is a keyframe track: sparse
when it comes from flat editing, dense when it comes from a VR recording,
sampled by one `cameraAt`. This replaces the `CameraMove` union of
`framings | path` below. The final types live in
[`docs/superpowers/specs/2026-09-25-camera-and-motion-design.md`](2026-09-25-camera-and-motion-design.md).

```ts
type Vec3 = [number, number, number];
type Quat = [number, number, number, number];            // x, y, z, w
type CameraPose = { position: Vec3; rotation: Quat };

type CameraBody  = { id: string; name: string; sensorWmm: number; sensorHmm: number };
type FrameFormat = { id: string; name: string; aspect: number };

type CameraMove =
  | { kind: "framings"; start: Framing; end: Framing }   // today's ShotCamera v1 model
  | { kind: "path"; samples: number[] };                 // stride 8: t, px, py, pz, qx, qy, qz, qw

type RigSetup =
  | { rig: "handheld"; smoothing: number }
  | { rig: "tripod"; position: Vec3 }
  | { rig: "dolly"; from: Vec3; to: Vec3 }
  | { rig: "crane"; pivot: Vec3; armLength: number }
  | { rig: "drone" };

type Take = {
  v: 1;
  id: string;
  number: number;          // take 1, take 2, ...
  createdAt: number;
  bodyId: string;
  formatId: string;
  lensMm: number;          // fixed for the whole take; zoom lenses are out of scope
  rig: RigSetup;           // kept so the rig can be drawn again and the take re-shot on it
  move: CameraMove;
  durationSec: number;
};

type ShotCamera = { v: 2; takes: Take[]; selectedTakeId: string | null };
```

`samples` is a flat array because a 10 s take at 90 Hz is about 7,200 numbers, and an array of objects makes the JSON three to four times larger. `t` is seconds since "action".

Starting presets, final lists set in F's spec. Bodies: full frame 36.0 × 24.0, Super 35 24.89 × 18.66, Micro Four Thirds 17.3 × 13.0, Super 16 12.52 × 7.41 (mm). Formats: 16:9, 1.85:1, 2.39:1, 21:9.

### 5.2 One sampling function

`cameraAt(take: Take, tSec: number): CameraPose`

- `framings`: lerp position and aim as `resolve.ts` does today with `t01 = tSec / durationSec` clamped to [0, 1], then build the rotation by looking from position to aim with zero roll.
- `path`: find the two samples around `tSec`, lerp position, slerp rotation. Before the first sample return the first pose, after the last return the last.

The viewport, the VR replay and the clip exporter call only this function. The exporter asks for `cameraAt(take, i / fps)`, so a render is a pure function of the take.

### 5.3 FOV comes from body, format and lens

```
usedHeight = min(sensorHmm, sensorWmm / aspect)
vFovDeg    = 2 · atan(usedHeight / (2 · lensMm)) · 180 / π
```

Film Planner's `lensToVFovDeg` takes the vertical FOV from the full 24 mm sensor height while the frame is 21:9. That equals a sensor 56 mm wide, or a 1.56x anamorphic on full frame. A spherical 35 mm on full frame cropped to 21:9 frames like that function's "54 mm". A separate task checks whether Film Planner did this on purpose. This repo uses the formula above from the start.

Expected values for full frame at 21:9, used as test fixtures:

| Lens (mm) | 18 | 24 | 35 | 50 | 85 | 135 |
| --- | --- | --- | --- | --- | --- | --- |
| Vertical FOV (deg) | 46.4 | 35.6 | 24.9 | 17.5 | 10.4 | 6.5 |

Sanity check: horizontal FOV for 35 mm on full frame is `2 · atan(18 / 35)` = 54.4°, the figure lens charts give.

### 5.4 A rig is a pure function

```ts
type RigInput = { hand: CameraPose; stick: [number, number]; grip: boolean };
type Rig<S> = {
  init(setup: RigSetup, current: CameraPose): S;
  solve(input: RigInput, state: S, dtSec: number): { pose: CameraPose; state: S };
};
```

| Rig | Behavior | Invariant used in tests |
| --- | --- | --- |
| Handheld | Camera follows the hand through a smoothing filter. | `smoothing = 0` returns the hand pose. |
| Tripod | Position fixed at setup. The hand pans and tilts. Roll locked. | Position never changes. Roll is zero. |
| Dolly | Camera position is the hand projected onto the track segment. Pan and tilt follow the hand. | Position is always on the segment. |
| Crane | Camera stays on a sphere around the pivot, placed by the hand's direction from the pivot. | Distance to the pivot equals the arm length. |
| Drone | The sticks fly the camera. The hand is ignored. | With zero stick input the velocity decays to zero. |

Rig visuals (tripod legs, track line, crane arm) show the operator what constrains the camera. Rigs take random hand poses in tests and assert their invariant each step.

### 5.5 The suite owns the clock

One playback clock with `play`, `stop`, `seek` and a current `t`, read by characters and camera alike. It belongs to the suite and exists without VR.

- "Action" = `clock.play()` from 0 and `recorder.start()`.
- "Cut" = both stop, then `store.addTake(shotId, take)` and the new take is selected.
- The controller trigger and the voice detector emit the same two events. Voice is a second source for them and can be switched off.
- Voice is gated by state: "action" is only listened for while the camera is grabbed and idle, "cut" only while recording.
- Which detector V4 uses (the browser's speech recognition or an on-device keyword model) is decided from the spike's probe.

### 5.6 VR is isolated

All headset code lives in `xr/`. It talks to the suite only through the store and the domain functions. It is loaded with a dynamic import when Enter VR is pressed, so the flat editor never pays for it, and the flat editor imports nothing from it. The shot strip in VR is a hand menu that calls the same `selectShot` action as the flat strip, then places the operator behind that shot's camera.

### 5.7 Data flow for one take

```
selectShot(id) → store → resolveObjects(stage, overrides) → scene in the headset
grab camera → rig.solve(input, state, dt) each XR frame → CameraPose → lens camera → viewfinder
"action" → clock.play + recorder.start → one sample per frame: (clock.t, pose)
"cut" → Take → store.addTake(shotId, take) → persisted with the shot
flat editor and exporter → cameraAt(selectedTake, t)
```

## 6. What the suite's spec (S and F) must provide

1. Stage units stay meters, Y up, feet at y = 0. Already true in the stage layer.
2. Scene rendering is a function of data (`resolveObjects` plus the scene builder) with no dependency on flat-page UI, so `xr/` can mount it.
3. `ShotCamera` v2 with takes from day one, plus the v1 → v2 migration.
4. Bodies and formats as preset data. FOV through the one function in 5.3.
5. Export dimensions derive from the take's format. Today they are fixed at 2520×1080.
6. A playback clock owned by the suite, independent of any page.
7. Store actions both shells can call: `selectShot`, `addTake`, `selectTake`, `setLens`.
8. Path samples are stored outside the localStorage crash draft. `store.ts` writes a draft per shot under `stage-draft:<shotId>`. An origin gets about 5 MB of localStorage and `setItem` throws when it is full. A path take is roughly 60 to 100 KB of JSON, so a few dozen takes would fill it. Samples go to IndexedDB or the backend, and the draft keeps take metadata only.

## 7. Failure handling

| Situation | Behavior |
| --- | --- |
| No WebXR (Safari, Firefox, no headset) | Enter VR is hidden. The page is otherwise unaffected. |
| Session ends mid-take (headset off, battery, browser menu) | Treated as "cut". The take is saved. |
| Controller tracking lost mid-take | Hold the last good pose. A gap over 0.5 s ends the take. |
| Voice misfire | State gating (5.5). The trigger always works. Voice can be switched off. |
| Mic permission denied | Trigger only, with a note on the panel. |
| Comfort | Nothing moves the operator's view except their head, teleport and snap turn. The viewfinder stays a monitor and never fills the view. The drone rig flies the camera and leaves the operator where they stand. |

## 8. Testing

- Domain (FOV, `cameraAt`, migration, rigs, take JSON): unit tests written first, no headset needed.
- Determinism: exporting the same path take twice yields identical sampled poses.
- XR shell: the WebXR emulator in desktop Chrome, from a written checklist at first.
- Flat regression on every VR PR: flat pages render in Chrome and Safari with `navigator.xr` absent.
- A headset checklist per V-piece, run by Nick, because feel and comfort can't be automated.

## 9. Risks

| # | Risk | Handling |
| --- | --- | --- |
| 1 | Feel: jitter, legibility, frame rate | The spike. |
| 2 | Voice support in the Quest browser | The spike's probe. The trigger is the fallback. |
| 3 | Heavier sets later | A per-set budget set from the spike's numbers. Viewfinder resolution is the main dial. |
| 4 | Take storage size | Section 6, item 8. |
| 5 | `@react-three/xr` API drift | Pinned versions and a thin XR shell. |
| 6 | Scope creep from the game framing | No scoring or progression unless a spec says so. |

## 10. Out of scope for this whole track

Voice-directed blocking, multi-user sessions, hand tracking, zoom lenses within a take, in-headset video capture, a native client, scoring or progression.

## 11. Deferred to the named piece's own spec

| Topic | Decided in | Spec file |
| --- | --- | --- |
| Final body and format preset lists, export dimensions per format | F | [camera-and-motion](2026-09-25-camera-and-motion-design.md) |
| Where path samples are stored (IndexedDB or backend) | F | [camera-and-motion](2026-09-25-camera-and-motion-design.md) |
| Locomotion details, tabletop ("dollhouse") scale view | V1 | [vr-scout](2026-09-25-vr-scout-design.md) |
| Take management: compare, delete, re-select, re-shoot on the same rig | V2 | [vr-operate](2026-09-25-vr-operate-design.md) |
| Rig placement UI and rig visuals | V3 | [vr-rigs](2026-09-25-vr-rigs-design.md) |
| Keyword detector choice, slate and take numbering by voice | V4 | [vr-directors-calls](2026-09-25-vr-directors-calls-design.md) |

## 12. Changelog

- 2026-09-18: design approved in chat, spike scoped (section 4).
- 2026-09-25: piece F noted as merged into M3 Camera and motion, V1 to V4
  pointed at M5 to M8 and their spec files; section 5.1 notes Nick's
  2026-09-25 decision that a take's move is a keyframe track sampled by one
  `cameraAt`, replacing the `framings | path` union, with final types in the
  camera-and-motion spec; section 11 links each deferred topic to the spec
  that now owns it.
