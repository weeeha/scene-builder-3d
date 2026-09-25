# Camera and motion: design spec (M3)

> **Status:** exploration · **Stage:** draft for review, written 2026-09-25
> **Milestone:** M3 in the [roadmap](../../roadmap.md), size L, gated on M2 (S2 Props)
> **Builds approved by this document:** none until Nick approves it. Anything published from this work starts unlisted and is labeled `exploration`.
> **Related:** [main spec](2026-09-18-scene-builder-3d-design.md) (S0 to S2, and S3 in outline) · [VR operator spec](2026-09-18-vr-operator-design.md) (piece F, sections 5 and 6) · built S0 and S1 code on `origin/feat/s0-s1-walking-skeleton` (draft PR #3)

## TL;DR

- M3 merges two planned pieces into one milestone: the main spec's S3 (camera
  keys, move presets, timeline, object tracks, pose spans, auto-key, playback)
  and the VR spec's piece F (camera model v2: bodies, formats, takes, recorded
  paths).
- A shot holds a list of takes and one selected take. A take carries a body, a
  format, a lens, a rig and a camera track. The track is either sparse (keys
  authored in the flat editor) or dense (samples recorded in VR). One
  function, `cameraAt(take, t)`, samples both, and the viewport, the VR shell
  and the exporter call only that function.
- Dense samples live in the IndexedDB blob store as a small binary file. The
  project document keeps take metadata only, so the 500 ms whole-document
  autosave stays small. A synchronous in-memory cache keeps `cameraAt`
  synchronous.
- FOV comes from body, format and lens (VR spec 5.3). Film Planner's
  `lensToVFovDeg`, ported in S1, is deleted. The v1 to v2 migration converts
  each S1 lens so every existing shot frames the same picture.
- Blocking lives on the shot: object position tracks and doll pose spans,
  ported from Scene Builder v2. Takes vary the camera; the action stays put.
- The shot page gets a timeline under the viewport, running 0 to the shot's
  duration. Editing keys changes the selected take in place. "New take"
  duplicates it first.
- Every later spec (outputs, the four VR pieces, the AI bridge, the portfolio
  demo) builds on the types, function names and store actions in sections 3,
  4 and 6. Those names are contracts.

## 1. Problem

S1 gives each shot exactly one position key and one aim key, and its lens math
is wrong for any frame that is not 3:2. Nothing moves over time: `t` is a
parameter that `resolveSceneAll` accepts and ignores. The VR track needs
recorded camera paths, bodies and formats before any headset code can save a
take. Two data models were on the table for the camera (the main spec's
keyframe arrays and the VR spec's `CameraMove` union), and Nick picked a third
on 2026-09-25 that replaces both.

## 2. Decisions

Decisions fixed on 2026-09-25 and cited here. They are not reopened by this
spec.

| # | Decision | Source | Made |
|---|---|---|---|
| C1 | A shot holds takes and one selected take. Each take carries body, format, lens, rig and a camera track made of keyframes. Flat editing makes sparse keys; a VR recording makes dense keys; one `cameraAt(take, t)` samples both. S1 data migrates to one take with one key. This replaces the VR spec's `CameraMove` union and the main spec's `Shot.camera` keyframe arrays. | Camera model decision, [roadmap](../../roadmap.md) | 2026-09-25 |
| C2 | FOV comes from body, format and lens through the VR spec 5.3 formula. S1's `lensToVFovDeg` (full-frame 24 mm height, ignores format) is replaced in M3. | Lens decision, roadmap | 2026-09-25 |
| C3 | The timeline is per shot. Time runs 0 to the shot's duration, and the timeline sits under the viewport on the shot page. | R2 | 2026-09-25 |
| C4 | In the flat editor, editing keys changes the selected take in place. A "New take" button duplicates it. A VR recording always makes a new take. | R3 | 2026-09-25 |
| C5 | Dense VR tracks live in the IndexedDB blob store. Take metadata stays in the project document. | R4 | 2026-09-25 |
| C6 | M3 comes after M2 Props and before M4 Outputs, and merges VR piece F with S3. | Milestone order, roadmap | 2026-09-25 |
| C7 | Milestones carry sizes, never dates. | R1 | 2026-09-25 |

Decisions this spec makes. Each is a default that Nick can overturn in review;
the ones with a real trade-off are repeated in section 14.

| # | Decision | Why |
|---|---|---|
| C8 | Blocking (object tracks, pose spans) belongs to the shot. Takes hold only the camera. | A second take re-shoots the same action. VR "action" plays the shot's blocking while the operator records. |
| C9 | Keys snap to a 24 fps frame grid (`FPS = 24`). Two keys on one lane never share a frame. | A frame grid makes "same key" an integer compare, replaces Scene Builder v2's 0.05 s merge window, and gives M4 a default export rate. |
| C10 | The v1 to v2 migration keeps each S1 shot's picture: the lens number is converted so the vertical FOV is unchanged. | A shot Nick framed by eye must look the same after the upgrade. The old number was wrong anyway (C2). |
| C11 | New shots and migrated shots use body `full-frame` and format `21:9`. | 21:9 is the aspect of S1's thumbnails and Film Planner's 2520 × 1080 clips. |
| C12 | Recorded (dense) takes are view-only in the flat editor. Lens, body and format stay editable on them. | Editing hundreds of samples by hand has no useful UI. Turning a recording into keys belongs to take management in M6. |
| C13 | Selecting a take is a document edit: saved and undoable. | The selected take decides what exports and what the thumbnail shows. |
| C14 | Auto-key is off when the app opens. | S1's write-target switch keeps working unchanged until Nick arms auto-key. |
| C15 | Dense blobs are immutable. Duplicating a recorded take shares its blob. | Sharing is free and safe when nothing ever rewrites a blob. |

### Alternatives considered

- **Keep the VR spec's `CameraMove` union** (`framings` with start and end,
  or `path` with samples). Two shapes means two samplers and two editors, and
  `framings` caps a flat move at two framings. Replaced by C1.
- **Keep S1's separate `position` and `aim` keyframe arrays.** Position and
  aim keys at different times make a key hard to show as one diamond, and
  there is nowhere to put roll or easing per key. Replaced by one
  `CameraKey` holding both.
- **Dense samples as a JSON number array inside the document** (the VR spec's
  first sketch). A 10 s take at 90 Hz is 60 to 100 KB of JSON, rewritten on
  every autosave. Ruled out by C5.
- **Blocking per take.** Lets each take carry different action, but the VR
  operator would have to choose which take's action to play before recording,
  and the flat timeline would change under your hands on every take switch.
- **Catmull-Rom spline paths between keys.** Smoother three-key moves, at the
  cost of overshoot handling and tangent UI. Linear segments with per-key
  easing ship first; splines are in section 13.
- **Preserve the lens number in the migration** instead of the picture. Every
  migrated shot would suddenly frame tighter by a factor of about 1.56. See
  section 14, question 1.

## 3. Data model

Units stay metres, Y up, feet at `y = 0`. Angles in the document are radians.
Time is seconds from the shot's start. Everything below is plain TypeScript in
`src/domain`, with no React and no three.js.

### 3.1 Types

Types not listed here (`Vec3`, `Transform`, `PoseName`, `StageObject`,
`PropAsset`, `ObjectOverride`, `Scene`, `ShotType`) are unchanged from S1's
`src/domain/types.ts`.

```ts
// src/domain/types.ts, schemaVersion 2

export type Quat = [number, number, number, number];           // x, y, z, w; unit length
export type CameraPose = { position: Vec3; rotation: Quat };   // the camera looks down its local -Z, as in three.js
export type Framing = { position: Vec3; aim: Vec3 };           // kept from S1; the authoring form of a pose

export type CameraBodyId = "full-frame" | "super35" | "mft" | "super16";
export type FrameFormatId = "16:9" | "1.85:1" | "2.39:1" | "21:9" | "4:3";

export type CameraBody = { id: CameraBodyId; name: string; sensorWmm: number; sensorHmm: number };
export type FrameFormat = {
  id: FrameFormatId;
  name: string;
  aspect: number;      // width / height
  exportW: number;     // pixels, even
  exportH: number;     // pixels, even
};

export type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";

export type CameraKey = {
  id: string;
  t: number;           // seconds, on the 1/24 s frame grid
  position: Vec3;
  aim: Vec3;           // the point the camera looks at
  roll: number;        // radians about the view axis; 0 keeps the horizon level
  ease: Ease;          // shapes the segment from this key to the next one
};

export type SparseTrack = { kind: "sparse"; keys: CameraKey[] };   // 1 or more keys, sorted by t, one per frame

export type DenseTrack = {
  kind: "dense";
  blobKey: string;       // blob store key, BlobKind "track"
  digest: string;        // SHA-256 hex of the blob bytes; survives export and import
  sampleCount: number;   // 1 or more
  sampleRateHz: number;  // nominal rate while recording, 72 or 90 on a Quest
  durationSec: number;   // t of the last sample
  first: CameraPose;     // held by cameraAt while the blob is missing
};

export type CameraTrack = SparseTrack | DenseTrack;

export type RigSetup =
  | { rig: "none" }                                // keys authored in the flat editor
  | { rig: "handheld"; smoothing: number }         // 0..1, meaning defined by handheld.ts (VR spec 4.4)
  | { rig: "tripod"; position: Vec3 }
  | { rig: "dolly"; from: Vec3; to: Vec3 }
  | { rig: "crane"; pivot: Vec3; armLength: number }
  | { rig: "drone" };

export type Take = {
  id: string;
  number: number;        // 1, 2, 3 within its shot; never reused after a delete
  createdAt: string;     // ISO 8601, like Project.createdAt
  bodyId: CameraBodyId;
  formatId: FrameFormatId;
  lensMm: number;        // fixed for the whole take; zoom lenses are out of scope
  rig: RigSetup;         // kept so the rig can be drawn again and the take re-shot on it
  track: CameraTrack;
};

export type ShotCamera = {
  takes: Take[];          // 1 or more, in creation order
  selectedTakeId: string; // always one of takes[].id
};

export type ObjectKey = { id: string; t: number; position: Vec3; rotationY: number; ease: Ease };
export type PoseKey = { id: string; t: number; pose: PoseName };

export type ShotTracks = {
  objects: Record<string, ObjectKey[]>;   // by set object id; 1 or more keys, sorted by t
  poses: Record<string, PoseKey[]>;       // by doll id; 1 or more keys, sorted by t
};

export type Shot = {
  id: string;
  name: string;
  type: ShotType;
  durationSec: number;                    // 0.5 to 60, on the frame grid
  camera: ShotCamera;
  overrides: Record<string, ObjectOverride>;
  tracks: ShotTracks;
  thumb?: { blobKey: string; stateHash: string };
};

export type Project = {
  id: string;
  name: string;
  schemaVersion: 2;
  createdAt: string;
  updatedAt: string;
  lastExportedAt?: string;
  scenes: Scene[];
  props: PropAsset[];
};
```

Changes against the VR spec 5.1 sketch, on purpose:

- `Take.v` is gone. The project's `schemaVersion` versions takes, and the
  dense blob header versions the sample layout (3.3). A native client reads
  the same two version numbers.
- `Take.createdAt` is an ISO string instead of epoch milliseconds, to match
  every other timestamp in the document.
- `Take.move` became `Take.track`, and the `framings | path` union became
  `sparse | dense` (C1).
- `Take.durationSec` is gone. The shot's `durationSec` decides what plays and
  what exports. A dense track carries its own recorded length.
- `RigSetup` gained `{ rig: "none" }` for flat-authored takes.
- `ShotCamera.selectedTakeId` is never null: a shot always has at least one
  take, and deleting the last take is refused.

### 3.2 Bodies, formats and lenses

Preset data in `src/domain/optics.ts`. These lists are final for M3 (the VR
spec deferred them to piece F). Custom bodies and formats are out of scope.

| `CameraBodyId` | Name | Sensor W × H (mm) |
|---|---|---|
| `full-frame` | Full frame | 36.00 × 24.00 |
| `super35` | Super 35 | 24.89 × 18.66 |
| `mft` | Micro Four Thirds | 17.30 × 13.00 |
| `super16` | Super 16 | 12.52 × 7.41 |

Export dimensions follow one rule: the short side is 1080 px and the long side
is `1080 × aspect` rounded to the nearest even number. Even sizes keep H.264's
4:2:0 chroma happy. The 21:9 row equals Film Planner's `CLIP_WIDTH` and
`CLIP_HEIGHT` in `src/stage/render/clip-constants.ts`.

| `FrameFormatId` | Name | Aspect | Export (px) | Thumbnail (px) |
|---|---|---|---|---|
| `16:9` | 16:9 HD | 1.7778 | 1920 × 1080 | 320 × 180 |
| `1.85:1` | 1.85 flat | 1.85 | 1998 × 1080 | 320 × 173 |
| `2.39:1` | 2.39 scope | 2.39 | 2582 × 1080 | 320 × 134 |
| `21:9` | 21:9 | 2.3333 | 2520 × 1080 | 320 × 137 |
| `4:3` | 4:3 | 1.3333 | 1440 × 1080 | 320 × 240 |

Constants in `src/domain/optics.ts` and `src/domain/time.ts`:

```ts
export const DEFAULT_BODY_ID: CameraBodyId = "full-frame";
export const DEFAULT_FORMAT_ID: FrameFormatId = "21:9";
export const DEFAULT_LENS_MM = 35;
export const LENS_MIN_MM = 6;        // S1 clamped 12..200; the migration can produce 7.7 (5.1)
export const LENS_MAX_MM = 300;
export const LENS_PRESETS_MM = [14, 18, 21, 24, 28, 35, 40, 50, 65, 85, 100, 135] as const;

export const FPS = 24;               // frame grid for keys, stepping, and M4's default export rate
export const SHOT_MIN_SEC = 0.5;
export const SHOT_MAX_SEC = 60;
export const frameOf = (t: number): number => Math.round(t * FPS);
export const snapToFrame = (t: number): number => frameOf(t) / FPS;
```

Two keys are "at the same time" when `frameOf` returns the same integer. No
code compares key times as floats.

### 3.3 Takes and camera tracks

**Sparse tracks** are what the flat editor writes. A key holds a full framing
(position and aim) plus roll and easing, so one diamond on the timeline is one
key. `ease` on key `i` shapes the segment from key `i` to key `i + 1`; the
last key's ease is stored and ignored. A static shot is a sparse track with
one key.

**Dense tracks** are what a VR recording writes: one sample per XR frame,
`t` measured on the suite's playback clock (section 6.4), so `t = 0` is
"action". The document holds a `DenseTrack` record; the samples live in the
blob store under `blobKey` with `BlobKind` `"track"` (S1's `db.ts` gains the
kind, with no IndexedDB version bump because the kind is a field).

Binary layout, little-endian, version 1:

| Offset (bytes) | Type | Field |
|---|---|---|
| 0 | 4 × u8 | magic `SBTK` (0x53 0x42 0x54 0x4B) |
| 4 | u16 | layout version, `1` |
| 6 | u16 | stride in floats, `8` |
| 8 | u32 | `sampleCount` |
| 12 | f32 | `sampleRateHz` |
| 16 | f32 × 8 × `sampleCount` | per sample: `t, px, py, pz, qx, qy, qz, qw` |

- Size is `16 + 32 × sampleCount` bytes. A 10 s take at 90 Hz is 900
  samples, 28,816 bytes. A 60 s take at 90 Hz is 172,816 bytes. The same
  10 s take as rounded JSON measured about 100 KB in the spike.
- Float32 keeps position to about 8 µm at 100 m from the origin and time to
  about 4 µs at 60 s. Both are far below anything visible.
- The header is 16 bytes, so the sample block starts 4-byte aligned and
  decodes as a `Float32Array` view with no copy.
- `t` is non-decreasing. Quaternions are stored normalised.
- MIME type `application/octet-stream`. File extension in the zip: `.sbtk`.
- `digest` is the SHA-256 of the whole blob, header included. The hash
  (4.4) uses `digest`, never `blobKey`, because import assigns fresh blob keys
  (main spec, Storage).

The codec is pure, in `src/domain/dense-track.ts`:

```ts
export const TRACK_MAGIC = "SBTK";
export const TRACK_LAYOUT_VERSION = 1;
export const TRACK_STRIDE = 8;
export const TRACK_HEADER_BYTES = 16;

export class TrackFormatError extends Error {}

export function encodeDenseTrack(samples: Float32Array, sampleRateHz: number): ArrayBuffer;
export function decodeDenseTrack(bytes: ArrayBuffer): { samples: Float32Array; sampleRateHz: number };
// decode throws TrackFormatError on: wrong magic, unknown version, stride other than 8,
// byte length other than 16 + 32 × count, count 0, any non-finite float,
// decreasing t, or a quaternion with length under 0.5 (others are renormalised).
```

**The cache.** `cameraAt` must stay synchronous: the viewport calls it inside
`useFrame`, the VR shell at 72 to 90 Hz, the exporter once per frame. A plain
module-level map in `src/domain/dense-track-cache.ts` holds decoded samples by
blob key. It does no I/O; the storage layer fills it.

```ts
export const denseTrackCache: {
  get(blobKey: string): Float32Array | undefined;
  has(blobKey: string): boolean;
  set(blobKey: string, samples: Float32Array): void;
  delete(blobKey: string): void;
  clear(): void;
};
```

- **Fill.** Opening a project awaits `loadDenseTracks(project)` before the
  stage mounts: every dense take's blob is read in parallel, decoded and
  cached. Two hundred 10 s takes are about 5.8 MB of samples in memory.
- **Record.** A new recording is cached before its take enters the document,
  so the replay works on the very next frame (6.2, `commitRecordedTake`).
- **Clear.** Closing the project clears the cache.
- **Missing.** A dense take whose blob is absent or fails to decode is listed
  in `documentStore.missingTracks` (6.1). `cameraAt` holds `track.first` for
  it, and the take shows a "track missing" badge. A lost blob never breaks a
  shot, the same rule S2 applies to props.
- **Garbage.** Undo can remove a take whose blob redo will need again, so
  blobs are never deleted during a session. On project open, `track` blobs of
  that project that no take references are deleted.

### 3.4 Object tracks and pose spans

Ported from Scene Builder v2's `objectTracks` and `poseTracks`
(`lib/types.ts`, `lib/camera.ts`, `lib/store.ts`), with two changes: object
keys carry the full position and yaw instead of only x and z, and every key
has an id and an ease.

- **Object track.** `shot.tracks.objects[objectId]` animates the object's
  `position` and `rotationY`. Scale, size, colour and visibility are never
  animated. Between keys, position interpolates with the key's ease and yaw
  takes the shortest arc. Before the first key and after the last, the value
  clamps.
- **Pose spans.** `shot.tracks.poses[dollId]` is a step track: a doll holds
  the pose of the last key at or before the playhead's frame. Before the
  first key it holds its base pose (the set default, or this shot's override).
  The timeline draws each key as a span running to the next key, as Scene
  Builder v2's `components/Timeline.tsx` does.
- **Only on the shot page.** Tracks exist per shot. The scene page resolves
  with `shot = null` and shows the bare set, as in S1.
- **Cleanup.** Deleting a set object removes its overrides and its tracks in
  every shot, in the same undoable step. Duplicating a shot copies its tracks
  with fresh key ids.

### 3.5 Tracks, the write target and overrides

Order of truth when resolving an object at time `t`: set default, then the
shot's override, then the shot's track value at `t`. A track wins over an
override for the fields it animates; every other field still comes from the
override or the set.

Edits route through one pure function, `routeObjectEdit`, in
`src/state/edit-routing.ts`:

```ts
export type EditField = "transform" | "pose" | "other";   // other: scale, size, colour, visible
export type EditRoute = "set" | "override" | "key";

export function routeObjectEdit(ctx: {
  page: "scene" | "shot";
  field: EditField;
  writeTarget: WriteTarget;          // "set" | "shot", from editorStore
  autoKey: boolean;
  hasTrack: boolean;                 // the object has keys for this field in this shot
}): EditRoute;
```

| Page | Field | Track in this shot | Auto-key | Route |
|---|---|---|---|---|
| Scene | any | any | any | `set` |
| Shot | transform (position, yaw) | yes | any | `key` at the playhead |
| Shot | transform | no | on | `key`: starts a track (see below) |
| Shot | transform | no | off | the write target: `set` or `override`, as in S1 |
| Shot | pose (dolls) | yes | any | `key` at the playhead |
| Shot | pose | no | on | `key`: starts a pose track |
| Shot | pose | no | off | the write target |
| Shot | other | any | any | the write target |

- **An animated object always keys.** The second and fifth rows hold even
  with target Set, because a set edit would be hidden by the track on the
  next frame. Scene Builder v2 had the same rule for the same reason
  (`components/StageCanvas.tsx`, the translate commit). The write-target
  switch shows "Animated in this shot: moves add keys" while the selected
  object has a track.
- **Starting a track at a later time.** When auto-key starts a track and the
  playhead is past frame 0, the edit writes two keys: one at frame 0 holding
  the value from before the edit, and one at the playhead holding the new
  value. "Move the playhead, move the object, get motion" then works in one
  gesture. Scene Builder v2 wrote a single key, which holds still for the
  whole shot.
- **Scale in a keyed gizmo edit.** A gizmo commit that changes position and
  scale together sends the position and yaw to the key and the scale to the
  write target.

The camera follows the same idea through `routeCameraEdit`, used when the
orbit controls on the shot camera are released:

| Selected take | Keys | Auto-key | Framing edit |
|---|---|---|---|
| dense | n/a | any | Refused. The controls are not mounted; the view is locked. |
| sparse | 1 | off | Rewrites that key's framing. Its time is unchanged. This is S1's behaviour. |
| sparse | 1 | on | Upserts a key at the playhead's frame. On another frame that makes a second key. |
| sparse | 2 or more | any | Upserts a key at the playhead's frame. |

### 3.6 Invariants

Checked by the Zod schema (5.2) on every load and import, and kept by every
action:

1. Every shot has at least one take, and `selectedTakeId` names one of them.
2. Take ids are unique within the project. Take numbers are unique within a
   shot.
3. A sparse track has at least one key. Keys on every lane are sorted by `t`
   and no two share a frame.
4. `lensMm` is within `[LENS_MIN_MM, LENS_MAX_MM]`. `durationSec` is within
   `[SHOT_MIN_SEC, SHOT_MAX_SEC]`.
5. Every id in `shot.tracks.objects` names an object in the scene's set.
   Every id in `shot.tracks.poses` names a doll.
6. Every quaternion in the document has length within 1e-6 of 1.
7. Key times may run past `durationSec`. They are kept, sampled by clamping,
   and flagged on the timeline (7.3). Shortening a shot never deletes keys.

## 4. Functions

All pure, all in `src/domain`, all unit-tested in Node. Every function that
returns a `Vec3`, `Quat` or `CameraPose` returns fresh arrays, so a caller
writing into the result can never reach back into the document or the cache.
S1's `resolve.ts` already follows that rule.

### 4.1 FOV

`src/domain/lens.ts` is rewritten. S1's `lensToVFovDeg` and `vFovToLensMm`
are deleted; their callers (`ShotCameraRig.tsx`, `thumbnails.ts`) move to the
functions below. The first two are copied from the spike's
`spikes/vr-camera-feel/src/camera/fov.ts` with their tests.

```ts
export function usedSensorHeightMm(body: CameraBody, format: FrameFormat): number;
//   min(sensorHmm, sensorWmm / aspect)
export function vFovDeg(lensMm: number, body: CameraBody, format: FrameFormat): number;
//   2 · atan(usedHeight / (2 · lensMm)) · 180 / π
export function hFovDeg(lensMm: number, body: CameraBody, format: FrameFormat): number;
//   2 · atan(aspect · tan(vFov / 2))
export function lensMmForVFov(vFovDeg: number, body: CameraBody, format: FrameFormat): number;
//   usedHeight / (2 · tan(vFov / 2)); used by the migration
export function takeOptics(take: Take): {
  body: CameraBody; format: FrameFormat;
  vFovDeg: number; hFovDeg: number; aspect: number; exportW: number; exportH: number;
};
export function viewportFovDeg(frameVFovDeg: number, frameAspect: number, canvasAspect: number): number;
```

The formula crops the format out of the sensor. When the format is wider than
the sensor, the full width is used and the height is cropped; when it is
narrower, the full height is used and the sides are cropped.

`viewportFovDeg` fits the format's frame inside a canvas of any shape. When
the canvas is wider than the frame, it returns the frame's vertical FOV and
the viewport draws bars at the sides. When the canvas is narrower, the frame
fills the canvas width, bars go top and bottom, and the camera's vertical FOV
widens to `2 · atan(tan(frameVFov / 2) · frameAspect / canvasAspect)`, so the
region inside the bars is exactly the exported frame.

Fixtures, full frame at 21:9 (VR spec 5.3):

| Lens (mm) | 18 | 24 | 35 | 50 | 85 | 135 |
|---|---|---|---|---|---|---|
| Vertical FOV (deg) | 46.40 | 35.64 | 24.86 | 17.54 | 10.37 | 6.54 |

Fixtures at 35 mm across bodies and formats:

| Body | Format | Used height (mm) | Vertical (deg) | Horizontal (deg) |
|---|---|---|---|---|
| full-frame | 16:9 | 20.25 | 32.27 | 54.43 |
| full-frame | 2.39:1 | 15.06 | 24.29 | 54.43 |
| full-frame | 4:3 | 24.00 | 37.85 | 49.13 |
| super35 | 16:9 | 14.00 | 22.62 | 39.15 |
| mft | 16:9 | 9.73 | 15.83 | 27.76 |
| super16 | 16:9 | 7.04 | 11.49 | 20.28 |

More checks:

- Horizontal FOV for 35 mm on full frame is 54.43°, the figure lens charts
  give, for every format at least as wide as 3:2.
- `viewportFovDeg(24.86, 21/9, 16/9)` is 32.27°: a 21:9 frame letterboxed in
  a 16:9 canvas keeps the same width, so the canvas sees what a 16:9 frame
  would.
- `lensMmForVFov(vFovDeg(f, b, fmt), b, fmt)` returns `f` within 1e-9.

### 4.2 `cameraAt`

```ts
// src/domain/camera.ts
export function cameraAt(take: Take, t: number): CameraPose;
export function cameraAtInto(take: Take, t: number, out: CameraPose): CameraPose; // writes into out, no allocation
export function framingAt(track: SparseTrack, t: number): Framing & { roll: number };
export function sampleSparse(keys: CameraKey[], t: number): CameraPose;
export function sampleDense(samples: Float32Array, t: number): CameraPose;
export function lookRotation(position: Vec3, aim: Vec3, roll: number): Quat;
export function applyEase(ease: Ease, u: number): number;
```

`cameraAt` dispatches on `take.track.kind`:

- `sparse` calls `sampleSparse(track.keys, t)`.
- `dense` calls `sampleDense(denseTrackCache.get(track.blobKey), t)` when the
  cache has the blob, and returns a copy of `track.first` when it does not.

`cameraAtInto` gives the same result without allocating, for callers that run
every frame (the shot camera rig, the VR shell at 90 Hz). A test asserts the
two agree on every fixture.

**Sparse sampling.**

1. One key, or `frameOf(t)` at or before the first key's frame: that key's
   pose. At or after the last key's frame: the last key's pose.
2. Otherwise find the segment `[a, b]` with `a.t <= t < b.t` by binary
   search. `u = (t - a.t) / (b.t - a.t)`, then `e = applyEase(a.ease, u)`.
3. `position = lerp(a.position, b.position, e)`, `aim = lerp(a.aim, b.aim, e)`,
   `roll = lerp(a.roll, b.roll, e)`.
4. `rotation = lookRotation(position, aim, roll)`.

Interpolating the aim point and then looking at it is what S1, Film Planner
and Scene Builder v2 all do, so a move ported from any of them keeps its
shape. `framingAt` runs steps 1 to 3 and stops, for the orbit controls' target
and the key inspector.

**Dense sampling.** Ported from the spike's `poseAt` in
`spikes/vr-camera-feel/src/camera/take.ts`, onto a `Float32Array` with stride
8. Before the first sample it returns the first pose, after the last it
returns the last. Inside, it binary-searches the two samples around `t`, lerps
position and slerps rotation. Slerp takes the shorter arc and renormalises.

**Easing.** `applyEase(ease, u)` maps `u` in `[0, 1]` to the fraction of the
way from key `a` to key `b`:

| `Ease` | Curve | At u = 0.25 | At u = 0.5 |
|---|---|---|---|
| `linear` | `u` | 0.25 | 0.5 |
| `easeIn` | `u²` | 0.0625 | 0.25 |
| `easeOut` | `1 − (1 − u)²` | 0.4375 | 0.75 |
| `easeInOut` | `u² · (3 − 2u)` | 0.15625 | 0.5 |
| `hold` | `0` for `u < 1` | 0 | 0 |

`hold` keeps key `a`'s value until key `b`'s frame, then jumps: a cut inside
the shot. The exact curve shapes are reserved for Nick (section 12, "Reserved
for Nick"); the fixtures above change with them.

**Look rotation.** `lookRotation(position, aim, roll)` builds the rotation
whose local −Z points from `position` to `aim`, with world +Y as up, then
rotates by `roll` about the local Z axis. It equals three.js
`camera.lookAt(aim)` followed by `camera.rotateZ(roll)`, and the tests use
three.js as the oracle (tests may import three; `src/domain` may not).
Degenerate inputs:

- `aim` within 1e-6 m of `position`: forward is world −Z.
- Forward within 0.81° of straight up or down (`|forward · Y| > 0.9999`): up
  becomes world −Z, so looking straight down puts the top of the frame toward
  −Z. This fixture is tested on its own because three.js handles the pole
  differently.

### 4.3 `resolveScene` with tracks

The S1 signatures stay. Both functions now use `t`.

```ts
// src/domain/resolve.ts
export function resolveSceneAll(scene: Scene, shot: Shot | null, t: number): StageObject[];
export function resolveScene(scene: Scene, shot: Shot | null, t: number): StageObject[];
export function sampleObjectKeys(keys: ObjectKey[], t: number): { position: Vec3; rotationY: number };
export function dollPoseAt(keys: PoseKey[], base: PoseName, t: number): PoseName;
```

Per object, in set order:

1. Start from the set default (S1).
2. Apply the shot's override: transform, pose, visible (S1).
3. If `shot.tracks.objects[id]` has keys, replace `transform.position` and
   `transform.rotationY` with `sampleObjectKeys(keys, t)`. Scale stays.
   `sampleObjectKeys` uses the same segment search and `applyEase` as the
   camera, and interpolates yaw along the shorter arc: the difference is
   wrapped into `(−π, π]` before the lerp.
4. If the object is a doll and `shot.tracks.poses[id]` has keys, set
   `pose = dollPoseAt(keys, poseFromStep2, t)`: the pose of the last key
   whose frame is at or before `frameOf(t)`, else the step 2 pose.

`resolveScene` then drops invisible objects, as in S1. Tracks never change
`visible`.

The camera is not part of `resolveScene`. The viewport asks `cameraAt` for it
separately, so the VR shell can resolve the set once and drive its own camera
from a rig.

### 4.4 `hashShotState`

The signature is unchanged from S1's code (`src/domain/hash.ts`): `hashShotState(scene, shot, assets)`, async,
SHA-256 over `stableStringify` of the render-relevant slice. The slice becomes:

```ts
const value = {
  objects,                         // resolveScene(scene, shot, 0), names removed, prop unitScale added (as S1)
  tracks: renderTracks(shot.tracks),
  camera: renderTake(selectedTake(shot)),
  durationSec: shot.durationSec,
};

// renderTracks: key ids dropped, key times as frame integers, empty lanes dropped.
//   objects[id] = [[frame, px, py, pz, rotationY, ease], ...], poses[id] = [[frame, pose], ...]
// renderTake:   { bodyId, formatId, lensMm, track }
//   sparse track → [[frame, px, py, pz, ax, ay, az, roll, ease], ...]
//   dense track  → { digest, sampleCount }
```

What changes the hash, and what does not:

| Change | Hash changes? |
|---|---|
| Select another take | Yes |
| Edit a take that is not selected | No |
| "New take" (the duplicate is selected and renders identically) | No |
| Move a key by one frame, or change its ease | Yes |
| Change the selected take's lens, body or format | Yes |
| Change a take's rig | No; the rig is used only to re-shoot the take |
| Re-create key ids (duplicate shot, migration) | No |
| Export and import the project (fresh blob keys) | No; dense tracks hash by `digest` |
| Rename a shot, scene or object | No (S1) |

Clip status in M4 compares a clip's stored hash with this one, so a clip goes
stale exactly when the table says "Yes".

### 4.5 Thumbnail time and size

- A shot's thumbnail shows its selected take at `t = 0`. That frame is the
  cut's first frame and the AI package's first frame (R7), and it is stable
  while the shot plays.
- The camera is `cameraAt(take, 0)` with `vFovDeg` from `takeOptics(take)`.
  The image size is the thumbnail column in 3.2: the format's aspect with the
  long side at 320 px. Strip cards letterbox it.
- S1's staleness rule stays: re-render when the stored hash differs from
  `hashShotState`. Because the hash covers the whole shot, editing a key at
  3 s also re-renders the `t = 0` thumbnail. That is one debounced 320 px
  offscreen render, accepted over a second hash function.
- `renderShotPixels` in `src/viewport/thumbnails.ts` changes signature to
  `renderShotPixels(gl, scene3d, pose: CameraPose, frame: { vFovDeg: number; width: number; height: number })`.

### 4.6 Move presets

Ported from Scene Builder v2's `lib/moves.ts`, which has no tests. The math
and the labels are copied, the tests are written first, then the function is
adapted to `CameraKey`. Four presets are new in M3 and marked as such.

```ts
// src/domain/moves.ts
export type MovePresetId =
  | "static" | "dollyIn" | "dollyOut" | "pedestalUp" | "pedestalDown"
  | "orbitLeft" | "orbitRight" | "pushPast"
  | "panLeft" | "panRight" | "truckLeft" | "truckRight";

export const MOVE_PRESETS: readonly { id: MovePresetId; label: string; ported: boolean }[];

export function applyMovePreset(
  start: Framing & { roll: number },
  preset: MovePresetId,
  durationSec: number,
  newId: () => string,
): CameraKey[];
```

`start` is the selected take's first key. `static` returns that one key at
frame 0. Every other preset returns two keys: the start framing at frame 0
with ease `easeInOut`, and the end framing at `snapToFrame(durationSec)`.
Roll carries through unchanged. Scene Builder v2's presets were linear; the
eased start is a change, listed in section 14.

With `p0`, `l0` the start position and aim, `rotateAround(p, c, deg)` turning
`p` about a vertical axis through `c` (the function in `lib/moves.ts`), and
`r` the start framing's horizontal right vector
`normalize(cross(l0 − p0, [0, 1, 0]))`:

| `MovePresetId` | Label | End position | End aim | Source |
|---|---|---|---|---|
| `static` | Static | one key only | one key only | ported |
| `dollyIn` | Dolly in | `lerp(p0, l0, 0.4)` | `l0` | ported |
| `dollyOut` | Dolly out | `lerp(p0, l0, −0.45)` | `l0` | ported |
| `pedestalUp` | Pedestal up | `p0 + [0, 2.5, 0]` | `l0 + [0, 0.5, 0]` | ported |
| `pedestalDown` | Pedestal down | `[p0x, max(p0y − 2.5, 0.3), p0z]` | `l0` | ported |
| `orbitLeft` | Orbit left | `rotateAround(p0, l0, 28)` | `l0` | ported |
| `orbitRight` | Orbit right | `rotateAround(p0, l0, −28)` | `l0` | ported |
| `pushPast` | Push past | `lerp(p0, l0, 0.65)` | `lerp(l0, [2·l0x − p0x, l0y, 2·l0z − p0z], 0.3)` | ported |
| `panLeft` | Pan left | `p0` | `rotateAround(l0, p0, −25)` | new |
| `panRight` | Pan right | `p0` | `rotateAround(l0, p0, 25)` | new |
| `truckLeft` | Truck left | `p0 − 1.5 · r` | `l0 − 1.5 · r` | new |
| `truckRight` | Truck right | `p0 + 1.5 · r` | `l0 + 1.5 · r` | new |

Direction tests pin the labels to what the operator sees: from `p0 = [0, 0, 10]`
aiming at the origin, Orbit left ends with `x < 0` (the camera moved to its own
left), Pan left ends with the aim at `x < 0`, and Truck right ends with both
at `x = 1.5`.

## 5. Migration from schemaVersion 1 to 2

### 5.1 What `migrateV1toV2` does

A pure, deterministic function in `src/domain/migrations.ts`:
`migrateV1toV2(doc: ProjectV1): Project`. The same input always gives the same
output, ids included, so export then import round trips compare equal.

For each shot:

1. **Keys.** Collect the frames of every key in the v1 `position` and `aim`
   arrays (`frameOf(k.t)`), deduplicated and sorted. For each frame `f`,
   build a `CameraKey` with `position` and `aim` sampled from the v1 arrays at
   `f / FPS` using S1's own `sampleTrack` rule (linear, clamped), `roll: 0`,
   `ease: "linear"` and id `` `${shot.id}-k${i + 1}` ``. When both arrays are
   empty, the track gets one key at frame 0 with S1's `createShot` defaults,
   position `[0, 1.6, 6]` and aim `[0, 1, 0]`. When one is empty, the other's
   frames are used and the empty one takes its default. S1 always wrote one
   key each, so in practice every shot gets one key at frame 0.
2. **Lens.** Keep the picture (C10):
   `lensMm = lensMmForVFov(v1LensToVFovDeg(v1.lensMm), fullFrame, format21x9)`,
   which is `v1.lensMm × 0.642857` (15.4286 mm / 24 mm). The result is not
   rounded, so the vertical FOV matches to 1e-9. S1 clamped lenses to 12 to
   200 mm, which maps to 7.71 to 128.57 mm, inside the v2 range, so the
   migration never clamps. `v1LensToVFovDeg` is S1's formula, kept as a
   private function of the migration module and nowhere else.
3. **Take.** One take per shot:

   ```ts
   {
     id: `${shot.id}-take-1`, number: 1, createdAt: project.updatedAt,
     bodyId: "full-frame", formatId: "21:9", lensMm, rig: { rig: "none" },
     track: { kind: "sparse", keys },
   }
   ```
4. **Shot.** `camera = { takes: [take], selectedTakeId: take.id }`,
   `tracks = { objects: {}, poses: {} }`, and `durationSec` snapped to the
   frame grid and clamped to 0.5 to 60 s. `thumb` is kept; its hash no longer
   matches, so the thumbnail worker re-renders it on first view.

Then `schemaVersion` becomes 2. Nothing outside shots changes.

Worked fixture, S1's default shot: v1 `{ lensMm: 35, position: [{ t: 0, value: [0, 1.6, 6] }], aim: [{ t: 0, value: [0, 1, 0] }] }`
becomes one take with `lensMm: 22.5`, one key at `t: 0` with the same position
and aim, `roll: 0`, `ease: "linear"`. Vertical FOV before and after: 37.85°.

### 5.2 Schema and loader changes

`src/domain/schema.ts` becomes the v2 schema. S1's schema moves unchanged to
`src/domain/schema-v1.ts` as `projectSchemaV1` and is frozen: no later change
touches it.

| Schema | Change |
|---|---|
| `quatSchema` | New. Tuple of four numbers. Refine: length within 1e-6 of 1. |
| `cameraPoseSchema` | New. `{ position: vec3, rotation: quat }`. |
| `easeSchema` | New. Enum of the five `Ease` values. |
| `cameraKeySchema` | New strict object: `id`, `t` (≥ 0), `position`, `aim`, `roll`, `ease`. |
| `sparseTrackSchema` | New. `{ kind: "sparse", keys }` with `keys.min(1)`. Refine: frames strictly increasing. |
| `denseTrackSchema` | New. `blobKey` string, `digest` matching `/^[0-9a-f]{64}$/`, `sampleCount` integer ≥ 1, `sampleRateHz` > 0, `durationSec` ≥ 0, `first: cameraPose`. |
| `cameraTrackSchema` | New. Discriminated union on `kind`. |
| `rigSetupSchema` | New. Discriminated union on `rig`, six members. `smoothing` in [0, 1], `armLength` > 0. |
| `takeSchema` | New strict object. `bodyId` and `formatId` are enums of the preset ids. `lensMm` in [6, 300]. `number` integer ≥ 1. |
| `shotCameraSchema` | Replaced. `{ takes: takes.min(1), selectedTakeId }`. Refines: selected id exists, take numbers unique. |
| `objectKeySchema`, `poseKeySchema` | New strict objects. |
| `shotTracksSchema` | New. `{ objects: record(id, objectKey[].min(1)), poses: record(id, poseKey[].min(1)) }`. Refine: frames strictly increasing per lane. |
| `shotSchema` | `camera` uses `shotCameraSchema`; `tracks` added (required); `durationSec` in [0.5, 60]. |
| `sceneSchema` | Refine: track object ids exist in the set, pose track ids are dolls. |
| `projectSchema` | `schemaVersion: z.literal(2)`. Refine: take ids unique across the project. |
| `CURRENT_SCHEMA_VERSION` | `2`. |

`migrateProject(raw)` keeps its S1 contract and error classes:

1. Not an object: `ProjectInvalidError` (S1).
2. `schemaVersion` above 2: `ProjectVersionError`, refuse to open (S1).
3. `schemaVersion` 1: validate with `projectSchemaV1`; a failure throws
   `ProjectInvalidError` naming schema 1. Then run `migrateV1toV2`.
4. Validate with `projectSchema`; a failure throws `ProjectInvalidError`.

The migration table is a map from version to step, `{ 1: migrateV1toV2 }`, so
a later version adds one entry.

### 5.3 Storage

- `BlobKind` in `src/storage/db.ts` becomes `"glb" | "thumb" | "clip" | "track"`.
  The IndexedDB version stays 1, because the kind is a field on each record.
- New module `src/storage/track-store.ts`:

  ```ts
  export async function putDenseTrack(
    projectId: string, samples: Float32Array, sampleRateHz: number,
  ): Promise<{ blobKey: string; digest: string }>;
  export async function loadDenseTracks(project: Project): Promise<{ missing: string[] }>; // fills denseTrackCache
  export async function collectOrphanTracks(project: Project): Promise<number>;           // deletes unreferenced track blobs
  ```

- **Opening a project** runs, in order: `loadProject` (migrates in memory);
  when the stored document was schema 1, write its raw JSON once to the `meta`
  store under `backup:v1:<projectId>`; `collectOrphanTracks`;
  `loadDenseTracks`; then `documentStore.load(project, { missingTracks })`.
  The first autosave writes the v2 document. The backup stays until the
  project is deleted, and costs one extra copy of a small document.
- Autosave is unchanged: 500 ms of quiet, whole document. Documents now
  carry take metadata and sparse keys only. A shot with five sparse takes of
  ten keys each adds about 8 KB.

### 5.4 Export and import of dense tracks

S2 upgrades export to `name.sb3d.zip` holding `project.json` and
`assets/<blobKey>.<ext>`. M3 adds dense tracks to the same folder as
`assets/<blobKey>.sbtk`.

- **Export.** Each distinct dense `blobKey` referenced by any take is written
  once. A blob missing at export time is skipped; its take's metadata still
  goes out, and the import will show it as missing.
- **Import.** After S2's zip checks and blob key remapping, each `.sbtk` file
  is decoded with `decodeDenseTrack` and its SHA-256 compared with the
  `digest` of every take that references it. On success it is stored under
  its new key and every referencing take's `blobKey` is rewritten. On a
  decode failure, a digest mismatch or an absent file, the take keeps its
  metadata, gets a fresh `blobKey` with no blob behind it, and is listed in
  the import summary as "track missing". Zip-level failures (unreadable zip,
  invalid `project.json`) still write nothing, per S2.
- `.sb3d.json` files exported by S1 keep importing through the same
  migration.
- The spike's own take files (JSON with `move.kind: "path"`) are a separate
  import path on the shot page (7.5).

## 6. Stores and actions

### 6.1 Who owns what

The three S1 stores stay, split by lifetime. M3 adds fields; it adds no store.

| Holder | M3 adds | Persisted | Undoable |
|---|---|---|---|
| `documentStore` | Takes, keys, tracks, `selectedTakeId`, lens, body, format, all inside `project`. Beside `project`, like S1's `saveStatus`: `missingTracks: string[]` (blob keys). | `project` only | `project` only |
| `editorStore` | `activeShotId`, `autoKey`, `selectedKey`, `timelineOpen` | No | No |
| `playbackStore` | `loop`, `durationSec`, and the clock actions below | No | No |
| `denseTrackCache` (a plain module) | Decoded samples by blob key | The blobs are, through the blob store | No |

```ts
// src/state/editor-store.ts, additions
export type KeyRef =
  | { lane: "camera"; keyId: string }
  | { lane: "object"; objectId: string; keyId: string }
  | { lane: "pose"; objectId: string; keyId: string };

activeShotId: string | null;   // set only by selectShot
autoKey: boolean;              // default false (C14)
selectedKey: KeyRef | null;
timelineOpen: boolean;         // default true
setActiveShotId(id: string | null): void;
setAutoKey(on: boolean): void;
selectKey(ref: KeyRef | null): void;
setTimelineOpen(open: boolean): void;
```

Selecting a key on an object or pose lane also selects that object. Selecting
a different object clears `selectedKey`.

```ts
// src/state/playback-store.ts, replaces S1's time / playing / setTime / setPlaying
export type PlaybackState = {
  time: number;          // seconds, within [0, durationSec]
  playing: boolean;
  loop: boolean;         // default true
  durationSec: number;   // the active shot's duration
  play(opts?: { from?: number; loop?: boolean }): void;
  pause(): void;
  stop(): void;                    // pause, then seek(0)
  seek(t: number): void;           // clamps to [0, durationSec]; keeps the playing flag
  tick(dtSec: number): void;       // the driver's only entry point
  setLoop(loop: boolean): void;
  setDuration(sec: number): void;  // clamps time into the new range
};
```

S1 callers of `setTime` and `setPlaying` move to `seek`, `play` and `pause`.

### 6.2 Actions both shells call

The flat editor and the VR shell (`src/xr/`, from M5) call the same functions
in `src/state/commands.ts`. Each document command is one
`documentStore.apply` call, so one undo step. Each is a no-op in a read-only
tab, and a silent no-op when an id does not resolve, as S1's recipes are. The
recipes behind them are pure `(draft: Project, ...)` functions in
`src/state/take-actions.ts` and `src/state/track-actions.ts`, following S1's
`shot-actions.ts`.

```ts
export type NewTake = Omit<Take, "id" | "number" | "createdAt">;

export type Recording = {
  samples: Float32Array;     // stride 8: t, px, py, pz, qx, qy, qz, qw; t from 0 on the playback clock
  sampleRateHz: number;
  bodyId: CameraBodyId;
  formatId: FrameFormatId;
  lensMm: number;
  rig: RigSetup;
};
```

**Session state: never undone, never saved**

| Signature | Does |
|---|---|
| `selectShot(shotId: string): void` | Sets `activeShotId`, clears `selectedKey`, pauses, seeks to 0, sets the clock's duration to the shot's. |

In the flat editor the route stays the source of truth for which page is
open. A hook in `StageLayout`, `useActiveShotSync`, calls `selectShot` when
the route's `shotId` changes, and navigates to `/p/:projectId/shot/:shotId`
when `activeShotId` changes from elsewhere (the VR hand menu, VR spec 5.6).
Both directions compare before acting, so they never loop.

**Takes**

| Signature | Does |
|---|---|
| `addTake(shotId: string, init: NewTake): string` | Appends a take with `number` one above the highest ever used in the shot and `createdAt` now, selects it, returns its id. A dense `init.track` must already be in the blob store and the cache. |
| `duplicateTake(shotId: string, takeId?: string): string` | "New take". Copies the given take (default: the selected one) with fresh key ids. A dense copy shares the blob (C15). Selects the copy, returns its id. |
| `selectTake(shotId: string, takeId: string): void` | Sets `selectedTakeId`. Undoable (C13). |
| `deleteTake(shotId: string, takeId: string): void` | Refused on the last take. When the selected take goes, the previous take in list order is selected, or the next one if there is none. |
| `commitRecordedTake(shotId: string, rec: Recording): Promise<string>` | The VR "cut" path. Encodes, `putDenseTrack`, fills the cache, then `addTake` with a `DenseTrack` (`first` from sample 0, `durationSec` from the last `t`). When the blob write fails it rejects and the document is untouched. |
| `importTakeFile(shotId: string, file: Blob): Promise<string>` | Reads a spike take file (`spikes/vr-camera-feel/src/camera/take.ts` format), validates it with the spike's `parseTake` rules, converts `move.samples` to a `Float32Array` and calls `commitRecordedTake` with the file's lens and `{ rig: "handheld", smoothing }`. Body and format come from the file (`full-frame`, `21:9`). |

**Optics, on the selected take, in place**

| Signature | Does |
|---|---|
| `setLens(shotId: string, lensMm: number): void` | Clamps to [6, 300]. Works on sparse and dense takes. |
| `setBody(shotId: string, bodyId: CameraBodyId): void` | Works on sparse and dense takes. |
| `setFormat(shotId: string, formatId: FrameFormatId): void` | Works on sparse and dense takes. |

**Camera keys, on the selected take, sparse only (no-op on dense)**

| Signature | Does |
|---|---|
| `setCameraKey(shotId: string, t: number, framing: Framing, roll?: number): string` | Upserts a key at `frameOf(t)`. Replacing keeps the old key's id, ease and roll unless `roll` is passed. A new key gets `ease: "linear"`, `roll: 0`. Returns the key id. "Key camera" (K) calls this. |
| `setFraming(shotId: string, framing: Framing): void` | The orbit-controls commit. Reads the playhead and the auto-key arm and follows `routeCameraEdit` (3.5). |
| `updateCameraKey(shotId: string, keyId: string, patch: Partial<Omit<CameraKey, "id">>): void` | `t` is snapped; a move onto a frame another key holds is refused. Keys are re-sorted. |
| `deleteCameraKey(shotId: string, keyId: string): void` | Refused on the last key. |
| `applyMovePreset(shotId: string, preset: MovePresetId): void` | Replaces the selected take's keys with `applyMovePreset(firstKey, preset, durationSec, newId)`. |

**Objects and dolls**

| Signature | Does |
|---|---|
| `editObject(sceneId: string, shotId: string \| null, objectId: string, patch: ObjectOverride): void` | The single entry for gizmo and inspector edits. Splits the patch by field and routes each part through `routeObjectEdit` (3.5). S1's `updateObject` recipe stays and serves the `set` and `override` routes. |
| `setObjectKey(shotId: string, objectId: string, t: number, value: { position: Vec3; rotationY: number }): string` | Upserts at `frameOf(t)`. Creates the lane if needed, with the frame-0 key rule from 3.5. |
| `updateObjectKey(shotId: string, objectId: string, keyId: string, patch: Partial<Omit<ObjectKey, "id">>): void` | Same frame rules as camera keys. |
| `deleteObjectKey(shotId: string, objectId: string, keyId: string): void` | Deleting the last key removes the lane. |
| `clearObjectTrack(shotId: string, objectId: string): void` | Removes the lane. |
| `setPoseKey(shotId: string, dollId: string, t: number, pose: PoseName): string` | Upserts at `frameOf(t)`, with the frame-0 rule. |
| `updatePoseKey(shotId: string, dollId: string, keyId: string, patch: Partial<Omit<PoseKey, "id">>): void` | Same frame rules. |
| `deletePoseKey(shotId: string, dollId: string, keyId: string): void` | Deleting the last key removes the lane. |
| `clearPoseTrack(shotId: string, dollId: string): void` | Removes the lane. |

**Shots**

| Signature | Does |
|---|---|
| `setShotDuration(shotId: string, sec: number): void` | Snaps to the frame grid, clamps to [0.5, 60], and updates the clock's duration when the shot is active. Keys past the new end are kept. |

S1 recipes that change: `createShot` builds take 1 with the defaults in 3.2
and one key at `[0, 1.6, 6]` aiming at `[0, 1, 0]`; `duplicateShot` copies the
selected take only, renumbered 1, plus the tracks with fresh key ids;
`deleteObject` also removes the object's tracks in every shot;
`setShotFraming` and `setShotLens` are removed in favour of `setFraming` and
`setLens`.

### 6.3 Undo and saving

- Every document command above is one undo step, including `selectTake`,
  `setLens` and `applyMovePreset`.
- Gestures commit once. Timeline key drags, gizmo drags and orbit drags
  preview locally and call one command on release, as S1's
  `transform-commit.ts` does for the gizmo. A three-second drag is one undo
  step.
- `commitRecordedTake` is one undo step. Undo removes the take and leaves its
  blob in place until the next project open (3.3), so redo still works.
- The playhead, the playing and loop flags, `activeShotId`, `autoKey`,
  `selectedKey`, `timelineOpen` and the track cache never enter the undo
  stack and never schedule a save. The playback store has no path to the
  autosaver, and nothing in a `useFrame` callback writes to the document.
- A read-only second tab (S1's Web Lock) can play, scrub and inspect. Every
  control that would call a document command is disabled there, take
  selection included.

### 6.4 The playback clock

VR spec 5.5 asks for one clock owned by the suite, with `play`, `stop`, `seek`
and a current `t`, that exists without VR. `playbackStore` is that clock.

`tick(dtSec)`:

1. No-op when not playing.
2. `dt` is clamped to [0, 0.25] s, so a tab that was hidden for ten seconds
   does not jump the playhead ten seconds.
3. `time + dt` at or past `durationSec`: with `loop` on, wrap by subtracting
   `durationSec`; with `loop` off, set `time = durationSec` and stop playing.

The driver is one component, `<PlaybackDriver />`, mounted inside
`StageCanvas`. It calls `tick(delta)` from `useFrame`. React Three Fiber runs
`useFrame` from `renderer.setAnimationLoop`, and three.js moves that loop onto
the XR session's frame callbacks while a headset session is presenting, so the
same driver advances the clock in VR. Scene Builder v2's playback loop on
`window.requestAnimationFrame` (in `app/shots/[shotId]/page.tsx`) is therefore
not ported. The driver runs ahead of every reader in the same frame: it registers with
`useFrame(cb, PLAYBACK_DRIVER_PRIORITY)`, where `PLAYBACK_DRIVER_PRIORITY = -1`
is exported from the driver's module, and readers that need the ticked time
(the M6 recorder) register at `PLAYBACK_DRIVER_PRIORITY + 1`. Negative
priorities keep R3F's automatic render on. The implementation plan confirms
the `useFrame` ordering rule in R3F 9 before relying on it.

How the VR track uses the clock (M6 and M8 refine it): "action" is
`play({ from: 0, loop: false })` plus the recorder's start, sampling
`playbackStore.time` once per XR frame after the tick; "cut" is `pause()` plus
`commitRecordedTake`.

## 7. UI

### 7.1 Shot page layout

```
+-------------------------------------------------------+ +----------------+
| viewport: shot camera, format mask, HUD               | | Camera         |
|                                                       | |  takes         |
|                                                       | |  body, format  |
|                                                       | |  lens          |
+-------------------------------------------------------+ | Key inspector  |
| timeline: transport, ruler, camera lane, object and   | |  or object     |
| pose lanes (shot page only)                           | |  inspector     |
+-------------------------------------------------------+ |                |
| shot strip (S1)                                       | |                |
+-------------------------------------------------------+ +----------------+
```

`StageLayout` renders the timeline between `StageCanvas` and `ShotStrip` when
the route is the shot page. The canvas element stays the same object across
scene, shot and shot, as S1's test asserts; the timeline only takes height
from its container. Default height 176 px. A chevron collapses it to the
transport row (36 px).

### 7.2 Timeline

The structure, lane header width (160 px), diamond keys and pose span colours
come from Scene Builder v2's `components/Timeline.tsx`, rebuilt with the
repo's shadcn components.

- **Transport row**, left to right: Play/Pause, Stop (back to 0), Loop,
  time readout (`1.12 s · f 27 / 4.00 s`), Auto-key arm, Key camera, Move
  preset menu (the twelve presets from 4.6), Duration field in seconds.
- **Ruler.** 0 to the shot's duration, a label each second, frame ticks when
  they are at least 6 px apart. Click or drag scrubs and pauses.
- **Camera lane**, labelled with the selected take ("Camera · Take 3").
  Sparse: one diamond per key. Dense: a bar labelled "Recorded · 90 Hz ·
  7.2 s", with a "track missing" badge when the blob is gone.
- **Object lanes.** One "name · position" lane per object with a track in
  this shot, plus the selected object's lane even when empty, so it can be
  keyed.
- **Pose lanes.** One "name · pose" lane per doll with a pose track, drawn as
  spans in Scene Builder v2's colours: stand `#8a8a92`, walk `#3dadff`, run
  `#5ad8cc`, sit `#ff9e42`, crouch `#874fff`, point `#f849c1`.
- **Playhead.** One line across the ruler and every lane. It and the time
  readout update through a store subscription that writes the DOM directly,
  so playback re-renders no React component per frame.
- **Width.** The lanes always fit the shot's duration. There is no timeline
  zoom in M3; a 60 s shot on a 900 px lane gives 0.6 px per frame, enough to
  place keys a few frames apart with the inspector's time field.

### 7.3 Key editing

| Gesture | Result |
|---|---|
| Click empty lane or ruler | Seek there and pause |
| Click a diamond or pose span | Select that key, seek to its time |
| Drag a diamond | Move it in time, snapped to frames, clamped to [0, duration]. Releasing on a frame another key on that lane holds snaps it back. One command on release. |
| Alt-drag a diamond | Copy it to the drop frame |
| Right-click a diamond | Menu: Ease (the five values), Delete |
| Delete or Backspace | Delete the selected key; with no key selected, delete the selected object (S1) |
| Click a key sphere on the camera ghost (orbit mode) | Select that camera key |

- **Key inspector.** While a key is selected, the right panel's lower half
  shows it in place of the object inspector. Camera key: time (seconds and
  frame), position, aim, roll in degrees, ease. Object key: time, position,
  yaw in degrees, ease. Pose key: time, pose. Each committed field is one
  command.
- **Keys past the end.** They are hidden from the lane, which shows a chip,
  "+2 after end". The chip offers "Extend shot to the last key" and "Delete
  them".

### 7.4 Auto-key

- The arm sits in the transport row and toggles with Shift+K. It lives in
  `editorStore`, starts off (C14) and is never saved.
- Armed, the arm button fills red and a 2 px red ring draws around the
  viewport frame, so the state is visible from anywhere on the shot page.
- What an edit writes follows the tables in 3.5, for gizmo releases,
  inspector field commits, pose buttons and orbit-control releases on the
  shot camera.
- The scene page ignores the arm; every edit there writes to the set.

### 7.5 Takes panel

A "Camera" section at the top of the right panel on the shot page.

- **Take list**, one row per take in creation order. A radio shows the
  selected take. The row reads "Take 3" with a second line: "4 keys · 35 mm ·
  FF · 21:9" for sparse, "Recorded 7.2 s · handheld · 35 mm" for dense.
  Badges: "track missing", and "longer than shot" when a dense track runs past
  the shot's duration, with a "Fit shot to take" action.
- Clicking a row selects the take. The row menu offers "New take from this"
  and "Delete" (disabled on the last take).
- Under the list: **New take** (duplicates the selected take) and **Import
  take…** (a spike take file, 6.2). The import is the path that exercises
  dense tracks end to end before M6, and it brings the headset spike's takes
  into the suite.
- One help line under the buttons: "Edits change the selected take. New take
  keeps a copy of it first."
- **Body** select (four presets), **Format** select (five presets), **Lens**
  as twelve preset chips plus a number field (6 to 300 mm). A readout under
  them: "V 24.9° · H 54.4° · 2520 × 1080".
- With a dense take selected, the key tools and move presets are disabled,
  with the note "Recorded take: the path is view-only. Lens, body and format
  stay editable."

### 7.6 Viewport

- **Format mask.** In shot camera mode, bars cover the canvas outside the
  format's frame at 85 % opacity of the stage background, with a 1 px frame
  line. The camera's FOV comes from `viewportFovDeg`, so the area inside the
  bars is exactly what the thumbnail, the VR viewfinder and M4's export show.
- **HUD.** Bottom left in shot camera mode: "Take 3 · 35 mm · 1.12 s", and an
  `<output aria-label="Camera position">` with the current position to two
  decimals. The end-to-end tests read that output.
- **Camera ghost.** In orbit mode on the shot page, a camera body and frustum
  at `cameraAt(take, t)`, sized from `takeOptics`, plus the camera path as a
  line sampled at every frame from 0 to the duration, and a sphere per sparse
  key. The idea comes from Scene Builder v2's `CameraGhost` in
  `components/StageCanvas.tsx`; the code is rebuilt.
- **Object paths.** The selected animated object shows a dashed line through
  its position keys.
- **While playing**, the shot camera's orbit controls are unmounted, and a
  gizmo or orbit drag that starts during playback pauses it first.
- **Frame loop.** `ShotCameraRig` reads `cameraAtInto(take, time)` inside
  `useFrame` and writes the three.js camera directly. A `TrackApplier` (the
  idea from Scene Builder v2's `StageCanvas.tsx`) runs `resolveScene(scene,
  shot, time)` inside `useFrame` and copies positions and yaws onto the object
  groups that `SceneContents` registers. React re-renders only when the
  document changes, on seek or pause, or when a doll crosses a pose span
  boundary (a selector over `dollPoseAt` with shallow equality). The source of
  truth stays `resolveScene`; only where its result is applied moves.

### 7.7 Keyboard

Added to S1's `useKeyboardShortcuts`. All of them are ignored while focus is
in a text field, as in S1. Space plays and pauses even when a button has
focus, and the focused button is not activated.

| Key | Action |
|---|---|
| Space | Play or pause |
| ← / → | Previous or next frame, pausing |
| Shift+← / Shift+→ | Back or forward one second, pausing |
| Alt+← / Alt+→ | Previous or next key on the selected lane (the camera lane when none is selected) |
| Home / End (Fn+← / Fn+→ on a Mac laptop) | Start or end of the shot |
| K | Key camera at the playhead |
| Shift+K | Arm or disarm auto-key |
| L | Loop on or off |
| Delete / Backspace | Delete the selected key, else the selected object (S1) |
| [ / ] | Previous or next shot (S1, unchanged) |
| Cmd+Z / Shift+Cmd+Z | Undo, redo (S1, unchanged) |

## 8. What the VR spec asks of the suite

VR spec section 6 lists eight things the suite's spec must provide. Section
references below are to this document.

| # | VR spec 6 asks for | How M3 provides it |
|---|---|---|
| 1 | Units stay metres, Y up, feet at `y = 0` | Unchanged (section 3). Dense samples, object keys and camera keys use the same world frame, so a recorded pose needs no conversion. |
| 2 | Scene rendering is a function of data, with no dependency on flat-page UI | `resolveScene(scene, shot, t)` and `cameraAt(take, t)` are pure (4.2, 4.3). `SceneContents`, `TrackApplier` and `PlaybackDriver` live in `src/viewport` and read only stores and domain functions, so `src/xr/` can mount the same children. |
| 3 | `ShotCamera` v2 with takes from day one, plus the v1 to v2 migration | `ShotCamera = { takes, selectedTakeId }` (3.1) and `migrateV1toV2` (5.1). There is no release in between: S1 is the only v1. |
| 4 | Bodies and formats as preset data, FOV through the one function in 5.3 | Preset tables in 3.2. `vFovDeg(lensMm, body, format)` is the only FOV function (4.1); `lensToVFovDeg` is deleted. |
| 5 | Export dimensions derive from the take's format | `FrameFormat.exportW` and `exportH` (3.2), read through `takeOptics(take)`. 21:9 stays 2520 × 1080; the other formats get their own sizes. |
| 6 | A playback clock owned by the suite, independent of any page | `playbackStore` with `play`, `pause`, `stop`, `seek`, `tick` (6.1), advanced by `PlaybackDriver` from `useFrame`, which three.js drives from XR frames while a session presents (6.4). |
| 7 | Store actions both shells call: `selectShot`, `addTake`, `selectTake`, `setLens` | Exactly those names and more, with signatures, in `src/state/commands.ts` (6.2). `commitRecordedTake` is the "cut" path. |
| 8 | Path samples stored outside the localStorage crash draft | That draft is Film Planner's (`src/stage/store.ts`, key `stage-draft:<shotId>`); this repo has no localStorage draft and autosaves the whole document to IndexedDB. The same size concern applies to that autosave, so dense samples live in the blob store as binary (C5, 3.3) and the document keeps metadata only. |

VR spec section 11 deferred two topics to piece F. Both are settled here: the
final body and format presets with export sizes (3.2), and where path samples
are stored (3.3).

## 9. Error handling

| Failure | Behaviour |
|---|---|
| A v1 document fails v1 validation, on open or import | `ProjectInvalidError` naming schema 1. Nothing is written; the stored v1 document is untouched. |
| A document has `schemaVersion` above 2 | Refuse to open with a plain message (S1). |
| A v2 document breaks an invariant from 3.6 (a dangling `selectedTakeId`, unsorted keys, a track for a deleted object) | `ProjectInvalidError` naming the shot. An import writes nothing. |
| The first save after a migration fails | S1's retry, backoff and banner. The v1 document and its `meta` backup stay until a save succeeds. |
| A dense blob is missing when the project opens | The take is listed in `missingTracks`, shows a "track missing" badge, and `cameraAt` holds `track.first`. M4 refuses to export that take and says why. |
| A dense blob fails to decode | Same as missing. The console logs the `TrackFormatError` reason. |
| The blob write in `commitRecordedTake` fails (storage full) | The take is not added and the document is untouched. The recording stays in memory as "Unsaved take" with Retry and Download (`.sbtk`) until the next recording starts or the shot changes. |
| A spike take file is invalid | Nothing is written. The message carries the `parseTake` reason. |
| A zip's `.sbtk` file is absent, corrupt or fails its digest | The take imports as "track missing" and the import summary lists it. The rest of the project imports. |
| A key edit (K, preset, drag) targets a dense take | No-op. A toast explains that recorded takes are view-only and offers "New keyed take here": `addTake` with the dense take's optics and one sparse key at the current pose, its aim 3 m ahead along the view axis. |
| Deleting the last take, or a sparse track's last key | The control is disabled; the command is a no-op. |
| A key is dropped on a frame another key on its lane holds | It snaps back. No document change. |
| `aim` equals `position`, or the camera looks straight up or down | The fallbacks in 4.2. `cameraAt` never returns NaN (a property test checks it). |
| Lens typed outside 6 to 300 mm | Clamped; the field shows the clamped value. |
| Duration typed outside 0.5 to 60 s | Snapped to the frame grid and clamped. |
| A shot is shortened below its keys | Keys are kept; the lane shows the "after end" chip (7.3). |
| A dense track runs longer than its shot | Plays and exports to the shot's duration. "Longer than shot" badge with "Fit shot to take". A take recorded in VR extends its shot at commit instead (M6, decision O4). |
| The tab is hidden during playback | `tick` clamps `dt` to 0.25 s, so the playhead does not leap on return. |
| WebGL context lost during playback | Playback pauses, then S1's remount-once and toast. |
| Second tab on the same project | Read-only (S1). It can play and scrub; every editing control is disabled. |

## 10. Testing

Domain tests are written first and run in Node, as in S1. New dev dependency:
`fast-check` for the property tests, 200 runs each in CI.

**Domain unit tests**

- `lens.test.ts`: both fixture tables in 4.1, the `lensMmForVFov` round trip,
  `viewportFovDeg` in wider and narrower canvases. The spike's `fov.test.ts`
  cases come along unchanged.
- `camera.test.ts`: `sampleSparse` for every ease at u = 0.25 and 0.5, one-key
  tracks, clamping on both sides; `lookRotation` against three.js
  (`lookAt` then `rotateZ`) on 50 fixed framings plus the two degenerate
  fixtures; `sampleDense` with the spike's `take.test.ts` cases ported to
  `Float32Array`; `cameraAtInto` equal to `cameraAt`; a dense take with no
  cached blob returning `first`.
- `dense-track.test.ts`: encode and decode round trip; one rejection test per
  `TrackFormatError` cause in 3.3.
- `resolve.test.ts`: S1's cases unchanged, plus: a track overrides the
  override's position and yaw and leaves scale alone; pose spans switch
  exactly on the key's frame (a key at frame 24 gives the base pose at
  `t = 23/24` and the new pose at `t = 1`); yaw from 170° to −170° passes
  through 180°; tracks never change `visible`.
- `hash.test.ts`: one test per row of the table in 4.4.
- `moves.test.ts`: the end framing of all twelve presets from
  `p0 = [0, 0, 10]`, `l0 = [0, 0, 0]`, and the three direction tests.
- `migrations.test.ts`: the S1 default shot fixture (5.1); empty arrays; two
  v1 keys at different times; unsnapped v1 times; running the migration twice
  gives deep-equal output; invalid v1 input; schema 3 refused.
- `edit-routing.test.ts`: one test per row of both tables in 3.5.

**Property tests**

1. `cameraAt` returns a finite position and a unit quaternion (within 1e-9)
   for any valid sparse track and any `t` in [−10, 70].
2. Sampling at a key's own frame returns that key's position and aim within
   1e-9.
3. With no `hold` keys, position is continuous: a step of 1e-4 s moves it
   less than 1 cm, for keys within 100 m of the origin.
4. `decodeDenseTrack(encodeDenseTrack(s))` returns `s` for any finite float32
   samples with non-decreasing `t` and unit quaternions.
5. The migration keeps vertical FOV within 1e-9 for any v1 lens in [12, 200].
6. The hash ignores key ids and the insertion order of track records.
7. For any sequence of up to 30 take, key and track commands, undoing all of
   them returns the starting document, and redoing all returns the end one.
8. For any body, lens and format at least as wide as the sensor, `hFovDeg`
   equals `2 · atan(sensorWmm / (2 · lensMm))`.

**State tests.** Every command in 6.2 against a fixture project: the
`deleteTake` selection rule; take numbers never reused after a delete;
`duplicateShot` copies the selected take only; `deleteObject` removes tracks
in every shot; the frame-0 rule when auto-key starts a track; `tick` with loop
on and off; `setDuration` clamping `time`; `selectShot` resetting the clock;
ten simulated seconds of `tick` scheduling zero autosaves.

**Storage tests**, against `fake-indexeddb`: `putDenseTrack` then
`loadDenseTracks` fills the cache; missing and corrupt blobs land in
`missing`; `collectOrphanTracks` deletes only unreferenced track blobs, and
only when called at open; the v1 backup is written once; a zip round trip
with a dense take gives identical track bytes, the same digest and the same
shot hash; a corrupt `.sbtk` imports as missing.

**Viewport tests.** S1's canvas identity test passes with the timeline
mounted. `PlaybackDriver` advances the clock when the R3F test renderer
advances frames. `ShotCameraRig` places the three.js camera at
`cameraAt(take, t)` after a seek.

**End-to-end smoke additions**, Chromium and WebKit, after S1's flow:

1. On Shot 01 press K, click the ruler at 2 s, drag in the viewport to
   reframe, release. The camera lane shows two diamonds. Press Space: the
   time readout passes 1 s and the "Camera position" output changes.
2. Click New take: "Take 2" is selected. Pick 85 mm: the readout shows
   "V 10.4°". Select Take 1: it shows "V 24.9°". Reload: both takes remain,
   Take 1 selected.
3. Import `e2e/fixtures/spike-take.json` (a 3 s handheld take in the spike's
   format, generated for the test): "Take 3" appears as recorded and its lane
   shows the recorded bar. Export the zip and import it: the copy's Take 3
   has no "track missing" badge.
4. Select the doll, press Shift+K, seek to 2 s, change the doll's x in the
   inspector: its position lane shows two diamonds.

The S1 test's 800 ms autosave wait precedes every reload. By hand in Chrome
and Safari on each slice's preview: playback smoothness, the format mask on
window resize, Space with a button focused.

## 11. Porting map

Scene Builder v2 paths are relative to
`/Users/nickv/ClaudeCode Projects/Scene Builder V2 (3d editor)`. Film Planner
paths are relative to
`/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner`. Spike
paths are relative to this repo. Every path was checked on 2026-09-25.

| Into | From | Source | How |
|---|---|---|---|
| `src/domain/lens.ts` (`usedSensorHeightMm`, `vFovDeg`) | VR spike | `spikes/vr-camera-feel/src/camera/fov.ts`, `fov.test.ts` | Copy with tests. Add the presets, `hFovDeg`, `lensMmForVFov`, `viewportFovDeg`. |
| `src/domain/camera.ts` (`sampleDense`) | VR spike | `spikes/vr-camera-feel/src/camera/take.ts` (`poseAt`, `TAKE_STRIDE`), `take.test.ts` | Copy the search and interpolation, move from `number[]` to `Float32Array`, keep the tests. |
| `src/domain/quat.ts` | VR spike | `spikes/vr-camera-feel/src/camera/pose.ts`, `pose.test.ts` | Rewrite in plain TypeScript (the spike uses three's `Quaternion`). Keep the tests, with three as the oracle. |
| `importTakeFile` validation | VR spike | `spikes/vr-camera-feel/src/camera/take.ts` (`parseTake`) | Copy the rules. |
| `src/domain/camera.ts` (`sampleSparse`), `src/domain/resolve.ts` (`sampleObjectKeys`, `dollPoseAt`) | Scene Builder v2, S1 | `lib/camera.ts` (`evalTrack`, `evalPose`); S1 `src/domain/resolve.ts` (`sampleTrack`) | Merge. Add easing and the frame grid. |
| `src/domain/moves.ts` | Scene Builder v2 | `lib/moves.ts` | Copy the math and labels, write the missing tests, adapt to `CameraKey`, add four presets. |
| `src/state/track-actions.ts` | Scene Builder v2 | `lib/store.ts` (`setCameraKey`, `deleteCameraKey`, `setObjectKey`, `deleteObjectKey`, `clearObjectTrack`, `setPoseKey`, `deletePoseKey`, `clearPoseTrack`) | Port onto Immer recipes. Replace the 0.05 s merge window with frame equality. Add key ids. |
| `src/state/edit-routing.ts` | Scene Builder v2 | `components/StageCanvas.tsx` (the translate commit's auto-key rule), `lib/store.ts` (the `autoKey` notes) | Port the rule and extend it with the write target. |
| `src/app/components/timeline/*` | Scene Builder v2 | `components/Timeline.tsx` | Rebuild with shadcn. Keep the lanes, diamonds, pose spans and colours. |
| Transport, Key camera, preset menu | Scene Builder v2 | `app/shots/[shotId]/page.tsx` (auto-key arm, `keyCameraHere`, the camera move row) | Rebuild. The `requestAnimationFrame` playback loop there is replaced by the clock (6.4). |
| Key inspector | Scene Builder v2 | `components/Inspector.tsx` (camera key list, pose buttons) | Rebuild. |
| `src/viewport/CameraGhost.tsx`, `src/viewport/TrackApplier.tsx` | Scene Builder v2 | `components/StageCanvas.tsx` (`CameraGhost`, `TrackApplier`, `applyTracks`) | Rebuild from the ideas. The file is not copied (main spec rule). |
| 21:9 export size | Film Planner | `src/stage/render/clip-constants.ts` | The 21:9 row in 3.2 keeps its 2520 × 1080. |
| Not ported | Film Planner | `src/stage/lens.ts` (`lensToVFovDeg`), `src/stage/resolve.ts` (`cameraAt` over start and end framings) | Replaced by C2 and C1. |
| Not ported | Film Planner | `src/stage/store.ts` (the `stage-draft:<shotId>` localStorage draft) | This repo autosaves to IndexedDB, and dense samples go to blobs (C5). |

Rule for every port, from the main spec: copy from the real source with its
tests, confirm the tests pass unchanged, then adapt.

## 12. Build slices

M3 is size L, built as three slices of size M, each with its own
implementation plan and its own PR. Each slice ends with a Vercel preview link
verified in Chrome and Safari. The gate is M2 closed: M3.1's zip additions
build on S2's zip export.

### M3.1 Camera model v2 (M)

Types, optics presets, the lens rewrite, `quat.ts`, `cameraAt` for sparse and
dense, the dense codec and cache, schema v2 with the frozen v1 schema, the
migration, `track-store.ts`, zip additions, the hash, thumbnail time and size,
`ShotCameraRig` on `cameraAt` with the format mask and HUD, and the takes
panel (list, New take, select, delete, body, format, lens). No timeline yet:
framing still edits the one key through the orbit controls (3.5, second row of
the camera table).

- **Done when:**
  1. A project saved by S1 opens after the upgrade. Every shot shows Take 1
     and frames the same picture: the same camera position, and vertical FOV
     equal within 0.01°.
  2. On a shot, New take selects Take 2. Setting it to 85 mm changes the
     picture and the readout. Selecting Take 1 brings the old picture back.
     Reload keeps both takes and the selection.
  3. Switching the format from 21:9 to 16:9 changes the mask and the
     thumbnail's shape, and the thumbnail re-renders.
  4. Twenty undo steps then twenty redo steps over take and lens edits return
     to the same document.
  5. Export the zip, import it in a clean browser profile: same takes, same
     selection, equal shot hashes. With a dense take seeded by a test
     fixture: identical track bytes and digest.
- **States covered:** shot with one take, shot with several takes, dense take
  with a missing blob (badge, held pose), migrated project, read-only tab.

### M3.2 Timeline, camera keys and playback (M)

The clock and `PlaybackDriver`, the timeline's transport, ruler and camera
lane, key editing and the key inspector for camera keys, K, the move presets,
the keyboard table, the camera ghost and path, `importTakeFile`, keys past the
end, the dense lane.

- **Done when:**
  1. Key the camera at 0 s and at 2 s and press Space: the camera moves from
     one framing to the other while the readout runs. With Loop off it stops
     at the end.
  2. Each of the twelve presets writes two keys (one for Static), and the
     ghost path in orbit mode goes the way the table in 4.6 says.
  3. Dragging a key to another frame, changing its ease and deleting it are
     one undo step each. Dropping a key on an occupied frame snaps it back.
  4. Importing a spike take file adds a recorded take that plays back and is
     view-only. Its move matches the spike's replay page for the same file,
     checked by eye.
  5. Ten seconds of playback schedule zero saves and add nothing to the undo
     stack (test).
  6. S1's canvas identity test still passes with the timeline mounted.
- **States covered:** static shot (one key), keys past the end, dense take
  selected, playing, paused, looping, read-only tab playing.

### M3.3 Blocking: object tracks, pose spans, auto-key (M)

Track recipes and commands, `routeObjectEdit`, object and pose lanes, the key
inspector for object and pose keys, `TrackApplier`, object paths, the
auto-key arm and ring, `deleteObject` and `duplicateShot` handling tracks.

- **Done when:**
  1. Arm auto-key and move a doll at 2 s: its lane shows keys at 0 s and 2 s,
     and playback moves it across.
  2. Pose keys stand at 0 s, walk at 1 s and sit at 3 s change the doll's
     pose exactly on those frames.
  3. With auto-key off and no track, the Set and This shot targets behave as
     in S1 (S1 done-when 3 still passes). With a track, a Set edit adds a key
     and the hint shows.
  4. Take 2 of the same shot plays the same blocking as Take 1.
  5. Deleting the doll removes its tracks in every shot, and one undo brings
     them back.
  6. A scene with 50 objects, 10 of them animated, plays at 60 fps in Chrome
     and Safari on the development Mac, read from the browsers' frame meters.
- **States covered:** no animated objects, animated object selected, doll
  with only a pose track, "only in this shot" object that is animated,
  auto-key armed with target Set.

### Reserved for Nick

Sessions run in learning mode, as in the main spec. Two small decisions are
left for Nick to write during implementation, five to ten lines each:

- The curve shapes in `applyEase` (4.2): quadratic as drafted, or cubic for a
  heavier start and stop. The fixtures follow his choice.
- The frame-0 rule when auto-key starts a track mid-shot (3.5): write the
  pre-edit value at frame 0 as drafted, or write only the key at the
  playhead, as Scene Builder v2 did.

## 13. Out of scope

- Spline paths between keys and tangent handles on keys.
- Zoom lenses within a take (VR spec section 10), focus and depth of field.
- Animating scale, size, colour or visibility.
- Parenting the camera or a prop to a moving object.
- A scene-level timeline and audio. The animatic player is M4's, on its own
  route (R5).
- Timeline zoom, onion skin, copying keys between takes or shots.
- Custom bodies and formats. Vertical formats: a 9:16 frame cropped from a
  horizontal sensor frames like a very long lens, so it needs a rotated-sensor
  rule first.
- Turning a recorded take into keys, take compare and trim: take management
  belongs to M6 (VR spec section 11).
- Rig-constrained authoring in the flat editor: M7.
- Rendering clips and storyboards: M4.

## 14. Open questions

Each has a default, already written into the sections above. Nick's answer
overrides it.

1. **Migration: keep the picture or the number?** Decided 2026-09-25 by Nick: the picture
   (C10). S1's 35 mm becomes 22.5 mm and frames exactly as before. The
   alternative keeps 35 mm and every migrated shot frames about 1.56 times
   tighter.
2. **Default format for new shots.** Decided 2026-09-25 by Nick: 21:9 (C11). 16:9 is the other
   candidate, and the likelier one for AI video providers in M9.
3. **Frame grid.** Decided 2026-09-25 by Nick: 24 fps, and M4 exports at `FPS`. Film Planner
   exported at 30 fps.
4. **Auto-key at startup.** Default: off (C14). Scene Builder v2 started with
   it on.
5. **Is selecting a take undoable?** Default: yes (C13).
6. **Duplicate shot: which takes come along?** Default: the selected take
   only, renumbered 1.
7. **A recording longer than its shot.** Default: the shot keeps its
   duration and the take offers "Fit shot to take". Decided 2026-09-25 by Nick: a take
   recorded in VR extends its shot automatically (M6, O4).
8. **Move presets: eased or linear?** Default: the start key eases in and
   out. Scene Builder v2's presets were linear.
9. **Loop on by default.** Default: on, as Scene Builder v2 looped.
10. **Shot length range.** Default: 0.5 to 60 s. Scene Builder v2 allowed 1
    to 15 s.
11. **Lens presets.** Default: 14, 18, 21, 24, 28, 35, 40, 50, 65, 85, 100,
    135 mm, plus any value from 6 to 300 mm typed in.

## Changelog

- 2026-09-25: open questions 1, 2, 3 and 7 decided by Nick after the cross-spec review.
- 2026-09-25: initial spec. Merges the main spec's S3 with the VR spec's
  piece F, applies the 2026-09-25 camera model and lens decisions and R1 to
  R4, and settles the two topics the VR spec deferred to F.
