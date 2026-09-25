# VR Operate, handheld: design spec (M6, piece V2)

> **Status:** exploration · **Stage:** draft for review, written 2026-09-25
> **Milestone:** M6 in the [roadmap](../../roadmap.md), size M, gated on M5 (VR Scout)
> **Builds approved by this document:** none until Nick approves it. Anything published from this work starts unlisted and is labeled `exploration`.
> **Related:** [camera and motion spec](2026-09-25-camera-and-motion-design.md) (M3, owns `Take`, `cameraAt`, the store commands this spec calls) · [VR operator spec](2026-09-18-vr-operator-design.md) (concept, sections 5 and 7) · [VR Scout spec](2026-09-25-vr-scout-design.md) (M5, the XR shell this spec builds on, written in parallel) · [main spec](2026-09-18-scene-builder-3d-design.md) (S0 to S2) · throwaway spike, `spikes/vr-camera-feel/` on `main`

## TL;DR

M6 turns the read-only VR shell from M5 into an operator's seat: grab the
shot's camera, carry it on the handheld rig, change lens, body and format,
and pull the trigger twice to record a take. The recording samples the
camera once per XR frame into the exact `Float32Array` layout M3's dense
track already defines, so a recorded take goes through `commitRecordedTake`
unchanged and replays on the flat page with no new code there. Start and
stop run on the trigger only; M8 adds voice on top of the same two events
later. The handheld rig, the recorder and the lens dial are ports of the
spike's `src/camera/handheld.ts`, `src/xr/Recorder.tsx` and
`src/xr/VirtualCamera.tsx`, with `handheld.ts`'s body still Nick's to write.
Take management (compare, delete, re-select, re-shoot on the same rig) and a
take that outlasts its shot both get VR-specific answers here, since the
flat editor's dialogs do not exist in the headset.

## 1. Problem

M5 lets Nick stand in a shot and look at it. Nothing in the headset can
change what is recorded: no grab, no lens change, no take. The camera
model, the recorder sampling shape and `commitRecordedTake` are all designed
in M3, and the spike proved the recorder pattern and the FOV math on the
desktop, but nothing wires a controller to them yet, and two questions the
spike never had to answer now matter: what happens to a take that runs past
its shot, and how does someone without a mouse manage more than one take.

## 2. Decisions

Decisions fixed elsewhere and cited here. They are not reopened by this
spec.

| # | Decision | Source | Made |
|---|---|---|---|
| C1 | A shot holds takes and one selected take; `Take.track` is sparse or dense; one `cameraAt(take, t)` samples both. | camera-and-motion C1 | 2026-09-25 |
| C5 | Dense tracks live in the IndexedDB blob store as a `.sbtk` binary; the document keeps take metadata only. | camera-and-motion C5, R4 | 2026-09-25 |
| C12 | Recorded takes are view-only in the flat editor; lens, body and format stay editable. | camera-and-motion C12 | 2026-09-25 |
| C15 | Dense blobs are immutable; duplicating a recorded take shares its blob. | camera-and-motion C15 | 2026-09-25 |
| D1 | "Action" starts playback and recording; "cut" stops both. The controller trigger and a voice detector emit the same two events; the trigger always works. | VR operator spec, decision 1 and section 5.5 | 2026-09-18 |
| D5 | A take stores timed camera poses; the clip renders afterward on the desktop. The headset never captures video. | VR operator spec, decision 5 | 2026-09-18 |
| D-rig | The handheld rig follows the hand through a smoothing filter; `smoothing = 0` returns the hand pose exactly. | VR operator spec 5.4 | 2026-09-18 |
| D-fail | Session ends mid-take → treated as cut, take saved. Tracking lost mid-take → hold the last good pose; a gap over 0.5 s ends the take. | VR operator spec section 7 | 2026-09-18 |

Decisions this spec makes. Each is a default Nick can overturn in review; the
ones with a real trade-off are repeated in section 10.

| # | Decision | Why |
|---|---|---|
| O1 | Grab distance is 0.25 m from the right controller to the camera body's origin, matching the spike. Releasing leaves the camera floating where it was, like a locked-off tripod, rather than dropping to the floor or snapping back to the shot's stored framing. | A grabbed prop that fell or teleported home would break the "camera as a physical object" feel the whole track is built on. |
| O2 | "Action" and "cut" are one control in V2: the right trigger toggles recording. Both events route through two named functions, `startAction()` and `cutAction()`, that M8's voice detector calls into later with no change to the recorder. | VR operator spec 5.5 already specifies this event shape; writing it now instead of a single `toggleRecording()` avoids a rename when M8 lands. |
| O3 | Lens changes in VR use the right thumbstick, left and right, one preset step per press, from the same `LENS_PRESETS_MM` list M3 defines. Body and format change from a hand-menu panel, not a controller axis, since they change rarely mid-session. | Matches the spike's control scheme, which the headset spike already validates for feel (pending the findings in section 11). Body and format are two more choices than there are spare axes. |
| O4 | A recorded take longer than its shot's `durationSec` extends the shot automatically: `commitRecordedTake` calls `setShotDuration(shotId, track.durationSec)` as part of the same undo step when the new take is longer. | Roadmap leaves this open for M6 to decide (open question 7 of camera-and-motion). The flat editor's dialog-based "Fit shot to take" has no VR equivalent, and refusing to save part of a take the operator just performed is worse than a shot that grew. |
| O5 | Take management in VR (compare, delete, re-select) lives entirely in the M5 hand menu's shot strip, extended with a take list per shot. No separate VR page or teleport-to-a-menu-room. | The hand menu already exists from M5 and already calls `selectShot`; a take list is one more panel in the same place, and it keeps every control reachable without leaving the set. |
| O6 | Re-shooting on the same rig means starting a new recording with the chosen take's `RigSetup` as the starting smoothing and lens, not a locked re-enactment. The operator can still move freely; only the numbers a fresh handheld take starts from come from the old take. | Piece V3 (M7) is where rigs constrain motion. In V2, "handheld" has no constraint to lock to, so "same rig" can only mean "same starting settings". |
| O7 | A dense blob write failure in VR keeps the take in memory, retries automatically up to three times with backoff, and shows "take not saved, retrying" on the viewfinder monitor. The operator can pull the trigger again to force a retry, or hold it for two seconds to discard. Nothing auto-discards. | The flat editor's Retry-and-Download fallback (M3, error handling) assumes a keyboard and a file save dialog, neither of which exists in the headset. |

### Alternatives considered

- **A dedicated "record" button on the camera body**, pressed with the left
  hand while the right holds the camera. Rejected: it needs two hands free
  at the moment of action, and the trigger the right hand already holds the
  camera with is the more natural control, as the spike found.
- **Locking a released camera back to its take's last saved framing.**
  Rejected by O1: it fights the "physical object" metaphor and makes letting
  go feel dangerous rather than safe.
- **Refusing to save a take longer than its shot, asking on the desktop
  later.** Rejected by O4: the operator has no way to know, mid-session,
  that their take will be refused, and losing a performance because a shot
  was 4 seconds too short is a worse failure than growing the shot.
- **A full take-compare view (two videos side by side).** Out of scope
  (section 11): M6 has no rendered clips yet (M4 owns that), so "compare" in
  VR means selecting each take in turn and watching the same replay through
  the viewfinder monitor, not a picture-in-picture.
- **Re-shoot as an exact re-enactment, replaying the old path as a ghost to
  follow.** Considered for O6, deferred: a ghost trail needs UI design of
  its own and is not needed to satisfy "compare, delete, re-select,
  re-shoot" from the VR spec's deferred-topics list. It is listed as an open
  question (section 10, question 3).

## 3. Design

### 3.1 Building on the M5 XR shell

Everything in this section runs inside the M5 XR shell: the dynamic-import
boundary, the XR store, locomotion, and the hand menu that already calls
`selectShot`. M6 adds no new entry point and no new top-level component
under `src/xr/`; it adds children mounted inside what M5 already renders.

- The M5 hand menu's shot strip gains a "Camera" panel (3.6, 3.7) the same
  way the flat editor's Takes panel sits beside its shot strip (camera and
  motion spec 7.5).
- The M5 viewfinder monitor (VR spec 4.4, `Viewfinder.tsx`) is reused
  unchanged. M6 adds a REC indicator and an elapsed-time readout to it; both
  are plain text draws, not new render passes.
- `cameraAt`, `resolveScene`, `hashShotState`, `takeOptics` and `vFovDeg`
  are the same functions the flat page calls (camera and motion spec 4).
  Nothing in `src/xr/` reimplements sampling, FOV or resolve.

### 3.2 Grabbing and releasing the camera

Ported from the spike's `VirtualCamera.tsx`, with the "flat mode flies a
scripted path" branch dropped (there is no flat fallback once inside a real
XR session) and the camera body's starting pose taken from the shot's
selected take (`cameraAt(selectedTake, playbackStore.time)`), not a fixed
spawn point.

```ts
// src/xr/operate/grab.ts
export type GrabState = { grabbed: boolean; offset: Matrix4 };

export function updateGrab(
  handPose: CameraPose,        // right controller's grip pose this frame
  handNear: boolean,           // within GRAB_DISTANCE_M of the camera body's origin
  gripPressed: boolean,
  cameraPose: CameraPose,      // the camera's own pose before this frame
  state: GrabState,
): { cameraPose: CameraPose; state: GrabState };
```

- **Grab.** On the first frame `gripPressed && handNear`, `state.offset` is
  computed once: the transform from the hand's pose to the camera's current
  pose, so the camera does not jump to the hand's position when picked up.
  Every later frame while gripped, `cameraPose = handheld(handPose ×
  offset, previousCameraPose, dtSec, smoothing)` (3.3).
- **Release.** On `!gripPressed`, `state.grabbed` clears and the camera
  keeps whatever pose it last held (O1). No rig runs while released; the
  camera is inert.
- **`handNear`** uses `GRAB_DISTANCE_M = 0.25`, the spike's constant,
  unchanged.
- The camera body mesh is excluded from its own lens camera's render, the
  same `sceneRefs.hideFromLens` trick the spike uses, so the operator never
  sees the camera's own housing in the viewfinder.

### 3.3 The handheld rig

`src/xr/rigs/handheld.ts` is the spike's `src/camera/handheld.ts` ported
with its tests, under the `Rig<S>` shape from the VR operator spec 5.4:

```ts
// src/xr/rigs/handheld.ts
export function handheld(
  hand: CameraPose, previous: CameraPose, dtSec: number, smoothing: number,
): CameraPose;
```

`smoothing` is the take's `RigSetup` value when `rig === "handheld"` (M3
3.1), 0 to 1, changed live from the lens-and-smoothing panel (3.6). The
spike's body is a stub (`return hand`, `HANDHELD_IMPLEMENTED = false`) and
is one of the two small decisions Nick writes during implementation
(section 8, "Reserved for Nick"), together with the frame-0 auto-key rule
M3 already reserved. The four filter-shape-agnostic tests the spike already
wrote travel unchanged: welded at `smoothing = 0`, converges on a held-still
hand, always returns a unit quaternion, and agrees within 1 mm and 0.1°
whether stepped at 72 Hz or 90 Hz. Two more tests are skipped until
`HANDHELD_IMPLEMENTED` flips to `true` (they assert that heavier smoothing
lags more), exactly as the spike's file already gates them.

M7 (VR Rigs) adds the other four rigs behind the same `Rig<S>` shape. M6
only wires handheld, since it is the only rig `RigSetup` supports being
recorded on before M7 ships tripod, dolly, crane and drone.

### 3.4 Recording

Ported from the spike's `Recorder.tsx`, with the dev-server POST replaced by
`commitRecordedTake` and the sample buffer's layout matching M3's dense
`Recording.samples` exactly, so no conversion happens between recording and
committing.

```ts
// src/xr/operate/recorder.ts
export type RecorderPhase = "idle" | "recording";

export const recorderStore: {
  phase: RecorderPhase;
  samples: number[];      // stride 8, growing during a take; see 3.4 buffer note
  startClock: number;     // playbackStore.time when recording began
};

export function beginRecording(): void;   // clears samples, pushes sample 0
export function endRecording(): Recording | null;  // null when under 2 samples (M3's "nothing recorded" case)
```

**Sampling.** One `<Recorder />` component, mounted only while an XR session
presents, calls a callback once per XR frame (the same `useFrame` ordering
guarantee M3 6.4 relies on for `PlaybackDriver`, run after it so the
sampled pose reflects that frame's playback tick):

```ts
useFrame((_, delta) => {
  if (recorderStore.phase !== "recording") return;
  const t = playbackStore.time;               // M3's clock, already ticking (3.5)
  pushSample(recorderStore.samples, t, runtime.cameraPose);
}, PLAYBACK_DRIVER_PRIORITY + 1);          // M3 6.4: runs after the clock ticks
```

`pushSample` is the spike's function unchanged: it appends `t, px, py, pz,
qx, qy, qz, qw` to a plain `number[]`, matching `TAKE_STRIDE = 8` and the
dense track's per-sample layout in M3 3.3. `t` comes from `playbackStore`,
not a local clock, so a recorded take's frame 0 is exactly the shot's frame
0 and a take recorded while looping is impossible (`play({ loop: false })`
in 3.5 guarantees this).

**Buffer, not `Float32Array`, during recording.** The recorder appends to a
plain `number[]` while sampling, as the spike does, because JS arrays grow
without a resize dance and a 60 s take at 90 Hz is only 43,200 numbers.
`endRecording` converts it once, at cut, into the `Float32Array` M3's
`Recording.samples` expects, and the conversion is where the encode step
(3.3's `encodeDenseTrack`) and `commitRecordedTake` take over.

**Cut path.**

```ts
export async function cutAction(shotId: string, take: Pick<Recording, "bodyId" | "formatId" | "lensMm" | "rig">): Promise<void> {
  playbackStore.pause();
  const rec = endRecording();
  if (!rec) { toast("nothing recorded"); return; }
  const recording: Recording = { ...take, samples: new Float32Array(rec.samples), sampleRateHz: estimateRate(rec.samples) };
  try {
    const newTakeId = await commitRecordedTake(shotId, recording);
    if (recording's durationSec exceeds the shot's durationSec) setShotDuration(shotId, recording's durationSec); // O4
    selectTake(shotId, newTakeId);  // commitRecordedTake already selects; explicit for readability
  } catch (e) {
    // O7: keep rec in memory, retry, show status. Never silently drop.
  }
}
```

`estimateRate` divides `sampleCount - 1` by the take's duration; it is not
assumed to be exactly 72 or 90, since a device's real frame pacing drifts.
`commitRecordedTake` (M3 6.2) already does the encode, `putDenseTrack`,
cache fill and `addTake` in one call; the recorder does not touch the blob
store or the document directly.

### 3.5 Start and stop, before M8's voice

Two named functions carry the "action" and "cut" events (O2), called today
only from the right trigger, and later also from M8's voice detector with
no change to their bodies:

```ts
// src/xr/operate/actions.ts
export function startAction(shotId: string): void {
  if (recorderStore.phase !== "idle") return;
  playbackStore.play({ from: 0, loop: false });   // M3's clock (6.4); also drives blocking playback for free
  beginRecording();
}

export function cutAction(shotId: string, meta: TakeMeta): Promise<void>;  // 3.4
```

- **Trigger mapping.** The right trigger, currently bound only to grip in
  M5's controller config (M5 owns that binding), toggles between these two
  functions: `phase === "idle"` calls `startAction`, `phase === "recording"`
  calls `cutAction`. This mirrors the spike's `toggleRecording`.
- **What plays during "action".** `playbackStore.play` is the same clock
  `PlaybackDriver` already advances from XR frames (M3 6.4), and
  `TrackApplier` already reads it to animate object and pose tracks. A
  scene with blocking on it therefore moves correctly under "action" with
  no new code here; wiring "action" and "cut" to voice, and any slate or
  take-numbering announcement, is M8's addition on top of this mechanism
  (roadmap ownership map).
- **Guard.** `startAction` is a no-op while already recording; `cutAction`
  is a no-op while idle. Both are no-ops when the shot camera is not
  grabbed (there is nothing to record from a floating, released camera,
  though the last pose it holds is still sampled, matching a locked-off
  shot recorded from a tripod-like state, which is a valid take).

### 3.6 Lens, body and format controls in VR

All three call the exact M3 store commands, on the shot's selected take, the
same functions the flat Takes panel calls:

| Control | Calls | Notes |
|---|---|---|
| Right stick left / right | `setLens(shotId, nextPreset)` | Steps through `LENS_PRESETS_MM` (M3 3.2), wrapping at the ends. One step per stick-left/right edge, debounced 200 ms so a held stick does not race through the list. |
| Hand-menu "Body" row | `setBody(shotId, bodyId)` | Four rows, one per `CameraBodyId` (M3 3.2). |
| Hand-menu "Format" row | `setFormat(shotId, formatId)` | Five rows, one per `FrameFormatId` (M3 3.2). Changing format redraws the viewfinder's frame lines immediately, since `takeOptics` and `vFovDeg` are read every frame already (3.1). |
| Hand-menu "Smoothing" slider | Sets the in-progress recording's rig smoothing, which the next `startAction` reads into `RigSetup.smoothing` | Not a document command; it only affects a take that has not been committed yet. Changing it mid-recording changes feel for the rest of that take, which is allowed: a real operator can lean into a shot differently partway through. |

Setting lens, body or format on the *selected* take while it is dense (a
prior recording) still works, per M3's C12: recorded takes stay editable on
these three fields, view-only on the path itself. This lets the operator
correct an exposure-adjacent lens choice on a take they already shot without
re-recording.

### 3.7 Take management in VR

The hand menu's shot strip (M5) gains a take list, one row per take on the
active shot, read from `documentStore` the same way the flat Takes panel
reads it (M3 7.5):

| Row shows | Row action (trigger click on the row) | Long-press | Calls |
|---|---|---|---|
| "Take 3 · Recorded 7.2 s · handheld · 35 mm" or "Take 1 · 1 key · 35 mm" | Select | n/a | `selectTake(shotId, takeId)` |
| Same, with a "track missing" or "longer than shot" badge when M3's conditions apply | Select | n/a | (read-only badge; O4 already resolved "longer than shot" for VR-recorded takes at commit time, so the badge only appears on a take imported or migrated from elsewhere) |
| Every row except the last remaining one | n/a | Hold 1.5 s, then confirm with a second trigger pull within 2 s | `deleteTake(shotId, takeId)` |
| Bottom row, "Re-shoot on Take N" | Trigger click | n/a | Seeds the next `startAction`'s `RigSetup.smoothing` and lens from Take N (O6), then behaves like a fresh recording |

- **Compare.** Selecting a take (`selectTake`) makes the viewport's shot
  camera follow that take immediately (M3's `ShotCameraRig` reads
  `cameraAt(selectedTake, t)` regardless of flat or VR), so pressing Space
  or its VR equivalent (a "Play" row at the top of the panel, calling
  `playbackStore.play({ from: 0 })`) replays whichever take is selected
  through the viewfinder monitor. Comparing two takes is: select A, play,
  select B, play. No side-by-side view exists in M6 (out of scope, 11).
- **Delete.** Uses M3's `deleteTake`, already refused on a shot's last take;
  the row for the last remaining take shows no delete affordance rather
  than a disabled one, since there is no cursor to hover a disabled control
  in VR.
- **Re-select.** `selectTake`, identical to the flat editor.
- **Re-shoot on the same rig.** O6: grabbing the camera and pulling the
  trigger after choosing "Re-shoot on Take N" starts a normal recording
  (3.4, 3.5) whose committed `RigSetup` is `{ rig: "handheld", smoothing:
  takeN.rig.rig === "handheld" ? takeN.rig.smoothing : DEFAULT_SMOOTHING }`
  and whose starting lens is `takeN.lensMm`. Nothing locks the operator's
  hand motion to Take N's path; only these two starting numbers carry over,
  and changing the smoothing slider (3.6) mid-recording still works.

### 3.8 A take longer than its shot

Resolved for VR by O4: `cutAction` compares the committed take's
`durationSec` (the last sample's `t`) with the shot's `durationSec` and, when
the take is longer, calls `setShotDuration(shotId, take.durationSec)` right
after `commitRecordedTake`, as a second command in the same user action (two
undo steps, since M3's commands are each their own step and `commitRecordedTake`
already returns before the duration check runs). A toast-equivalent line on
the viewfinder monitor reads "Take 4 · shot extended to 8.6 s" for two
seconds. The flat editor's "Fit shot to take" button (M3 7.5) still exists
for takes that get long through some other path (import, migration); it
never has anything to do for a VR-recorded take, since O4 already applied
it.

### 3.9 Tracking loss and session end mid-take

Both follow the VR operator spec's section 7 defaults directly, implemented
in the same `<Recorder />` component from 3.4:

| Situation | Behaviour |
|---|---|
| The right controller's pose reports as untracked (`XRInputSource` gives no grip pose this frame) while recording | The last good `runtime.cameraPose` is held and still sampled every frame (position and rotation both freeze; `pushSample` keeps running with the frozen pose), so the take gains a short static hold rather than a gap in the sample array. A gap timer starts on the first untracked frame. |
| Tracking returns within 0.5 s | The gap timer resets to 0. Recording continues normally; the take shows a brief static hold where the numbers say so, same as a locked-off moment a real operator might choose. |
| Tracking stays lost past 0.5 s | `cutAction` runs automatically, exactly as if the trigger had been pulled, saving what was recorded up to the freeze. A message ("tracking lost, take saved") shows on the monitor for two seconds. |
| The XR session ends while recording (headset removed, battery, browser menu, "End session") | The same `useEffect` pattern the spike uses on `useXR(s => s.session)` going from present to null calls `cutAction` once, saving the take. This runs even though the viewfinder and every XR-only component are about to unmount, because the store call and the blob write do not depend on the XR session still being active. |
| The XR session ends while idle (not recording) | No-op; nothing to save. |

### 3.10 Storage size and quota

No new storage code: `commitRecordedTake` already writes through
`putDenseTrack` (M3 3.3, 3.5) and the dense blob's size is `16 + 32 ×
sampleCount` bytes, unchanged from M3's numbers (a 60 s take at 90 Hz is
about 173 KB). What M6 adds is behaviour for the moment the write fails,
since the headset has no file-save dialog for M3's "Download (.sbtk)"
fallback:

- **On failure** (quota exceeded, or any rejection from `commitRecordedTake`),
  the take is not lost: `recorderStore` keeps the raw samples, and O7's
  automatic retry (up to three attempts, 1 s / 3 s / 8 s backoff) tries
  `commitRecordedTake` again without re-recording anything.
- **Status.** The viewfinder monitor shows "take not saved, retrying…"
  during backoff and "take not saved, pull trigger to retry" once the three
  automatic attempts are exhausted. A trigger pull while this message shows
  calls `commitRecordedTake` again instead of starting a new recording.
- **Discard.** Holding the trigger for two seconds while the failure message
  shows discards the samples and returns to idle, so a stuck failure never
  blocks recording a replacement take. This is the only way samples are
  lost in M6; nothing times out on its own.
- **No new quota UI.** M3's storage-status panel (main spec, Storage) is a
  flat-editor page; M6 does not build a VR equivalent. The failure path
  above is enough to keep a take safe until the operator is back at the
  desk to look at storage status.

## 4. New store surface

M6 adds no document store and no new document fields; every field it needs
(`Take.rig`, `RigSetup`, `DenseTrack`) already exists from M3. It adds one
session-only store, never persisted and never undoable, matching the shape
of M3's own session state (`editorStore`, `playbackStore`):

```ts
// src/xr/operate/recorder-store.ts
export type RecorderPhase = "idle" | "recording";
export const recorderStore: {
  phase: RecorderPhase;
  samples: number[];
  gapSec: number;             // running total of untracked time this take (3.9)
  smoothing: number;          // live value for the take in progress (3.6)
  failedTake: Recording | null;   // set on O7's failure path, cleared on retry success or discard
  retryCount: number;
};
```

Every M6 action calls only commands M3 already defines: `selectShot`,
`addTake` (indirectly, through `commitRecordedTake`), `commitRecordedTake`,
`selectTake`, `deleteTake`, `setLens`, `setBody`, `setFormat`,
`setShotDuration`, plus `playbackStore.play` / `pause` / `stop` / `seek` /
`tick`. No M3 command is renamed or redefined; O2's `startAction` and
`cutAction` are new names at the M6 layer that call into these, not
replacements for anything in `src/state/commands.ts`.

## 5. Error handling

| Failure | Behaviour |
|---|---|
| The right controller reports no session or no input source at all (never paired, or `xrStore`'s hand config drops it) | Grab and record are unavailable; the hand menu shows "connect the right controller" and every camera control is disabled. Locomotion (M5) keeps working. |
| `startAction` is called while already recording, or `cutAction` while idle | No-op (3.5). |
| `cutAction` runs with under 2 samples (grabbed and released within one frame, or "action" immediately followed by session end) | Matches M3's `commitRecordedTake` "nothing recorded" case: no take is added, the monitor shows "nothing recorded" for two seconds. |
| `commitRecordedTake` rejects (blob write failure, quota) | O7: retried automatically, then held for a manual retry or a discard. The document is untouched until a `commitRecordedTake` call actually succeeds. |
| The recorded take is longer than its shot | O4: the shot is extended automatically, one extra undo step. |
| Tracking lost on the right controller mid-take | Last pose held and sampled; auto-cut past 0.5 s (3.9). |
| XR session ends mid-take (headset off, battery, menu) | Treated as cut; the take is saved (3.9), matching the VR operator spec's failure table. |
| XR session ends mid-lens-change or mid-body-change (no recording in progress) | The store command (`setLens`, `setBody`, `setFormat`) already committed synchronously before the session teardown; nothing is lost. |
| `deleteTake` targets the shot's last remaining take | Refused by M3's own guard; the row shows no delete affordance for that case (3.7), so this mainly guards against a stale row from a fast double-input. |
| Grabbing a camera while a dense take with a missing blob (M3's `missingTracks`) is selected | Grab still works (the camera body is a UI object, not the blob); `cameraAt` holds `track.first` as it does on the flat page, so the camera starts from that held pose and a new recording (a fresh take) proceeds normally. |
| The lens stick is held down | Debounced to one step per 200 ms (3.6), so a held stick does not blow past the preset list in one frame. |
| `setShotDuration` in O4 would exceed `SHOT_MAX_SEC` (60 s) | Clamped by M3's existing rule; the take's own samples past 60 s still exist and still play, since M3 already allows keys and samples past `durationSec` and samples the track by clamping the query time. The monitor's toast reads "shot extended to 60.0 s (max)". |
| Re-shoot on a take whose rig is not `handheld` (a future M7 take selected as the "same rig" seed) | Falls back to `DEFAULT_SMOOTHING` and the take's own `lensMm`; M6 has no other rig to seed from until M7 ships (3.7, O6). |

## 6. Testing

Domain-level pieces (the handheld filter, the recorder's sample buffer, the
cut path's decision logic) are pure functions and are unit-tested in Node
with no XR runtime, following M3's pattern. XR-shell pieces are checked with
the WebXR emulator in desktop Chrome, per the VR operator spec's testing
section, plus a headset checklist run by Nick for feel.

**Recorder unit tests, with synthetic poses** (`src/xr/operate/recorder.test.ts`)

- `beginRecording` then three `pushSample` calls at `t = 0, 1/90, 2/90`
  produces a 24-number buffer (`TAKE_STRIDE = 8` × 3) in the exact order
  `t, px, py, pz, qx, qy, qz, qw` per sample, matching M3 3.3's dense
  sample layout.
- `endRecording` with under two samples returns `null` (the "nothing
  recorded" case).
- `endRecording` with two or more samples returns a `Recording` whose
  `samples` is a `Float32Array`, whose length is `TAKE_STRIDE × sampleCount`,
  and whose `sampleRateHz` is within 1 % of the synthetic pose generator's
  known rate for evenly spaced synthetic timestamps.
- A synthetic pose generator (constant velocity, constant angular velocity)
  fed through 90 samples at 1/90 s spacing gives a buffer whose decoded
  positions (via M3's `decodeDenseTrack`) are linear in `t` to within
  float32 precision.
- The gap-timer logic (3.9): feeding "untracked" frames for 0.4 s then a
  tracked frame resets `gapSec` to 0 and recording continues; feeding
  untracked frames past 0.5 s triggers `cutAction` exactly once, and the
  buffer's samples in that stretch all hold the last tracked pose.
- O4's duration check: a synthetic take with `durationSec = 8.6` committed
  to a shot with `durationSec = 4.0` results in exactly one call to
  `setShotDuration(shotId, 8.6)`; a take shorter than its shot results in
  zero calls.
- O7's retry: a `commitRecordedTake` stub that rejects twice then resolves
  succeeds on the third automatic attempt with no data loss; a stub that
  always rejects leaves `recorderStore.failedTake` set after three attempts
  and only clears it on an explicit discard.

**Determinism of replay**

- Recording the same synthetic pose sequence twice through `beginRecording`
  / `pushSample` / `endRecording` and comparing the two resulting
  `Float32Array`s gives byte-identical buffers (property test, `fast-check`,
  200 runs, following M3's convention).
- Encoding a recorded buffer with M3's `encodeDenseTrack`, decoding it with
  `decodeDenseTrack`, and sampling it with `cameraAt` at every recorded
  frame's own `t` reproduces that frame's position and rotation within
  1e-6, reusing M3's own `sampleDense` property test rather than
  duplicating it.
- A take committed through `commitRecordedTake` in a test using
  `fake-indexeddb` (M3's storage test setup) and then read back through
  `loadDenseTracks` gives the same sample count, digest and `cameraAt`
  output as before the round trip, exercising the exact path 3.4's
  `cutAction` uses.

**XR shell tests, WebXR emulator in desktop Chrome**

- Grab (3.2): moving the emulated right controller within `GRAB_DISTANCE_M`
  and pressing grip attaches the camera; releasing leaves it in place;
  grabbing again from a different hand position does not jump the camera
  (the offset is recomputed).
- Trigger toggling `startAction` then `cutAction` adds exactly one take to
  the active shot, selected, matching M3's `commitRecordedTake` contract.
- Lens stick steps through the preset list in both directions and wraps at
  the ends; `setLens` is called once per debounced step, not once per
  frame the stick is held.
- Session-end mid-recording (closing the emulated session) triggers exactly
  one `cutAction` and adds a take.

**Flat regression.** Every VR PR runs the existing flat Playwright smoke
suite (main spec, M3 additions) unmodified in Chromium and WebKit, with
`navigator.xr` absent, confirming M6's changes touch nothing the flat editor
depends on. A take recorded through the emulator in a Chromium XR test is
then opened on the flat shot page in the same suite and confirmed to play
back identically to `cameraAt` sampled directly, closing the loop the M3
roadmap done-when criterion for M6 asks for: "a handheld take recorded in
the headset lands on the shot as a new take and replays correctly on the
flat page."

**Headset checklist**, run by Nick once the Quest spike (section 11) has
passed and hardware is available: grab feel at each smoothing level, lens
swap while gripped, a full action-to-cut take at 35 mm and again at 85 mm,
deliberately covering the right controller's tracking camera to trigger the
0.5 s auto-cut, and removing the headset mid-take to confirm the take saves.

## 7. Porting map

Spike paths are relative to `spikes/vr-camera-feel/` in this repo, checked
with `ls` on 2026-09-25.

| Into | From | Source | How |
|---|---|---|---|
| `src/xr/rigs/handheld.ts` | VR spike | `src/camera/handheld.ts`, `handheld.test.ts` | Copy with tests. The filter body stays reserved for Nick (section 8, "Reserved for Nick"). |
| `src/xr/operate/grab.ts` | VR spike | `src/xr/VirtualCamera.tsx` (the grab-and-offset logic inside its `useFrame`) | Rebuild as a standalone pure function, dropping the flat-mode scripted-path branch (there is no flat fallback inside a real session) and the mesh-and-lens-camera JSX, which stays in the M5 viewfinder component. |
| `src/xr/operate/recorder.ts`, `recorder-store.ts` | VR spike | `src/xr/Recorder.tsx`, `src/camera/take.ts` (`pushSample`, `sampleCount`) | Port the sampling and phase logic; replace the dev-server `POST /takes` with `commitRecordedTake` (M3 6.2); drop the fps-meter and jitter-test phases, which belonged to the spike's own questions 1 and 2 and are answered, not re-run, by M6. |
| `src/xr/operate/actions.ts` (`startAction`, `cutAction`) | VR spike | `src/xr/Recorder.tsx` (`toggleRecording`, `stopRecording`) | Rebuild against M3's `playbackStore` and `commitRecordedTake` instead of the spike's own `useSpikeStore` phase machine. |
| Lens stick handling | VR spike | `src/xr/ControllerInput.tsx` (stick-edge reads), `src/input/edges.ts` | Port the edge-detection helper; replace `LENSES_MM` (six values) with M3's twelve-value `LENS_PRESETS_MM` and `setLens` in place of a local index. |
| Viewfinder REC indicator and elapsed time | VR spike | `src/xr/Viewfinder.tsx`, `src/ui/text-canvas.ts` | Add two more text draws to the monitor pass the M5 spec already builds; no new render target. |
| Take list panel | Scene Builder v2 (idea only) | `components/PackageTab.tsx` (take rows, badges) | Rebuild the row shape for the hand menu's input model (trigger click and long-press instead of mouse click and menu); the file is not copied. |
| Not ported | VR spike | `src/xr/DebugPanel.tsx` (fps average, worst frame, jitter readout) | Those numbers answered spike questions 1 and 2, recorded in the VR operator spec 4.10; M6 ships without a debug overlay. |
| Not ported | VR spike | `src/store.ts` (`useSpikeStore`'s `phase: "jitter" | "replaying"` states) | The spike's own jitter test and standalone replay page are throwaway scaffolding; M6's "compare" (3.7) reuses `playbackStore.play`, not a spike-specific replay phase. |

## 8. Build slices

M6 is size M, built as two slices, each with its own implementation plan and
PR. Each slice ends with a preview verified with the WebXR emulator in
Chrome and, once hardware is available, on a Quest. The gate is M5 closed:
M6 needs the XR shell, the hand menu and the viewfinder monitor mounted and
working read-only first.

### M6.1 Grab, handheld rig, record and commit (M)

`handheld.ts` ported with its tests (Nick fills in the body), grab and
release (3.2), the recorder and its store (3.4), `startAction` /
`cutAction` on the right trigger (3.5), O4's shot-extension check, O7's
retry and discard path, and tracking-loss / session-end handling (3.9).

- **Done when:**
  1. Grabbing the shot's camera and pulling the trigger, then pulling it
     again after moving the headset, adds a new take to the active shot,
     selected, and the flat editor's shot page plays it back with the same
     move `cameraAt` produces directly (a byte-level check against the
     emulator's recorded samples, per section 6).
  2. Releasing the camera mid-recording keeps recording from wherever the
     camera was left; a second grab resumes carrying it with no jump.
  3. A take recorded longer than its shot leaves the shot extended to the
     take's length, one extra undo step on the flat page's undo history.
  4. Covering the right controller for 0.6 s during a recording ends the
     take automatically and the flat editor shows it with a static hold at
     the covered moment.
  5. Removing the headset (or ending the emulated session) mid-recording
     saves the take exactly as a manual "cut" would.
- **States covered:** camera released, camera grabbed and idle, recording,
  recording with tracking loss, recording ended by session teardown, commit
  failure and its retry path (mocked in the emulator test), a shot whose
  duration the take extends versus one it does not.

### M6.2 Lens, body, format and take management (M)

The lens stick, the hand-menu body and format rows (3.6), the take list
panel with select, delete and re-shoot-on-the-same-rig (3.7), and the
viewfinder's REC indicator and elapsed-time readout.

- **Done when:**
  1. Stepping the lens stick through its full range and back changes the
     viewfinder's frame and the readout on the monitor, matching the
     values `takeOptics` produces for each preset.
  2. Changing body or format from the hand menu re-masks the viewfinder
     immediately and the change is visible on the flat editor's Takes
     panel after leaving VR.
  3. The take list shows every take on the active shot with the same
     badges the flat editor's Takes panel would show for the same shot;
     selecting a row changes what the viewfinder plays.
  4. Deleting every take but one removes the delete affordance from the
     last row; attempting delete on it (forcing the call in a test) is
     refused, matching M3's guard.
  5. "Re-shoot on Take 2" followed by a fresh grab-and-record starts the
     new take's smoothing and lens from Take 2's values, confirmed by
     reading the committed take's `RigSetup` and `lensMm`.
- **States covered:** shot with one take, shot with several takes mixing
  sparse and dense, a take with a missing blob selected for re-shoot, empty
  lens/body/format panels before any selection exists (should not occur, so
  the panel asserts a selected take exists at mount, matching M3's
  invariant that a shot always has one).

### Reserved for Nick

Sessions run in learning mode, as in the main spec and the camera-and-motion
spec. One small decision, five to ten lines, is left for Nick to write
during implementation:

- The handheld filter's body in `src/xr/rigs/handheld.ts` (3.3), already
  reserved by the VR operator spec 5.4 and the spike's own file. M6 is
  where it first has to actually run, since the spike never reached the
  headset.

## 9. Out of scope

- Tripod, dolly, crane and drone rigs, and any rig-placement UI: M7 (VR
  Rigs).
- "Action" and "cut" by voice, keyword detection, slate and take numbering:
  M8 (VR Director's calls). M6 wires the two events the trigger emits so M8
  can add a second emitter with no change to `startAction` / `cutAction`.
- Rendering a clip from a take, or any preview video: M4 (Outputs). The
  viewfinder monitor shows the live camera and, for a selected take,
  replayed poses through `cameraAt`; it never shows a rendered clip.
- A side-by-side or picture-in-picture take compare view. Comparing takes
  in M6 means selecting and replaying each in turn (3.7).
- A ghost trail replaying a chosen take's path while re-shooting on the
  same rig. Listed as an open question (12, question 3).
- Hand tracking, multi-user sessions, and any other item the VR operator
  spec's section 10 already rules out for the whole track.
- A VR storage-status panel (3.10); the flat editor's stays the only one.
- Hardware other than the Meta Quest 2, 3, 3S or Pro in the Meta Quest
  Browser, per the VR operator spec's target hardware.

## 10. Open questions

Each has a default, already written into the sections above. Nick's answer
overrides it.

1. **Grab distance and release behaviour.** Default: 0.25 m, matching the
   spike; release leaves the camera floating in place (O1). The alternative
   is snapping a released camera back onto a rig's constraint, which has no
   meaning yet since M6 only has the unconstrained handheld rig.
2. **Lens control mapping.** Default: right stick steps through presets,
   body and format live in the hand menu (O3). The alternative puts body
   and format on a second controller axis, trading a menu tap for a second
   thing to remember which stick does what.
3. **Re-shoot fidelity.** Default: only smoothing and starting lens carry
   over from the seed take (O6); no ghost trail. The alternative renders the
   seed take's path as a translucent trail the operator can chase, which is
   more useful for matching a move exactly but needs its own visual design
   pass before it is worth building.
4. **Automatic shot extension on a long take.** Decided 2026-09-25 by Nick: extend
   automatically, one extra undo step (O4). The alternative refuses the
   commit and asks on the desktop later, which risks losing a take the
   operator believes was saved.
5. **Retry count and backoff on a failed commit.** Default: three automatic
   attempts at 1 s / 3 s / 8 s, then manual retry or discard (O7). The
   numbers are arbitrary and easy to change; they exist so a transient
   quota hiccup does not need a manual retry at all.
6. **Tracking-loss gap before auto-cut.** Default: 0.5 s, taken directly
   from the VR operator spec's section 7 table. Not reopened here; listed
   for visibility since it is the one number in this spec that another
   document already fixed.

## 11. Spike gate

The Quest headset spike (roadmap, "Parallel track: the Quest spike") gates
M5, not M6 directly, but every headset-only claim in this spec is a default
until that run happens, because M6 is the first milestone that puts a real
recording loop in front of Nick's hands:

| What the spike measures | Where it feeds this spec | Status |
|---|---|---|
| Steadiness at each smoothing level (spike question 2) | Whether the default smoothing levels (`0, 0.33, 0.66, 0.9`, unchanged from the spike's constants) feel right on the handheld rig once Nick's filter body (3.3) is written | Pending. VR operator spec 4.10 reads `pending` on every row as of this writing. |
| Legibility of the viewfinder monitor (spike question 3) | Whether the REC indicator and elapsed-time readout (3.1) are visible on the monitor placement the spike settles on | Pending, same table. |
| Takes surviving the trip to the desk (spike question 4) | Confirms the sampling shape in 3.4 is exactly what M3's dense track expects; this spec assumes a pass, since the shapes are unchanged from the spike's own `take.ts` | Pending; a no-go here would mean the dense track layout itself needs to change, which is M3's contract, not M6's. |
| Frame rate while recording and rendering the viewfinder (spike question 1) | Whether recording (one more `useFrame` subscriber) can run alongside the viewfinder pass without dropping below refresh rate | Pending. If the spike's frame budget was already tight at the passing resolution, M6.1's implementation plan should re-measure with the recorder mounted. |

Until these rows read something other than `pending` in the VR operator
spec, treat every smoothing level, monitor placement and resolution number
this spec cites as inherited defaults, not confirmed feel.

## Changelog

- 2026-09-25: initial draft. Builds M6 (VR Operate, handheld) on the M3
  camera-and-motion contracts and the M5 XR shell (referenced generically,
  written in parallel); decides grab and release behaviour, the
  action/cut event split ahead of M8's voice layer, lens/body/format
  controls, take management in VR, automatic shot extension for a long
  take (O4), and VR-specific handling for storage failures, tracking loss
  and session end mid-take; ports the spike's handheld rig, recorder and
  lens-stick handling with their tests.
