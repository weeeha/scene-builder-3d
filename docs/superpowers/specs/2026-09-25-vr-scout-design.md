# VR Scout: design spec (M5, piece V1)

> **Status:** exploration · **Stage:** draft for review, written 2026-09-25
> **Milestone:** M5 in the [roadmap](../../roadmap.md), size M, gated on M4
> (outputs) and on the Quest spike (see the Spike gate section below).
> **Builds approved by this document:** none until Nick approves it. Anything
> published from this work starts unlisted and is labeled `exploration`.
> **Related:** [roadmap](../../roadmap.md) (M5, ownership map) · [main spec](2026-09-18-scene-builder-3d-design.md)
> (architecture, routes, storage) · [VR operator spec](2026-09-18-vr-operator-design.md)
> (piece V1, sections 5 to 11, spike findings in 4.10 and 4.11) ·
> [camera and motion spec](2026-09-25-camera-and-motion-design.md) (M3, the
> contracts this document builds on) · spike code on `main` in
> `spikes/vr-camera-feel/` · S0/S1 code on `origin/feat/s0-s1-walking-skeleton`

## TL;DR

VR Scout is the first headset milestone: put on a Quest, stand in the
selected shot's set at true scale, look through a viewfinder monitor that
shows exactly what the shot's camera frames, and jump between shots from a
hand menu. Nothing is recorded and nothing is written to the document beyond
`selectShot`, which is session state, not a document edit. This spec owns
`src/xr/`, the folder every later VR milestone (Operate, Rigs, Director's
calls) builds inside. It defines the module boundaries, the dynamic import
that keeps the flat editor from paying for WebXR code, how the shell reads
the M3 store and functions, and where V1 stops short of writing anything.
Several concrete numbers (viewfinder resolution, monitor placement and size,
the per-set performance budget) are defaults this document sets now and the
Quest spike run has to confirm; each one is listed in the Spike gate section
at the end.

## 1. Problem

M3 gives the suite a data model, a `cameraAt` function, and a playback clock
that exist independent of any page. Nothing yet puts a person inside the set
they built. The VR operator spec's piece V1 (section 3) describes the goal:
enter VR from a shot, stand in the set at 1:1, move around, jump between
shots, and see each shot's frame on a viewfinder monitor, read-only. Piece V1
also has to lay down `src/xr/` in a shape that V2 (grab the camera and
record), V3 (rigs) and V4 (voice) can extend without moving files around
under them, since the ownership map in the roadmap hands each of those
milestones a named slice of that folder.

## 2. Decisions

Decisions already fixed elsewhere and cited here, not reopened by this spec.

| # | Decision | Source | Made |
|---|---|---|---|
| D1 | The VR shell lives entirely in `src/xr/`, talks to the suite only through the store and domain functions, and is loaded with a dynamic import when Enter VR is pressed. The flat editor imports nothing from it. | VR operator spec 5.6 | 2026-09-18 |
| D2 | The stage is authored in metres and WebXR treats one three.js unit as one metre, so the set appears at true scale with no conversion. | VR operator spec 3, note 1 | 2026-09-18 |
| D3 | Comfort: nothing moves the operator's view except their head, teleport and snap turn. The viewfinder stays a monitor and never fills the view. | VR operator spec 7 (comfort row) | 2026-09-18 |
| D4 | `@react-three/xr` wraps the scene graph the flat page already renders; there is one scene, one renderer. | VR operator spec 3, note 1 | 2026-09-18 |
| D5 | No WebXR (Safari, Firefox, no headset): Enter VR is hidden and the page is otherwise unaffected. | VR operator spec 7 | 2026-09-18 |
| D6 | Which piece owns what: V1 is read-only and small once the suite exists (S and F/M3 done); it needs nothing from V2's grab-and-record. | VR operator spec 3 | 2026-09-18 |
| D7 | The suite owns one playback clock (`playbackStore`), independent of any page, advanced by `<PlaybackDriver />` from `useFrame`, which three.js moves onto XR session frame callbacks while presenting. | camera-and-motion spec 6.4 | 2026-09-25 |
| D8 | `selectShot` is session state: not persisted, not undoable. It sets `activeShotId`, clears `selectedKey`, pauses, seeks to 0, and sets the clock's duration to the shot's. | camera-and-motion spec 6.2 | 2026-09-25 |
| D9 | The shot strip in VR is a hand menu calling the same `selectShot` action as the flat strip, then placing the operator behind that shot's camera. | VR operator spec 5.6 | 2026-09-18 |
| D10 | Per-set performance budget, with viewfinder resolution as the main dial, is a risk the spike's numbers set. | VR operator spec 9, risk 3 | 2026-09-18 |
| D11 | `@react-three/xr` API drift is handled with pinned versions and a thin XR shell. | VR operator spec 9, risk 5 | 2026-09-18 |
| D12 | Library gotchas L1 to L6 found on the desktop run, before any V piece writes code. | VR operator spec 4.11 | 2026-09-18/19 |

Decisions this spec makes. Each is a default Nick can overturn in review; the
ones with a real trade-off are repeated in the Reserved for Nick section, and
every one the Quest spike measures is repeated again in the Spike gate
section.

| # | Decision | Why |
|---|---|---|
| SC1 | `src/xr/` has one static entry point, `src/xr/entry.ts`, exporting only `isXRSupported()` and `enterVR()`. Every other module in `src/xr/` is reached through a dynamic `import()` inside `entry.ts`, never imported directly by `src/app` or `src/viewport`. | One narrow seam keeps D1 mechanical instead of a convention to remember. A later V piece adds files under `src/xr/`, never a new static import into it. |
| SC2 | The flat `<Canvas>` in `StageCanvas.tsx` always renders its children through one small pass-through component, `XRBoundary`, that lives in `src/viewport` (not `src/xr/`), takes an optional `xr` prop, and renders `<xr.XR store={xr.xrStore}>{children}</xr.XR>` when set, else `children` plain. | `@react-three/xr`'s `<XR>` component has to wrap scene content *inside* the R3F `<Canvas>` (D4, one scene). `XRBoundary` is the only place `src/viewport` conditionally depends on the dynamically loaded module, and it holds no XR logic of its own. |
| SC3 | Session state gets one field on `editorStore`: `xrActive: boolean`, set by `entry.ts` on session start and end. Nothing else in `src/state` learns about VR. | `StageCanvas` reads `xrActive` to decide whether to pass `xr` to `XRBoundary`. No new store, no store that only VR touches. |
| SC4 | V1 never calls a document command. It calls `selectShot` (session state) and reads `documentStore`, `playbackStore` and the M3 domain functions. `addTake`, `commitRecordedTake` and every optics setter stay untouched until V2. | The ownership map's "never writes the document in V1" line, made concrete: there is no code path in `src/xr/` for this milestone that reaches `documentStore.apply`. |
| SC5 | The viewfinder is a monitor mounted on the operator's non-dominant (left) hand, plus a second copy fixed in world space near the shot's staged camera position, matching the spike's two-monitor setup (VR operator spec 4.1, question 3; 4.5). | Reuses a legibility setup already probed once, with two placements to compare rather than committing to one before the headset run. |
| SC6 | Tabletop (dollhouse) scale view ships in V1 as a toggle, default off. | It is cheap once locomotion and the operator rig exist (a scale factor on `XROrigin`, no new geometry), and V1 is exactly the milestone the VR spec files it under (section 11). See Reserved for Nick, item 3, for the scale factor and toggle gesture. |
| SC7 | The per-set performance budget is enforced by one dial, the viewfinder's render-target resolution, stepped the same way the spike's right-stick up/down did (VR operator spec 4.5). Draw calls and triangle counts are measured, logged to the debug panel, and not yet auto-capped in V1. | A single dial keeps V1 simple. Auto-throttling on triangle count is real work with its own edge cases (which objects give first), out of scope until a set is heavy enough to need it (Out of scope, item 2). |
| SC8 | `@react-three/xr` is pinned to `6.6.30`, the version the spike checked against source on 2026-09-18 (VR operator spec 4.3), with `@iwer/devui`, `@iwer/sem` and `three` resolved to one version across the workspace via `pnpm.overrides`, following L3. | Matches the version the four gotchas in 4.11 were found against. A version bump is a deliberate decision with its own changelog entry, not a `^` range drifting under CI. |

### Alternatives considered

- **A second `<Canvas>` for VR, mounted only during a session.** Rejected by
  D4: WebXR needs the renderer that owns the session, and remounting a
  `<Canvas>` mid-session would drop the GL context and restart every mesh
  load. `XRBoundary` (SC2) keeps the one canvas S1 already guarantees stays
  mounted across scene, shot and shot (main spec, Navigation).
- **Import `@react-three/xr` statically and gate its use behind
  `isXRSupported()`.** Simpler code, but it ships the library's bytes (and
  its own dependency on `three` version pinning, L3) to every visitor,
  including the ones on Safari who can never use it. Rejected by D1 and SC1.
- **A dedicated VR-only Zustand store instead of one field on
  `editorStore`.** A new store means a new lifetime to reason about for one
  boolean. Rejected by SC3; V2 revisits this if VR session state grows past
  a flag or two.
- **Viewfinder on the camera body instead of the hand.** The VR operator
  spec's own spike found both a camera-body monitor and a hand monitor
  worth testing (4.1, question 3); V1 has no camera body to mount one on
  yet (that is V2's grab), so only the hand and a fixed-in-space copy are
  available this milestone. SC5 keeps both variants alive for the Quest run
  to judge, rather than guessing.
- **Skip the tabletop view in V1 and defer it whole to a later spec.** The
  VR spec explicitly leaves "keep or cut" to V1 (section 11). Cutting it
  entirely would need a new spec later just to add a scale toggle to an
  already-working locomotion rig. SC6 keeps it, off by default, scoped to a
  five-line toggle (Reserved for Nick, item 3).
- **Auto-throttle the viewfinder resolution from a live triangle-count
  budget.** More resilient to heavy sets, but needs a policy for what
  degrades first (resolution, shadow quality, LOD) that this milestone has
  no data to write yet. SC7 keeps the dial manual and logs the numbers the
  spike said to record (VR operator spec 4.1, question 1); an auto-budget is
  Out of scope, item 2.

## 3. The `src/xr/` folder: layout and module boundaries

This is the contract every later VR milestone builds inside. File names below
are final for V1; M6, M7 and M8 each add files to this tree and are named in
the "M6/M7/M8 adds" column so the boundary between milestones is visible from
day one.

```
src/xr/
  entry.ts              the ONLY module outside src/xr/ may import. isXRSupported(), enterVR(). (SC1)
  xr-store.ts            createXRStore, the emulator/session setup carrying L1-L4 forward
  XRExperience.tsx        top-level tree mounted as children of <XR>; composes everything below
  OperatorRig.tsx         places <XROrigin> behind the selected shot's camera at 1:1 (5)
  Locomotion.tsx           teleport + snap turn, ported from the spike (6)
  HandMenu.tsx              hand-attached shot strip, calls selectShot (7)
  Viewfinder.tsx             render-target monitor(s), cameraAt + takeOptics (8)
  TabletopScale.tsx           tabletop/dollhouse scale toggle (10)
  perf-budget.ts                constants + a measuring hook, the viewfinder-resolution dial (11)
  types.ts                       XR-only local types (e.g. HandMenuItem)
  xr.test-setup.ts                 the WebXR emulator harness used by src/xr/*.test.tsx (13)
```

| Module | Reads from the suite | Writes to the suite | M6/M7/M8 adds |
|---|---|---|---|
| `entry.ts` | none | `editorStore.setXrActive` | unchanged |
| `xr-store.ts` | none | none (owns only the XR session object) | unchanged |
| `XRExperience.tsx` | `documentStore`, `playbackStore`, `editorStore.activeShotId` | none | M6 adds `<VirtualCamera>` (the grabbable body) and `<Recorder>` as siblings here |
| `OperatorRig.tsx` | `documentStore` (selected shot's take, via `cameraAt`) | none | unchanged; M6's grabbed camera is a child of the scene, not the origin |
| `Locomotion.tsx` | none | none (local component state only) | unchanged |
| `HandMenu.tsx` | `documentStore` (shot list) | `commands.selectShot` | M6 adds take-management rows (compare, delete, re-shoot); M7 adds a rig-picker row |
| `Viewfinder.tsx` | `documentStore`, `playbackStore`, `cameraAt`, `takeOptics` | none | M6's REC readout and lens/body/format controls render here |
| `TabletopScale.tsx` | `editorStore` (local toggle state) | none | unchanged |
| `perf-budget.ts` | three.js renderer info (`gl.info`) | none | unchanged; M7's rig visuals count toward the same triangle budget |
| new in M8 | none | none | `VoiceDetector.ts`, `DirectorState.ts` (action/cut state machine) |

Two rules keep the boundary real instead of aspirational:

1. **No file under `src/app/` or `src/viewport/` imports from `src/xr/`
   except `src/xr/entry.ts`.** A lint rule (`import/no-restricted-paths` in
   `eslint.config.js`) enforces it; the CI job that already runs lint (main
   spec, Testing and CI) catches a violation the same way it catches a
   type error.
2. **No file under `src/xr/` imports from `src/app/`.** The shell only
   reaches the suite through `src/state` (stores, `commands.ts`) and
   `src/domain`, the same seam `src/viewport` already uses. `XRExperience`
   mounts `SceneContents` and `TrackApplier` from `src/viewport` (they are
   already UI-framework-free of the flat page's routes, per camera-and-motion
   spec 8, row 2), not a copy of them.

### 3.1 The dynamic import entry

```ts
// src/xr/entry.ts
export function isXRSupported(): boolean {
  return typeof navigator !== "undefined" && "xr" in navigator;
}

export async function enterVR(): Promise<void> {
  const mod = await import("./xr-runtime");   // pulls in @react-three/xr, xr-store.ts, XRExperience and everything it composes
  await mod.enter();                          // creates/reuses the store, calls xrStore.enterVR(), flips editorStore.xrActive
}
```

`xr-runtime.ts` (inside the dynamic chunk, not a public seam) is the one file
that imports `@react-three/xr` and re-exports `XR` and `xrStore` for
`XRBoundary` (SC2) to consume; `StageCanvas` receives them as the resolved
value of the same `import()` promise `entry.ts` awaits, passed down through
`editorStore.xrActive` plus a small `xrModule` ref held in `StageCanvas`
itself (not in a store, since a loaded ES module is not serializable state
and never needs to survive a remount of `StageCanvas`, which per the main
spec's Navigation section only happens on leaving the stage layout).

`isXRSupported()` is what an **Enter VR** button in `src/app` calls to decide
whether to render at all (5.1, D5): it does not import `xr-store.ts`, so
checking it never triggers the dynamic import or the emulator-vs-native
top-level await the spike's `xr-store.ts` runs (VR operator spec 4.11, L2;
carried forward at `spikes/vr-camera-feel/src/xr/xr-store.ts`).

### 3.2 Session lifecycle

```
Enter VR clicked → isXRSupported() already true (button was visible)
  → enterVR() → dynamic import resolves → xrStore.enterVR()
  → browser's session picker → session starts
  → editorStore.xrActive = true → StageCanvas re-renders through XRBoundary
  → XRExperience mounts: OperatorRig places the origin behind the active shot's camera,
    Locomotion, HandMenu and Viewfinder mount as its children
Session ends (Exit VR in the headset menu, battery, or the browser tab backgrounded)
  → xrStore's session "end" event → editorStore.xrActive = false
  → XRBoundary drops back to plain children; the flat page is exactly as it was
```

No document write happens anywhere in this sequence (SC4). `activeShotId`
does not reset on exit: leaving VR on Shot 03 leaves the flat page on
Shot 03, since `selectShot` already keeps the route and `activeShotId` in
sync in both directions (camera-and-motion spec 6.2).

### 3.3 Porting map

Spike paths are relative to `spikes/vr-camera-feel/` in this repo, checked
with `ls` on 2026-09-25. The main spec's port rule applies: copy from the
real source with its tests, confirm they still pass, then adapt; the spike
itself is throwaway, so a row marked "rebuild" takes only the idea forward,
not the file.

| Into | From | Source files | How |
|---|---|---|---|
| `src/xr/Locomotion.tsx` | VR spike | `src/xr/Locomotion.tsx` | Copy with its test coverage carried forward, trigger binding and snap-turn config unchanged (6). |
| `src/xr/xr-store.ts` | VR spike | `src/xr/xr-store.ts`, `pnpm-workspace.yaml` | Copy, keeping L2 to L4's fixes (`offerSession: false`, the `localhost`-only emulator gate, `pnpm.overrides` pinning `three`) as shipped in the spike (3.1, 12). |
| `src/xr/Viewfinder.tsx` | VR spike | `src/xr/Viewfinder.tsx` | Rebuild against `cameraAt`/`takeOptics` (camera-and-motion 4.1, 4.2) in place of the spike's own pose and lens state; the render-target pass, the `renderer.xr.enabled` toggle around it, and L1's origin-hiding guard carry over unchanged (8, 12). |
| `src/xr/entry.ts`'s Enter VR visibility check | VR spike | `src/App.tsx` | Rebuild as `isXRSupported()`: the spike's rule (hide the button only when `navigator.xr` itself is absent, not when a session would fail) carries over; the spike's own button JSX does not, since V1's button lives in `src/app` (4). |
| Viewfinder resolution stepping (right stick up/down) | VR spike | `src/xr/ControllerInput.tsx` (`viewfinderSize` stick-flick edge), `src/input/edges.ts` | Port the edge-detection helper (`createStickFlick`) from `edges.ts`; rebuild the stepping call site in `src/xr/perf-budget.ts` against `VIEWFINDER_RESOLUTION_STEPS` in place of the spike's `VF_RESOLUTIONS` constant, since V1 has no lens or REC handling on the same controller to share the file with (11). |
| HUD readout ("Take 3 · 35 mm · 1.12 s") | VR spike | `src/ui/text-canvas.ts` | Copy with its test coverage; `Viewfinder.tsx` calls `createTextCanvas` directly for the readout text instead of going through the spike's shared `DebugPanel.tsx` panel (8). |
| Not ported | VR spike | `src/xr/DebugPanel.tsx` (fps average, worst frame, jitter readout) | Rebuild only the idea, not the file: V1's debug overlay (11, 13) reads `gl.info.render` through `perf-budget.ts`'s own `sampleFrame`, not the spike's fps-meter/jitter test scaffolding, which answered spike-specific questions already recorded in the VR operator spec (4.10). |

Four library gotchas carried forward from the desktop run (VR operator spec
4.11), fixes already folded into the rows above:

| Into | From | Source files | How |
|---|---|---|---|
| `src/xr/Viewfinder.tsx` (L1) | VR spike | `src/xr/Viewfinder.tsx` | Only hide the origin during the render-target pass when it is not the scene itself (12). |
| `src/xr/xr-store.ts` (L2) | VR spike | `src/xr/xr-store.ts` | `localhost`-only `isSessionSupported("immersive-vr")` probe with a 1.5 s timeout before shadowing `navigator.xr` (12). |
| `src/xr/xr-store.ts`, `pnpm-workspace.yaml` (L3) | VR spike | `pnpm-workspace.yaml`, `src/xr/xr-store.ts` | One `three` version for every package via `pnpm.overrides`, `syntheticEnvironment: false` (12). |
| `src/xr/xr-store.ts` (L4) | VR spike | `src/xr/xr-store.ts` | `offerSession: false`, V1's own Enter VR button as the only session entry point (12). |

## 4. Entering VR: the button

The button lives in `src/app`, on the shot page toolbar next to the write-
target switch (main spec, Navigation), and is a plain component with no
static import from `src/xr/` beyond `entry.ts`:

```tsx
// src/app/components/EnterVRButton.tsx
const supported = useMemo(() => isXRSupported(), []);
if (!supported) return null;
return <button onClick={() => enterVR()}>Enter VR</button>;
```

- **Visibility (D5).** `isXRSupported()` runs once, client-side, no top-level
  await, no dynamic import. On Safari and Firefox (no `navigator.xr`), and on
  a desktop Chrome tab with the WebXR emulator extension not installed and no
  headset, `navigator.xr` is present but returns `false` from
  `isSessionSupported`; V1 still shows the button in that case (the same
  choice the spike's `App.tsx` makes: the button is hidden only when
  `navigator.xr` itself is absent, not when a session would fail to start),
  and a session request that the browser rejects surfaces as the toast in the
  Error handling table.
- **Where it is not shown.** The scene page and the board (main spec,
  Navigation) have no shot camera to place the operator behind, so the button
  only renders on the shot page. Selecting VR from the board is Out of scope
  (item 4).
- **Disabled state.** While `enterVR()`'s dynamic import is in flight
  (typically under a second on a warm cache, longer on the Quest browser's
  first load), the button shows a spinner and is disabled, so a second click
  cannot start two sessions.

## 5. Placing the operator: 1:1 at the selected shot's camera

`OperatorRig` runs once when `XRExperience` mounts and again whenever
`activeShotId` changes (a hand-menu shot switch, 7):

```ts
const take = selectedTake(shot);                       // from documentStore, camera-and-motion 3.1
const pose = cameraAt(take, 0);                         // the shot's frame-0 pose, same pose the thumbnail uses (4.5)
const behind = subtract(pose.position, forward(pose.rotation) * OPERATOR_STANDOFF_M);
origin.position.set(behind.x, 0, behind.z);              // feet stay on the floor; XROrigin owns height, not this rig
origin.rotation.y = yawOf(pose.rotation);                 // face the same direction as the shot's frame-0 look
```

- **Standoff.** `OPERATOR_STANDOFF_M = 0.6`: the operator stands 0.6 m behind
  where the shot's camera is framed, rather than exactly on top of it, so
  their own head is not occupying the camera position (V2 puts a grabbable
  body there instead). This is a default; see Reserved for Nick, item 1.
  Read-only in V1: the shot's actual `cameraAt` pose still drives the
  viewfinder (8), independent of where the operator's head is.
  from where they physically are, since D3 rules out anything moving the
  view but head, teleport and snap turn.
- **True scale (D2).** No scale factor is applied to the stage or the
  operator; one three.js unit is one metre, matching `XROrigin`'s own units,
  so a doll built at 1.75 m (VR operator spec 3, `DOLL` in `poses.ts`) reads
  at head height for an operator of similar height.
- **Floor height.** `origin.position.y` is always `0`; the stage's own floor
  sits at `y = 0` (main spec, Architecture; VR spec 6, item 1), so no floor
  probe or guardian-boundary lookup is needed in V1.
- **A shot with no takes.** Cannot happen: `ShotCamera.selectedTakeId` is
  never null and every shot has at least one take (camera-and-motion spec
  3.1, 3.6). `OperatorRig` never has to handle a missing take.

## 6. Locomotion: teleport, snap turn, comfort

Ported from the spike's `src/xr/Locomotion.tsx` (already read in full above),
with the trigger binding used unchanged rather than reinvented:

| Input | Action | Source |
|---|---|---|
| Left trigger | Teleport: aim the arc, release to jump. `@react-three/xr`'s `TeleportTarget` binds to the trigger via `teleportPointer: true` on the left controller. | Spike `Locomotion.tsx`, `xr-store.ts` |
| Left stick left/right | Snap turn, 45 degrees, via `useXRControllerLocomotion(origin, false, { type: "snap", degrees: 45 }, "right")`. | Spike `Locomotion.tsx` |
| Right controller | No locomotion pointer bound (`teleportPointer: false, rayPointer: false, grabPointer: false` in `xr-store.ts`), reserved for the hand menu (7) and, from V2, the camera grab. | Spike `xr-store.ts` |

**Teleport surface.** The spike's flat plane at `y ≈ 0` is replaced by a
teleport target sized to the set's floor footprint (the same bounds the
scene's ground plane already occupies, main spec `Ground.tsx`), so a
teleport arc cannot land the operator outside the built set or inside a
wall mesh. Landing inside a solid prop is not prevented in V1 (no navmesh);
it is a known rough edge, listed in the Error handling table.

**Comfort rules (D3, VR operator spec 7's comfort row).**

1. The only things that move the operator's view are their own head,
   teleport (an instant cut, no glide) and snap turn (an instant 45° step,
   no smooth rotation). `useXRControllerLocomotion`'s `"snap"` type already
   gives the instant step; V1 never passes `"smooth"`.
2. The viewfinder (8) is a monitor at arm's length or fixed in the world; it
   never fills the field of view and never moves the camera the operator's
   eyes are rendered through. Only the render target's content changes.
3. Nothing auto-moves the operator (no cut-scenes, no forced camera paths).
   Playback (9) animates the set's objects and the *shot's* camera pose
   shown on the viewfinder monitor; it never moves `XROrigin`.
4. Tabletop scale (10) changes `XROrigin`'s scale, not its position, and is
   operator-triggered, never automatic.

## 7. Hand menu: the shot strip in VR

`HandMenu.tsx` attaches to the left controller (the hand not used for
locomotion's trigger) and opens on a grip hold, mirroring the flat shot
strip's `[Set] [01] [02] [03] [+]` (main spec, Navigation) as a vertical list
of shot cards, each with its thumbnail (already rendered offscreen for the
flat strip, main spec's shot strip section) and name.

```ts
function onSelect(shotId: string) {
  commands.selectShot(shotId);        // the exact function the flat strip calls (D9, camera-and-motion 6.2)
}
```

- **No "Set" row.** V1 has no scene-page equivalent in VR: there is no bare-
  set view without a shot's camera framing to attach the viewfinder and the
  operator's placement to. Standing in the set with no shot selected is Out
  of scope, item 5; the hand menu always opens on the currently active shot
  highlighted, and always lists at least that one shot.
- **No add, delete, duplicate or reorder.** Those are document edits (SC4);
  V1's hand menu is `selectShot` and nothing else. The row for each shot is
  a plain button, not a swipeable card.
- **Feedback.** Selecting a shot closes the menu, and `OperatorRig` re-runs
  (5) so the operator is repositioned behind the new shot's camera before
  the menu's close animation finishes; there is no teleport-style glide
  between shots, matching comfort rule 3 (a shot switch is a cut, not a
  move the operator did with their own locomotion).

## 8. Viewfinder monitor

Two monitor instances, both rendering the same source (SC5):

```ts
// src/xr/Viewfinder.tsx
const take = selectedTake(shot);
const optics = takeOptics(take);                         // body, format, vFovDeg, hFovDeg, aspect (camera-and-motion 4.1)
const pose = cameraAtInto(take, playbackStore.time, poseScratch);  // driven every frame, no allocation (camera-and-motion 4.2)
```

- **Render path.** One `PerspectiveCamera` positioned at `pose`, FOV from
  `optics.vFovDeg`, aspect from `optics.aspect`, rendered into a
  `WebGLRenderTarget` sized by the resolution dial (11). While an XR session
  presents, three.js substitutes the headset's stereo cameras on every
  `render` call including render-target passes (VR operator spec 4.4); the
  viewfinder pass sets `renderer.xr.enabled = false` for that one render call
  and restores it immediately after, exactly as the spike's `Viewfinder.tsx`
  does.
- **Two placements (SC5).**
  1. **Hand-mounted.** A `0.16 m`-wide plane attached to the operator's left
     hand (the same hand as the hand menu, mutually exclusive: the menu
     replaces the monitor while its grip is held). Matches the spike's
     "7-inch on-camera monitor" default (VR operator spec 4.4).
  2. **World-fixed.** A `0.30 m`-wide plane fixed near the shot's staged
     camera position (`cameraAt(take, 0).position`, offset 0.1 m to the
     side so it does not occlude the frame it is showing), visible whenever
     the operator looks toward the shot's camera. Matches the spike's
     left-hand monitor size, repositioned since V1 has no left hand free of
     locomotion duty for a second held monitor.
  Both sizes and the choice of which one ships as default in V1 are Quest
  spike outputs (Spike gate, row 3); until the headset run, both render.
- **Frame lines.** A 1 px border at the take's aspect ratio, matching the
  flat viewport's format mask (camera-and-motion 7.6), so the picture judged
  in the headset is the picture the flat editor, the thumbnail and (from M4)
  the export agree on.
- **HUD readout.** "Take 3 · 35 mm · 1.12 s" printed onto the monitor via
  the spike's `src/ui/text-canvas.ts` approach (a canvas texture, not DOM),
  the same information the flat viewport's HUD shows (camera-and-motion
  7.6), so switching between headset and desk mid-session shows the same
  numbers.
- **View-only.** The viewfinder never accepts input in V1; there is no
  camera to grab yet (V2). Looking at a dense (VR-recorded) take's
  viewfinder plays it exactly as a sparse take's, since `cameraAt` already
  handles both (camera-and-motion 4.2) and V1's viewfinder code never checks
  `track.kind`.

## 9. Playback of the selected take

V1 reuses `playbackStore` and `<PlaybackDriver />` exactly as M3 built them
(camera-and-motion 6.4, 8 row 6); it adds no VR-specific playback code.

- `<PlaybackDriver />` already lives inside `StageCanvas` (camera-and-motion
  7.6), which `XRBoundary` wraps (3), so it keeps running unchanged once a
  session starts: `useFrame` continues to fire (React Three Fiber moves
  `renderer.setAnimationLoop` onto the XR session's frame callbacks while
  presenting), so `tick(delta)` advances the clock at the headset's refresh
  rate instead of the browser's.
- The transport controls themselves (play, pause, loop, scrub) are flat-page
  UI (camera-and-motion 7.1) and are not ported into the headset in V1. The
  operator watches whatever the flat page (or the last state before Enter VR
  was pressed) left the clock doing: playing and looping, or paused at a
  frame. Giving the operator playback controls in VR is Out of scope, item 6,
  reserved for a later piece once there is an interaction model (V2's
  trigger, V4's "action"/"cut") to hang them on.
- **`TrackApplier` and blocking.** `resolveScene(scene, shot, t)` already
  drives every object's position and pose from the shot's tracks
  (camera-and-motion 4.3); since `SceneContents` and `TrackApplier` mount
  unchanged inside `XRExperience` (3, rule 2), a doll's pose spans and any
  object tracks authored on the flat page play inside the headset exactly as
  they play on the desk, with no VR-specific code.
- **A shot with no tracks.** Plays as a still set, the same behavior the
  flat page already has (camera-and-motion 3.4, "before the first key it
  holds its base pose").

## 10. Tabletop (dollhouse) scale view

Ships in V1, default off (SC6). A single toggle button on the hand menu (7)
switches `XROrigin`'s scale between `1` (true scale, default) and a smaller
factor that shrinks the operator relative to the set, so the whole set fits
in reach without teleporting around it.

```ts
xrOrigin.scale.setScalar(tabletop ? TABLETOP_SCALE : 1);
```

- **What moves.** Only the origin's scale. Locomotion (teleport target,
  snap turn) keeps working at the new scale with no code change, since both
  already operate in the origin's local space.
- **The viewfinder is unaffected.** It shows `cameraAt(take, t)` at the
  take's real optics regardless of `XROrigin`'s scale, since the render
  camera used for the viewfinder pass is not a child of the origin (8);
  switching to tabletop scale changes how big the *set* looks, never what
  the *shot* frames.
- **`TABLETOP_SCALE`'s value** is a default Nick can tune once he has stood
  in both scales; see Reserved for Nick, item 2.

## 11. Per-set performance budget

One dial ships in V1: the viewfinder render target's resolution (SC7),
stepped on the right stick up/down exactly as the spike's question 1 test
did (VR operator spec 4.1, 4.5). `perf-budget.ts` holds the steps and the
measurement, both logged to a debug overlay (13) rather than acted on
automatically:

```ts
// src/xr/perf-budget.ts
export const VIEWFINDER_RESOLUTION_STEPS = [
  { w: 640, h: 274 }, { w: 960, h: 412 }, { w: 1280, h: 548 },
] as const;                                              // from the spike's question 1 (VR operator spec 4.1)
export const DEFAULT_VIEWFINDER_STEP = 1;                 // 960x412; the spike's likely pass resolution (Spike gate, row 1)

export type FrameSample = { drawCalls: number; triangles: number; fps: number };
export function sampleFrame(gl: WebGLRenderer): FrameSample;  // reads gl.info.render, averaged over the last 30 frames
```

- **What is measured, not yet capped.** `sampleFrame` reads
  `gl.info.render.calls` and `gl.info.render.triangles` once per second and
  writes them to the debug overlay alongside the headset's actual fps, so a
  heavier set than the spike's greybox shows up as a number Nick can read
  during the headset checklist (13), rather than an unexplained frame drop.
  Auto-throttling on these numbers is Out of scope, item 2.
- **Where the budget applies.** The whole scene (set, dolls, props) plus
  both viewfinder render passes (8) count toward one draw-call and triangle
  total; V1 does not separate a "set budget" from a "viewfinder budget",
  since the spike measured them together (VR operator spec 4.1, question 1
  measures "the Quest browser hold its refresh rate while also rendering the
  viewfinder").
- **Numeric budget itself.** Left as a default until the headset run reports
  real numbers (Spike gate, row 1); `perf-budget.ts` ships with the spike's
  three resolution steps as placeholders and a comment pointing at the
  finding that will replace `DEFAULT_VIEWFINDER_STEP`.

## 12. `@react-three/xr` pin and the four library gotchas

Pinned to `6.6.30` (SC8), the version the VR operator spec's plan checked
against source on 2026-09-18 (section 4.3) and the version the four gotchas
below were found against (section 4.11). V1's `xr-store.ts` and `Locomotion`
carry each fix forward rather than rediscovering it:

| # | Gotcha | Fix carried into V1 | Where in V1 |
|---|---|---|---|
| L1 | Without an `<XROrigin>`, `useXR(s => s.origin)` returns the scene itself; hiding the origin during a render-target pass then hides everything. | Only hide the origin when it is not the scene itself, inside the viewfinder's render function. | `src/xr/Viewfinder.tsx` |
| L2 | IWER (the emulator behind `createXRStore({ emulate })`) does not install while a native `navigator.xr` exists, and desktop Chrome always has one. | On `localhost` only, ask `isSessionSupported("immersive-vr")` with a 1.5 s timeout; only on a clear `false` does the store shadow `navigator.xr` with `undefined` before creation. A Quest reached over `adb reverse` (which also reports `localhost`) answers `true` and keeps its native runtime. | `src/xr/xr-store.ts` |
| L3 | `@iwer/devui` and `@iwer/sem` depend on a second copy of `three`, which throws `material.onBuild is not a function` on every emulated frame. | One `three` version for every package via `pnpm.overrides` in `pnpm-workspace.yaml` (pnpm ignores `package.json`-level overrides), with `syntheticEnvironment: false`. | `pnpm-workspace.yaml`, `src/xr/xr-store.ts` |
| L4 | `createXRStore` offers a session by default and prefers `immersive-ar` on passthrough-capable hardware (a Quest 3); input gated on `"immersive-vr"` then silently does nothing. | `offerSession: false`, plus V1's own Enter VR button (4) as the only session entry point. | `src/xr/xr-store.ts` |

L5 (React pinned to `19.2.x` for `@react-three/fiber`'s peer range) and L6
(Vite config import extensions) are build-tooling facts the app already
carries from S0/S1 (main spec, Architecture) and are not re-stated in
`src/xr/`; they apply to the whole repo, not specifically to this folder.

## 13. XR testing

Following the main spec's Testing and CI section and the VR operator spec's
"who verifies what" split (4.8), extended from a spike to a shipping folder.

- **Domain regression.** V1 adds no new domain functions; `cameraAt`,
  `takeOptics` and `resolveScene` are exercised through their own M3 test
  suites already. V1's own unit tests cover only what it adds:
  `OperatorRig`'s standoff placement math, `perf-budget.ts`'s resolution
  stepping, and `isXRSupported()`'s three branches (API present, absent,
  `navigator` undefined for an SSR-safe check even though this app has no
  server, per D6 in the main spec).
- **Emulator in desktop Chrome.** The WebXR emulator (IWER, via
  `createXRStore({ emulate })`, gated by L2) drives session start, grab-free
  locomotion, the hand menu and the viewfinder in CI-adjacent manual runs,
  the same role it played for the spike (VR operator spec 4.8). A Playwright
  project targeting Chromium with the emulator flag is added
  (`e2e/xr-scout.spec.ts`): enter VR, confirm `editorStore.xrActive` becomes
  true, open the hand menu, select a different shot, confirm `activeShotId`
  and the route both update, confirm no `documentStore` mutation fired (a
  spy on `apply`), exit VR.
- **Flat regression on every VR PR.** Every existing S0 to S3/M3 Playwright
  spec and the domain/state/storage suites run unchanged with
  `navigator.xr` absent (the default in CI's Chromium and WebKit profiles),
  confirming the flat editor is unaffected by `src/xr/` existing (VR
  operator spec 8; main spec, Testing and CI). This is a CI gate, not a
  manual step: a PR that makes any flat suite depend on `@react-three/xr`
  being resolvable fails the build, since `src/xr/` is never in the flat
  bundle's import graph (3, rule 1).
- **Bundle-size check.** A CI step asserts the flat editor's main chunk (the
  bundle loaded before Enter VR is clicked) does not import
  `@react-three/xr`, `@react-three/xr`'s own dependency graph, or `three/xr`,
  using the build's own chunk manifest (Vite's `rollup.output` stats,
  already produced by the existing build job). This is the automated form of
  D1's promise that the flat editor never pays for VR code.
- **Headset checklist, run by Nick.** One page in this spec's own PR
  description or a `docs/superpowers/specs/2026-09-25-vr-scout-design.md`
  sibling checklist file, mirroring the spike's README checklist style (VR
  operator spec 4.8, "Nick: the five questions with the headset on"):
  1. Enter VR from Shot 01. Stand where `OperatorRig` places you; confirm
     the doll in the set reads at a believable height (D2, true scale).
  2. Open the hand menu, select Shot 02: confirm the operator repositions
     behind Shot 02's camera and the viewfinder updates to Shot 02's frame.
  3. Teleport around the set; confirm you cannot teleport outside the
     floor's built footprint. Snap-turn through a full circle.
  4. Compare the hand-mounted and world-fixed viewfinders (8); judge framing
     legibility on each, as the spike's question 3 did, and note a
     preference (feeds the Spike gate, row 3).
  5. Toggle tabletop scale; confirm the set shrinks and locomotion still
     works, then toggle back.
  6. Watch a shot with object and pose tracks (M3) play through in VR;
     confirm it matches what the flat page shows for the same shot.
  7. Read the debug overlay's draw-call, triangle and fps numbers at each
     viewfinder resolution step; record them (feeds the Spike gate, row 1,
     if the dedicated Quest spike run has not already produced numbers).
  8. Exit VR from the headset's own menu (not the app's button); confirm
     the flat page is exactly as left, with no error toast.
- **Verification, both browsers, before calling V1 done.** Per this repo's
  own AGENTS.md rule and the main spec's Testing and CI section: the flat
  page (Enter VR button hidden or shown correctly) is checked in Chrome and
  Safari on the deployed preview, not only localhost, before any build slice
  below is marked complete.

## 14. Error handling

| Situation | Behavior |
|---|---|
| No WebXR (`navigator.xr` absent: Safari, Firefox, no headset) | Enter VR button does not render (D5, 4). The rest of the shot page is unaffected. |
| `navigator.xr` present but no session available (desktop Chrome, no headset, no emulator flag) | Button renders; clicking it and having the browser reject the session shows a toast, "This browser can't start VR," and the button re-enables. No partial session state (`xrActive` stays false). |
| `enterVR()`'s dynamic import fails (network) | Toast: "Couldn't load VR. Try again." Button re-enables. The flat page is unaffected; no store field changes. |
| Session ends mid-use (headset off, battery, browser menu, backgrounded tab) | Treated as a clean exit (3.2): `xrActive` returns to false, `XRBoundary` drops the `<XR>` wrapper, the flat page resumes exactly where it was. No take exists to lose in V1 (SC4), so there is nothing to save, unlike V2's "session ends mid-take" case. |
| Controller tracking lost during locomotion | Teleport and snap turn simply stop responding to that controller's input until tracking returns; no fallback pose is synthesized, since neither action depends on continuous tracking the way V2's handheld camera will. |
| Hand menu opened with no shots in the active scene | Cannot happen: a scene page has no VR entry point (4), and a shot page implies at least one shot exists (the shot being viewed). The menu always lists at least the active shot. |
| Teleport target aimed outside the set's floor footprint | The arc shows red (the library's default invalid-target styling) and release is a no-op; the operator stays where they were. |
| Teleport lands inside a solid prop's bounds | Not prevented in V1 (no navmesh, 6); the operator can stand inside geometry. Listed as a known rough edge rather than handled, since the spike's set was small enough not to surface it and a proper fix (navmesh or per-prop no-teleport volumes) is Out of scope, item 7. |
| A dense (VR-recorded) take is selected when Scout opens | Renders on the viewfinder identically to a sparse take; `cameraAt` already normalizes both (camera-and-motion 4.2). No special case in V1. |
| The selected take's blob is missing (`missingTracks`, camera-and-motion 3.3) | The viewfinder holds `track.first`, the same fallback the flat page uses; no VR-specific "track missing" badge in V1 (that UI lives in the flat Takes panel, camera-and-motion 7.5), since V1 has no take-management surface to show a badge on. |
| WebGL context lost during a session | The context-loss handling the main spec already defines (remount once, toast) fires the same way inside a session; if the remount cannot re-acquire an XR-capable context, the session ends and `xrActive` returns to false. |
| Viewfinder render target allocation fails at the top resolution step (device out of memory) | Falls back one step (11) and logs the failure to the debug overlay; does not crash the session. |
| Selecting a shot mid-teleport-arc (hand menu opened while aiming) | The library's own input priority resolves this (grip for the menu, trigger for teleport are different controllers and different inputs, 6-7), so the two never contend for the same button. |

## 15. Build slices

Each slice ends with the flat page verified in Chrome and Safari on the
deployed preview (per AGENTS.md), and, where a headset step is listed, that
step run by Nick before the slice is called done.

### V1a: the shell boundary, no headset behavior yet

`src/xr/entry.ts`, `xr-store.ts` (ported from the spike with L1 to L4
carried forward), `XRBoundary` in `src/viewport`, `editorStore.xrActive`,
the Enter VR button, the lint rule from section 3's rule 1, and the bundle-
size CI check.

- **Done when:**
  1. On Safari, the shot page shows no Enter VR button.
  2. On desktop Chrome with the WebXR emulator flag, clicking Enter VR
     flips `xrActive` to true and a session starts (asserted in the
     Playwright emulator test, 13).
  3. The bundle-size CI check passes: the flat editor's main chunk contains
     no `@react-three/xr` code.
  4. Exiting the session (via the emulator's exit control) returns
     `xrActive` to false and the flat page renders unchanged.
- **States covered:** no WebXR, WebXR present but session rejected, dynamic
  import in flight (button disabled), session started, session ended
  cleanly.

### V1b: standing in the set

`OperatorRig`, reusing `SceneContents` and `TrackApplier` unchanged inside
`XRExperience` (3, rule 2), true-scale placement (5), and `Locomotion` (6).

- **Done when:**
  1. Entering VR from a shot places the operator at the standoff distance
     behind that shot's frame-0 camera pose, facing the same direction.
  2. A doll in the set reads at a believable height against the operator
     (headset checklist item 1).
  3. Teleport moves the operator within the set's floor footprint and
     nowhere else; snap turn steps in 45° increments.
  4. The comfort rules (6) hold: nothing else moves the view.
- **States covered:** a shot with an empty set, a shot with props and dolls,
  a shot whose selected take is dense (renders the same as sparse, per
  `cameraAt`).

### V1c: the hand menu and shot switching

`HandMenu`, wired to `commands.selectShot` (7).

- **Done when:**
  1. Opening the hand menu on the left grip shows every shot in the active
     scene, the active one highlighted.
  2. Selecting a different shot calls `selectShot`, repositions the
     operator (V1b's placement, re-run), and the flat page's route updates
     to match if a second window or tab is watching it (camera-and-motion
     6.2's bidirectional sync).
  3. No `documentStore.apply` call fires from any hand-menu interaction (the
     Playwright spy assertion from 13).
- **States covered:** a scene with one shot, a scene with many shots, a
  shot switch while a take is mid-playback (pauses and reseeks per
  `selectShot`'s own definition, camera-and-motion 6.2).

### V1d: the viewfinder and playback

`Viewfinder` (both placements), frame lines, HUD readout, and confirming
`<PlaybackDriver />` runs unmodified inside a session (9).

- **Done when:**
  1. Both viewfinder placements render the shot's frame-0 pose correctly
     framed, matching the flat page's own viewport for the same shot and
     time (same `cameraAt` call, same `takeOptics`).
  2. Playback that was running on the flat page before Enter VR continues
     advancing at the headset's frame rate, and any object or pose tracks
     on the shot animate identically to the flat page (headset checklist
     item 6).
  3. The HUD readout on the monitor matches the flat viewport's HUD text
     for the same take and time.
- **States covered:** a static (one-key) take, a take with camera motion, a
  shot with object tracks, a shot with pose spans, a dense take.

### V1e: tabletop scale and the performance dial

`TabletopScale`, `perf-budget.ts`, the debug overlay.

- **Done when:**
  1. Toggling tabletop scale shrinks the set around the operator and
     locomotion still works at the new scale; toggling back restores true
     scale exactly (no drift after repeated toggles, a property test on
     `XROrigin.scale`).
  2. The viewfinder's framing is unaffected by the tabletop toggle
     (headset checklist item 5).
  3. Stepping the viewfinder resolution on the right stick changes the
     debug overlay's logged draw-call, triangle and fps numbers, and the
     three steps from the spike are all reachable.
- **States covered:** true scale, tabletop scale, each of the three
  resolution steps, a set heavy enough to visibly change fps between steps
  (the spike's greybox set plus the starter kit's twelve props, S2).

### V1f: headset run and spike-gate closeout

No new code. Nick runs the section 13 headset checklist on a Quest, and the
findings that were placeholders (`DEFAULT_VIEWFINDER_STEP`, the viewfinder
placement default, `TABLETOP_SCALE`) are updated to match, each as its own
small commit referencing the finding.

- **Done when:** every row in the Spike gate section below is filled in with
  a measured value instead of a default, and the corresponding constant in
  `src/xr/` is updated to match.
- **States covered:** none new; this slice closes out defaults set earlier,
  it does not add behavior.

## 16. Reserved for Nick

Small decisions with a real trade-off, left for implementation, each five to
ten lines of code (main spec, Reserved for Nick; sessions run in learning
mode).

1. **`OPERATOR_STANDOFF_M`, section 5.** 0.6 m is a guess at "not standing on
   top of the camera position." Too small and the operator's own body may
   clip the viewfinder's world-fixed placement (8); too large and the
   operator isn't really "at" the shot. Tune once standing in the headset.
2. **`TABLETOP_SCALE`, section 10.** A single number (e.g. `0.1`, a 10:1
   shrink) versus a per-set value computed from the set's bounding box, so a
   small set doesn't shrink to a point and a large set still fits in reach.
   Start with a fixed constant; switch to computed only if the fixed value
   feels wrong across more than one project.
3. **Tabletop toggle gesture, section 10.** A hand-menu button (this spec's
   default) versus a controller chord (e.g. both grips together) that needs
   no menu. The button is simpler to discover; a chord is faster once
   learned. Ship the button first.
4. **Teleport arc color and invalid-target styling, section 6.** The
   library's defaults versus a custom material matching the app's palette.
   Cosmetic; ship the default, restyle only if it looks wrong in the
   headset.

## 17. Out of scope

1. Grabbing, moving, or otherwise operating the shot's camera; recording a
   take. V2 (VR Operate handheld, M6).
2. Auto-throttling the performance budget from measured draw calls or
   triangle counts. V1 measures and logs (11) but never changes quality on
   its own; a policy for what degrades first is future work once a set is
   heavy enough to need it.
3. Rigs other than the implicit "none" a viewed take already carries. V3
   (VR Rigs, M7).
4. Entering VR from the scene page or the board. There is no shot camera to
   place the operator behind or frame the viewfinder from on those pages;
   VR entry stays a shot-page action until a later spec finds a reason to
   change that.
5. Standing in the set with no shot selected (a bare-set VR view). V1's hand
   menu always has an active shot (7); a "walk the set with no shot" mode is
   not requested by the roadmap and is left out rather than guessed at.
6. Playback transport controls (play, pause, scrub, loop) inside the
   headset. V1 shows whatever the clock is already doing (9); operator
   control over playback waits for an interaction model from V2 or V4.
7. A navmesh or per-prop no-teleport volumes preventing the operator from
   landing inside solid geometry. Listed as a known rough edge (14) rather
   than solved.
8. Hand tracking, multi-user sessions, in-headset video capture, a native
   VR client. Ruled out for the whole VR track by the VR operator spec,
   section 10.
9. Hearing "action" or "cut," slate and take numbering by voice. V4 (VR
   Director's calls, M8); V1's free probe reporting is not even V1's job
   (VR operator spec 4.1, "Free probe," which belongs to the dedicated
   Quest spike run, not this milestone's own headset checklist, though
   checklist item 7 in section 13 can supply the same numbers if the spike
   run has not happened yet).

## 18. Spike gate

Per R10 in the roadmap: anything the Quest spike measures is a default here,
confirmed or replaced by the spike's findings (VR operator spec 4.10) before
V1f (15) is called done. Each row names the default this spec ships with,
where it lives in code, and which spike question answers it.

| # | What | Default shipped in V1 | Code location | Confirmed by |
|---|---|---|---|---|
| 1 | Per-set performance budget: which viewfinder resolution step holds the headset's native refresh rate with the worst frame under twice the frame budget | `DEFAULT_VIEWFINDER_STEP = 1` (960×412), the spike's own likely pass point (VR operator spec 4.1, question 1's pass criteria) | `src/xr/perf-budget.ts` | Spike question 1, or headset checklist item 7 (13) if run standalone |
| 2 | Frame rate ceiling for a set the size of the starter kit plus a greybox room | Not yet measured; V1e's "heavy enough" fixture (15) is a guess at a representative set, not a verified budget | `src/xr/perf-budget.ts` (comment, no constant yet) | Spike question 1 |
| 3 | Viewfinder placement: hand-mounted, world-fixed, or both kept | Both render (SC5); no default is chosen yet | `src/xr/Viewfinder.tsx` | Spike question 3 (legibility), or headset checklist item 4 |
| 4 | Viewfinder monitor sizes: 0.16 m hand-mounted, 0.30 m world-fixed | Carried over unchanged from the spike's own defaults (VR operator spec 4.4) | `src/xr/Viewfinder.tsx` | Spike question 3 |
| 5 | `OPERATOR_STANDOFF_M` | `0.6` (Reserved for Nick, item 1) | `src/xr/OperatorRig.tsx` | Not a spike question; confirmed by the headset checklist (13, item 1) instead, since the spike's five questions do not cover operator placement (VR operator spec 4.1 lists frame rate, steadiness, legibility, takes-as-poses, dev loop only) |
| 6 | `TABLETOP_SCALE` | Unset placeholder pending a first headset session (Reserved for Nick, item 2) | `src/xr/TabletopScale.tsx` | Headset checklist item 5, not a spike question (tabletop view was not in the spike's scope, VR operator spec 4.2) |
| 7 | Dev loop for iterating on `src/xr/` (LAN HTTPS vs `adb reverse` vs a Vercel preview) | Same three options the spike tried, no V1-specific default; V1 assumes the spike's finding carries over since `src/xr/` reuses the same Vite dev server config | Not code; documented in this spec's own README pointer once written | Spike question 5 |

Rows 5 and 6 are marked because they are V1-specific decisions the spike's
five fixed questions (VR operator spec 4.1) do not cover; they are closed
out by the headset checklist in section 13 rather than by the spike report
in section 4.10, and R10's "anything the Quest spike measures" is read here
to include the piece-specific headset checklists R10 itself asks each V-spec
to carry (VR operator spec 8, "a headset checklist per V-piece, run by
Nick").

## 19. Open questions

1. **Should V1 show a persistent "you are in VR" indicator on the flat page
   for a second viewer watching the same project in another tab?** Default:
   no. The read-only second-tab notice (main spec, Storage; camera-and-motion
   6.3) already covers the general "someone else has this open" case, and a
   VR-specific banner is easy to add later without touching `src/xr/`.
2. **Does the hand menu need a search or filter once a scene has many
   shots?** Default: no, ship a plain scrollable list. Revisit if a real
   project's shot count makes the list awkward in the headset, which V1's
   own build slices (15) will surface during the headset checklist.
3. **Should `isXRSupported()` also check for at least one connected
   controller before showing the button?** Default: no. `navigator.xr`
   presence is the same signal the spike used (VR operator spec 4.9's Enter
   VR button, hidden only on `navigator.xr` absence); a headset present but
   controllers off is an edge case the session-rejection toast (14) already
   covers without a second capability check to maintain.

## 20. Changelog

- 2026-09-25: initial draft. Defines `src/xr/`'s folder layout and module
  boundaries (section 3) for M6, M7 and M8 to build inside; the dynamic
  import entry and session lifecycle; operator placement at 1:1 behind the
  selected shot's camera; locomotion and comfort rules from VR operator spec
  section 7; the hand-menu shot strip calling `selectShot`; the viewfinder
  monitor driven by `cameraAt` and `takeOptics`; playback reusing M3's clock
  unmodified; the tabletop scale view, kept and defaulted off; the per-set
  performance budget with viewfinder resolution as the dial; the
  `@react-three/xr` 6.6.30 pin and the four library gotchas (L1 to L4)
  carried forward from the spike; XR testing across the emulator, flat
  regression and a headset checklist; error handling; six build slices plus
  a spike-gate closeout slice; and the Spike gate section listing every
  default the Quest spike run (or, where the spike's five fixed questions do
  not reach, this milestone's own headset checklist) has to confirm.
- 2026-09-25: porting map added in the cross-spec review.
</content>
