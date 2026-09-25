# Outputs: design spec (M4)

> **Status:** exploration · **Stage:** draft for review, written 2026-09-25
> **Milestone:** M4 in the [roadmap](../../roadmap.md), size L (decided 2026-09-25, section 13), gated on M3 (camera and motion)
> **Builds approved by this document:** none until Nick approves it. Anything published from this work starts unlisted and is labeled `exploration`.
> **Related:** [camera and motion spec](2026-09-25-camera-and-motion-design.md) (M3: the types, `cameraAt`, `resolveScene`, `hashShotState`, `FPS` this spec builds on) · [main spec](2026-09-18-scene-builder-3d-design.md) (architecture, storage, S4 outline) · [VR operator spec](2026-09-18-vr-operator-design.md) (section 5.2: the exporter samples `cameraAt(take, i / fps)`) · [AI video bridge spec](2026-09-25-ai-video-bridge-design.md) (M9 calls this renderer) · built S0 and S1 code on `origin/feat/s0-s1-walking-skeleton` (draft PR #3)

## TL;DR

- M4 turns a shot into things you can hand to someone: an MP4 clip per
  take, a scene animatic you can watch and scrub, and a storyboard as a PDF
  plus a zip of PNG frames (R6).
- One renderer makes every pixel. It is Film Planner's deterministic clip
  renderer (`src/stage/render/*`) ported with its tests, then changed in four
  places: the frame size comes from the take's format, frames run at
  `FPS = 24`, frame `i` samples `cameraAt(take, i / FPS)` and
  `resolveScene(scene, shot, i / FPS)`, and it draws the S1 and S2 world
  (sized primitives, walls, props, the viewport's light rig).
- Encoding is WebCodecs `VideoEncoder` (H.264) plus Mediabunny as the MP4
  muxer. Film Planner's muxer, `mp4-muxer`, is deprecated in favour of
  Mediabunny. When a browser cannot encode, the same frames export as a zip
  of PNGs and the animatic renders live.
- A clip is a blob of `BlobKind` `"clip"` with a small `ClipRecord` on its
  take. Status is derived: `none`, `ready` or `stale`, by comparing the
  record's hash with `hashShotState` for that take. Nothing stores a status.
- Renders run one at a time through a session queue with progress and
  cancel. Each job renders in a dedicated worker on an `OffscreenCanvas`
  when a probe says the browser can, and on the main thread otherwise.
- The animatic is its own route, `/p/:projectId/scene/:sceneId/play` (R5).
  It plays each shot's selected take back to back: the stored clip when it
  is ready, a live render through the same renderer when it is stale or
  missing. It has a cut strip, a cut list, scrubbing and a keyboard map.
- Determinism is promised at two levels. The frame plan (every frame's
  time, camera pose and resolved objects) is identical on every run, and
  equal within 1e-9 across JavaScript engines, tested in Node. The RGBA
  pixels of each frame are
  identical between two renders in the same browser on the same machine,
  tested in the browser. Encoded MP4 bytes are never compared.

## 1. Problem

M3 gives every shot a take that moves over time and a timeline that plays
it, but nothing leaves the browser tab. There is no video, no way to watch a
scene as a cut, and no paper for a crew. The main spec reserved clip status
("none, ready, stale") for S4 and left the animatic and the storyboard as
open questions; R5 and R6 answered those. M9 (the AI bridge) needs a grey
guide clip and a first frame, and it must not grow its own renderer (R7).
Two predecessors each solved a part: Film Planner has a tested,
deterministic WebCodecs clip renderer on a page nobody opens, and Scene
Builder v2 has an animatic page that plays clips back to back but skips any
shot without one and records clips in real time through `MediaRecorder`.

## 2. Decisions

Decisions fixed before this spec and cited here. They are not reopened.

| # | Decision | Source | Made |
|---|---|---|---|
| O1 | The animatic player is its own route, `/p/:projectId/scene/:sceneId/play`, playing each shot's selected take back to back. | R5 | 2026-09-25 |
| O2 | Storyboard export is a PDF plus a zip of PNG frames. No share link. | R6 | 2026-09-25 |
| O3 | Browser only, static deploy, no server. Every render and every file is made in the tab. | D6, main spec | 2026-09-18 |
| O4 | The clip renderer samples `cameraAt(take, i / fps)`, so a render is a pure function of the take and the shot. | VR spec 5.2, M3 4.2 | 2026-09-25 |
| O5 | Export sizes come from the take's format (`FrameFormat.exportW`, `exportH`, read through `takeOptics`). The frame grid is `FPS = 24`. | M3 3.2, C9 | 2026-09-25 |
| O6 | Clip status is derived by comparing a clip's hash with `hashShotState`, never stored. | Main spec, "Status is derived"; M3 4.4 | 2026-09-18 |
| O7 | The AI bridge (M9) calls this renderer for its grey guide clip and first frame, and never defines its own. | R7, ownership in the roadmap | 2026-09-25 |
| O8 | Milestones carry sizes, never dates. | R1 | 2026-09-25 |

Decisions this spec makes. Each is a default Nick can overturn in review;
the ones with a real trade-off come back in section 15.

| # | Decision | Why |
|---|---|---|
| OD1 | A clip belongs to a take: `Take.clip?: ClipRecord`. The shot's clip is its selected take's clip. | Switching between two takes keeps both renders, the takes panel can show a status per take, and M6's take compare can play any take's clip. |
| OD2 | Frame `i` of a shot is at `t = i / FPS` for `i` in `[0, N)`, with `N = frameOf(shot.durationSec)`. | This is the VR spec's contract, and it cuts shots end to end with no shared frame. It replaces Film Planner's normalised `frameT(i, total) = i / (total − 1)`. |
| OD3 | Encoding is WebCodecs H.264 muxed to MP4 by Mediabunny. No `MediaRecorder` path. | `MediaRecorder` captures in real time, so a slow frame changes the clip; the fixed-step encoder loop is what makes Film Planner's renderer deterministic. |
| OD4 | When a browser cannot encode the clip, the fallback is a zip of PNG frames plus live rendering in the animatic. | The frames are the deterministic part. Any editor can import a numbered PNG sequence. |
| OD5 | One renderer for clips, animatic live frames, storyboard frames, the scene MP4 and M9's guide clip. The S1 thumbnail path (`renderShotPixels` from the live scene graph) stays as it is, and a parity test keeps the two within a pixel tolerance. | One world builder means one place where a doll or a prop is drawn for output. Rewriting thumbnails onto it is a change M4 does not need. |
| OD6 | Renders run one at a time, in a worker when a probe passes, else on the main thread. | One WebGL context and one encoder at a time keeps memory and GPU use predictable. Worker support differs by browser (4.7). |
| OD7 | A render snapshots the document when it starts and stores the hash of that snapshot. Editing during a render makes the finished clip `stale` at once. | The document is an immutable Immer value, so the snapshot costs nothing, and the status stays honest. |
| OD8 | Clip records are written with `applyTransient`: saved, never undone. | A render is an output of the document, like S1's thumbnails. Undoing an edit should never un-render a clip. |
| OD9 | Scene clip export defaults to a zip of per-shot MP4s plus `cutlist.csv`. One continuous scene MP4 is a second menu item. | Per-shot files keep each shot at its own format and drop straight into an editor. One file needs one frame size, so mixed formats get letterboxed. |
| OD10 | Project zip export leaves clips out by default and strips `clip` records. A checkbox includes them. | Clips can be re-rendered from the document and are the largest thing a project holds. |
| OD11 | Storyboard panels are rendered through the same renderer at frame 0, plus the last frame for shots that move. PDF: A4 turned sideways (297 × 210 mm), three columns by two rows. PDF library: jsPDF. | Frame 0 is the thumbnail and the AI first frame (M3 4.5). jsPDF is maintained and MIT licensed (7.2). |
| OD12 | `Shot` gains an optional `notes` field for storyboard captions. | M3's `Shot` has no notes, and `Scene.notes` describes the whole scene. |
| OD13 | Outputs draw a floor grid, like Film Planner's clips. Thumbnails keep hiding it (S1). | A grey world with no floor reads as floating objects, which matters most for M9's guide clip. |

### Alternatives considered

- **Render from the live R3F scene graph**, as S1's thumbnails do
  (`src/viewport/thumbnail-render.ts`). Exact parity with the viewport for
  free, but every frame must set and restore the whole scene synchronously
  on the main thread, a clip cannot render while the stage layout is
  unmounted (the animatic route, the board), and nothing can move to a
  worker. Rejected for clips; kept for thumbnails (OD5).
- **Make the viewport mount the builder's output** (`<primitive
  object={...} />`, as the VR spike's `StageMount.tsx` does) so the parity
  test becomes unnecessary. Right long-term, but it rewrites S1's
  `DollMesh`, `PrimitiveMesh` and S2's prop meshes, their selection and
  gizmo wiring. Out of scope for M4; listed in section 14.
- **`MediaRecorder` with `captureStream`**, Scene Builder v2's
  `lib/capture.ts`. Works in more browsers, writes WebM, and paces frames
  on a wall clock, so the output depends on machine speed. Rejected by
  OD3.
- **Keep `mp4-muxer`**, which Film Planner uses. Its npm entry carries the
  deprecation notice "This library is superseded by Mediabunny. Please
  migrate to it." (registry.npmjs.org/mp4-muxer, version 5.2.2, read
  2026-09-25). Porting onto a dead dependency buys a migration later.
- **Clip record on the shot** instead of the take. Simpler, one clip per
  shot, but selecting Take 1 again after rendering Take 2 throws Take 1's
  render away. See section 15, question 1.
- **pdf-lib** for the storyboard. MIT, good API, but its latest version,
  1.17.1, was published 2021-11-06 (registry.npmjs.org/pdf-lib, read
  2026-09-25).
- **Scene export as one MP4 by default.** One file is easier to send, but
  it forces one frame size on shots of different formats and re-renders
  every shot even when all clips are ready. Second menu item instead (OD9).

## 3. Data model

Everything in this section extends M3's types in `src/domain/types.ts`. No
M3 name is renamed or redefined. The schema version stays 2 (3.2).

### 3.1 Types

```ts
// src/domain/types.ts, M4 additions

export type ClipRecord = {
  blobKey: string;          // blob store key, BlobKind "clip" (main spec, Storage)
  stateHash: string;        // hashTakeState(...) of the document snapshot the render started from
  rendererVersion: number;  // RENDERER_VERSION when rendered (3.3)
  formatId: FrameFormatId;  // the take's format at render time
  width: number;            // pixels, = format.exportW
  height: number;           // pixels, = format.exportH
  fps: number;              // FPS, 24
  frameCount: number;       // frameOf(shot.durationSec) at render time
  codec: string;            // the avc1 string the encoder accepted, e.g. "avc1.640033"
  bytes: number;            // blob size
  renderedAt: string;       // ISO 8601, like Take.createdAt
  missingAssets: string[];  // PropAsset ids drawn as placeholders; usually []
};

// Take (M3 3.1) gains one optional field:
//   clip?: ClipRecord;
// Shot (M3 3.1) gains one optional field:
//   notes?: string;         // storyboard caption text, at most 2,000 characters
```

Rules:

- `clip` is absent until a take is first rendered. A re-render replaces it.
- `duplicateTake` and `duplicateShot` (M3 6.2) copy `clip` with the take.
  The copy renders identically (M3 4.4: "New take" keeps the hash), so it is
  `ready` too, and the two records share one immutable blob, the same rule
  M3's C15 applies to dense tracks.
- `notes` is absent on every shot M3 wrote. Absent reads as the empty
  string. Neither field enters `hashShotState`: M3's render slice already
  picks only `bodyId`, `formatId`, `lensMm` and `track` from a take, and
  notes are text, like names.

### 3.2 Schema changes

| Schema | Change |
|---|---|
| `clipRecordSchema` | New strict object. `blobKey` non-empty string; `stateHash` matching `/^[0-9a-f]{64}$/`; `rendererVersion` integer ≥ 1; `formatId` enum of the preset ids; `width`, `height` even integers ≥ 2; `fps` literal 24; `frameCount` integer ≥ 1; `codec` non-empty string; `bytes` integer ≥ 0; `renderedAt` ISO string; `missingAssets` array of strings. |
| `takeSchema` | Gains `clip: clipRecordSchema.optional()`. |
| `shotSchema` | Gains `notes: z.string().max(2000).optional()`. |

`schemaVersion` stays 2 and no migration step is added: both fields are
optional, so every document M3 writes is a valid M4 document. The reverse is
false (M3's strict schemas reject the new keys), which is acceptable
because M3 and M4 ship on one deployment line with no M3-only release in
between. If M3 is released on its own first, M4 adds a `{ 2: migrateV2toV3 }`
step that only bumps the version, and this section changes to schema 3.

### 3.3 Clip status

Pure functions in `src/domain/clip-status.ts`:

```ts
export const RENDERER_VERSION = 1;

export type ClipStatus = "none" | "ready" | "stale";

// hashShotState with the given take selected. The hash of the selected take equals hashShotState.
export function hashTakeState(scene: Scene, shot: Shot, takeId: string, assets: PropAsset[]): Promise<string>;

export function clipStatus(
  clip: ClipRecord | undefined,
  currentHash: string,
  env: { blobPresent: boolean; missingAssetsNow: ReadonlySet<string> },
): ClipStatus;
```

`hashTakeState(scene, shot, takeId, assets)` is
`hashShotState(scene, { ...shot, camera: { ...shot.camera, selectedTakeId: takeId } }, assets)`.
It exists so the takes panel can show a status for a take that is not
selected, which OD1 needs.

`clipStatus` in order:

1. `clip` absent, or `env.blobPresent` false: `none`. A record whose blob is
   gone (deleted by hand, cleared storage, a project zip without clips)
   behaves as if there were no clip.
2. `clip.stateHash !== currentHash`: `stale`. This is exactly M3's table in
   4.4: selecting another take, moving a key, changing lens, body, format,
   duration, blocking or a prop's model all go stale; renaming, notes, a
   rig change, a new take and an export and import round trip do not.
3. `clip.rendererVersion !== RENDERER_VERSION`: `stale`. The builder,
   lights or encoder settings changed in code since the render. Every
   change to `src/render/` that alters pixels bumps the constant, and a
   test pins a digest of the built world's recipe (11.3), so a forgotten
   bump fails CI.
4. Any id in `clip.missingAssets` is absent from `env.missingAssetsNow`:
   `stale`. A prop that was a placeholder at render time has come back, and
   the hash cannot see that because a missing blob does not change the
   document.
5. Otherwise `ready`.

The status the UI shows while a job for that take is queued or running is
a job state (5.2), drawn beside the clip status, never instead of it.

Hashes are computed by one hook, `useTakeHashes(sceneId)`, debounced
300 ms after the document settles (Film Planner's `HASH_DEBOUNCE_MS` in
`src/components/stage/block-panel.tsx`). Until the first hash arrives, a
take shows no status chip. A scene of 20 shots with 3 takes each is 60
SHA-256 digests of a few kilobytes per settle.

### 3.4 Clip blobs

- **Kind.** `BlobKind` already includes `"clip"` (S1 `src/storage/db.ts`,
  extended by M3 with `"track"`). No IndexedDB version change.
- **Key.** `clip:<takeId>:<stateHash first 12 hex>:<6-char random id>`. The
  prefix lets `listClipKeys` filter keys from the `byProject` index with
  `getAllKeysFromIndex`, which reads keys without loading clip bytes. The
  random tail keeps two renders of the same state distinct, so writing a
  new clip never overwrites a blob another record still points at.
- **MIME type** `video/mp4`. Stored as an `ArrayBuffer` plus type, as S1's
  `blob-store.ts` does for every kind (WebKit's ephemeral IndexedDB rejects
  `Blob` values).
- **Immutable.** A blob is written once and never rewritten.
- **Deleting.** When a render replaces a take's clip, the old blob is
  deleted at once if no other take in the project references it
  (`deleteClipIfUnreferenced`). Deleting a take or a shot does not delete
  its clip blob, because undo can bring the take back with its record.
  On project open, clip blobs no take references are deleted
  (`collectOrphanClips`), next to M3's `collectOrphanTracks`.
- **Presence.** On project open, `listClipKeys(projectId)` fills
  `outputsStore.presentClipKeys` (5.1), which feeds
  `clipStatus(..., { blobPresent })`. Writing and deleting clips keep the set
  current for the session.

New module `src/storage/clip-store.ts`:

```ts
export function clipBlobKey(takeId: string, stateHash: string): string;
export async function putClip(projectId: string, takeId: string, stateHash: string, mp4: Blob): Promise<{ blobKey: string }>;
export async function getClip(blobKey: string): Promise<Blob | null>;
export async function listClipKeys(projectId: string): Promise<Set<string>>;
export async function deleteClipIfUnreferenced(project: Project, blobKey: string): Promise<boolean>;
export async function collectOrphanClips(project: Project): Promise<number>;
export async function deleteAllClips(projectId: string): Promise<number>;   // bytes freed
```

M3's project-open sequence (M3 5.3) becomes: `loadProject`, the v1 backup
when needed, `collectOrphanTracks`, `collectOrphanClips`,
`loadDenseTracks`, `listClipKeys`, then `documentStore.load`.

### 3.5 Commands

Added to `src/state/commands.ts` beside M3's commands. Both are no-ops in a
read-only tab and silent no-ops when an id does not resolve, as M3's are.

| Signature | Does |
|---|---|
| `setTakeClip(shotId: string, takeId: string, clip: ClipRecord \| null): void` | Writes or clears `take.clip` through `documentStore.applyTransient`: saved, not an undo step (OD8). Called only by the render queue and by "Delete all clips". |
| `setShotNotes(shotId: string, notes: string): void` | Trims to 2,000 characters and writes `shot.notes`. An empty string removes the field. One undo step, like every text edit. |

`clearAllClips(): Promise<void>` is a store action on `outputsStore`, not a
document command: it cancels queued clip jobs, calls `deleteAllClips`, then
removes every take's `clip` record in a single `applyTransient` recipe
(`clearClipRecords(draft)` in `src/state/take-actions.ts`).

## 4. The deterministic renderer

### 4.1 Where the code lives

`src/render` is a new layer between domain and viewport in the main spec's
architecture table: three.js, no React, importable from a worker. `src/export`
builds files from renders and the blob store.

| Folder | Holds | React or three.js? |
|---|---|---|
| `src/domain` | `frames.ts` (the frame plan), `clip-status.ts`, `cut-list.ts`, `output-names.ts`, `storyboard.ts` (panel choice and page layout) | Neither. Tested in Node |
| `src/render` | `constants.ts`, `build-scene.ts` (the world builder), `frame-renderer.ts`, `encode-mp4.ts`, `render-clip.ts`, `render-worker.ts`, `render-client.ts` | three.js only |
| `src/storage` | `clip-store.ts` (3.4), `world-input.ts` (reads prop bytes and track blobs for a render) | Neither |
| `src/export` | `storyboard-pdf.ts`, `storyboard-png.ts`, `clips-zip.ts`, `cutlist-csv.ts`, `download.ts` | Neither |
| `src/state` | `outputs-store.ts` (the queue, 5.1), `animatic-store.ts` (6.4) | React only |
| `src/app` | `routes/AnimaticPage.tsx`, `components/outputs/*` | React only |

Dependencies point down: `src/export` and `src/state` may import
`src/render`; `src/render` imports `src/domain` and the read functions of
`src/storage`, and nothing from `src/viewport`, `src/state` or `src/app`.

### 4.2 The frame plan

Pure, in `src/domain/frames.ts`:

```ts
export type FrameSample = {
  index: number;             // 0-based frame within the shot
  t: number;                 // index / FPS, seconds
  camera: CameraPose;        // cameraAt(take, t)
  vFovDeg: number;           // takeOptics(take).vFovDeg
  aspect: number;            // takeOptics(take).aspect
  objects: StageObject[];    // resolveScene(scene, shot, t): visible objects only
};

export function shotFrameCount(shot: Shot): number;   // frameOf(shot.durationSec)
export function frameTime(i: number): number;         // i / FPS
export function sampleShotFrame(scene: Scene, shot: Shot, take: Take, i: number): FrameSample;
export function framePlanDigest(scene: Scene, shot: Shot, take: Take): Promise<string>;
```

- **Count.** `N = shotFrameCount(shot) = frameOf(shot.durationSec)`. M3 keeps
  `durationSec` on the frame grid within 0.5 to 60 s, so `N` is an integer
  from 12 to 1,440 and `N / FPS === durationSec` exactly.
- **Times.** Frame `i` is at `t = i / FPS` for `i` in `[0, N)`, and
  `frameOf(i / FPS) === i` for every `i` in that range (a test sweeps all
  1,440). `sampleShotFrame` throws `RangeError` for an `i` outside the range
  or not an integer.
- **The end of a shot.** The last frame is `N − 1`, at
  `durationSec − 1/24`. Shots cut end to end: shot A's frames are
  `0 … N−1` and shot B's frame 0 follows. A camera key at exactly
  `durationSec` (frame `N`) is the pose one frame past the cut, so frame
  `N − 1` of a two-key linear move shows `(N − 1) / N` of the way. M3's move
  presets put their end key at `snapToFrame(durationSec)`; section 15,
  question 2 asks whether they should end at frame `N − 1` instead.
- **Takes and shot length.** A dense take longer than its shot is cut at
  frame `N − 1` (M3, error table). A take shorter than its shot holds its
  last pose, because `cameraAt` clamps.
- **Pose spans** switch on the key's own frame, since `dollPoseAt` compares
  `frameOf(t)` (M3 4.3) and `frameOf(i / FPS) === i`.
- **Dense tracks** are read from `denseTrackCache` (M3 3.3), which is
  synchronous. A dense take whose blob is listed in
  `documentStore.missingTracks`, or absent from the cache, makes every
  render entry point throw `TrackMissingError` before drawing a frame: M3's
  error table says M4 refuses to export that take and says why.
- **Digest.** `framePlanDigest` is SHA-256 over `stableStringify` (S1
  `src/domain/hash.ts`) of all `N` samples. It is the Node-side determinism
  check (4.9) and appears nowhere in the document.

### 4.3 The world builder

`src/render/build-scene.ts` is Film Planner's `src/stage/render/build-scene.ts`
copied with its tests (the `buildStageScene` and `buildShotCamera` cases in
`render-clip.test.ts`), confirmed green, then changed.

```ts
export type RenderLook = "standard" | "guide";
export type FloorMode = "grid" | "none";

export type WorldInput = {
  scene: Scene;
  assets: PropAsset[];
  propBytes: ReadonlyMap<string, ArrayBuffer>;   // by PropAsset id, imported props only
};

export type StageWorld = {
  root: THREE.Scene;
  nodes: ReadonlyMap<string, THREE.Group>;       // one group per set object, by object id
  dispose(): void;                               // geometries, materials, textures, env map
};

export async function buildStageWorld(
  input: WorldInput,
  opts: { look: RenderLook; floor: FloorMode },
): Promise<{ world: StageWorld; missingAssets: string[] }>;

export function applyFrame(world: StageWorld, objects: StageObject[]): void;
export function buildShotCamera(): THREE.PerspectiveCamera;          // near 0.1, far 1000, as S1's thumbnails
export function applyCamera(camera: THREE.PerspectiveCamera, pose: CameraPose, vFovDeg: number, aspect: number): void;
```

`buildStageWorld` builds every object in the set once, hidden ones
included, the way S1's `SceneContents` mounts them. `applyFrame` then moves
the world to one frame: every node not in `objects` is hidden (resolve
already dropped invisible objects), every node in it gets its position,
yaw, uniform scale and, for a doll, the joint rotations of its pose from
`POSES`. A doll node keeps references to its eight joint groups, so a pose
change sets rotations instead of rebuilding meshes.

What changes against Film Planner, row by row:

| Film Planner (`build-scene.ts`) | M4 |
|---|---|
| `buildStageScene(objects)` builds the resolved objects once for a static shot | `buildStageWorld` builds the set once; `applyFrame` updates it per frame, because objects move in M3 |
| Primitives at fixed sizes: box 1 m, cylinder radius 0.35 m, sphere radius 0.5 m, plane 4 × 4 m | S1's sized primitives, copied from `src/viewport/PrimitiveMesh.tsx`: `size: [w, h, d]`, plus the `wall` shape |
| No props | Imported props parsed from their GLB bytes once per asset and cloned per instance, with S2's pivot and `unitScale` normalisation and tint. Kit props from S2's kit builders. A prop whose bytes are missing or fail to parse becomes a box at `asset.bounds` in `MISSING_PROP_COLOR`, and its asset id goes into `missingAssets` |
| Ambient 0.7, directional 1.4 | S1's viewport light rig from `StageCanvas.tsx`: ambient 0.6, directional 1.2 at `(5, 10, 4)`, and an environment map made with `PMREMGenerator.fromScene` from three emissive rectangles at the positions, scales, rotations and intensities of the viewport's three `Lightformer`s, at resolution 256 |
| `GridHelper(20, 20)` | Floor `"grid"`: `GridHelper(40, 40)` in S1's `Ground.tsx` colours `#5b6472` and `#3a4048`. drei's `<Grid>` fades with camera distance in a shader, so it is not reused. Floor `"none"` draws nothing (OD13) |
| `buildShotCamera(camera)` with `lensToVFovDeg` and a fixed 21:9 aspect | `applyCamera` with `vFovDeg` and `aspect` from `takeOptics(take)`, position and quaternion from `cameraAt` |
| Background `STAGE_BACKGROUND = "#15171c"` | The same constant, moved to `src/render/constants.ts`. M4.1 sets the live viewport's scene background from it too, so both paths share one colour |
| Renderer defaults (no tone mapping) | The R3F `Canvas` defaults the viewport runs with. M4.1 reads `toneMapping`, `toneMappingExposure` and `outputColorSpace` from the viewport's `gl` once and pins them in `constants.ts`, so both paths tone map alike |

**Looks.** `"standard"` draws materials as the viewport does. `"guide"`,
for M9, replaces every mesh material (props, dolls, primitives,
placeholders) with one shared `MeshStandardMaterial` of colour `GUIDE_GREY
= "#9a9a9a"`, roughness 1, metalness 0, and ignores textures and tints.
Lights, background and floor stay. M9 decides whether its guide needs more
than this; M4 only provides the switch.

**Props in a worker.** S2 decides the GLB loader, the normalisation and
the kit builders. M4 needs three things from S2's code, checked when M4.1
starts: a GLB parse that runs from an `ArrayBuffer` without the DOM, a
normalisation function that works on a plain `THREE.Object3D`, and kit
builders that return `THREE.Object3D` without React. If S2 wrote any of them
inside a React component, M4.1 moves the three.js part into a pure function
the component wraps, and the component's behaviour does not change.
Whether GLB textures decode inside a worker in both browsers (three's
loader picks between `ImageBitmapLoader` and `TextureLoader`) is confirmed
at milestone start; a failure there falls back per 4.7.

**Rules the builder keeps, for determinism.** No `Math.random`, no clock
reads, fixed geometry segment counts, one environment map per world, pixel
ratio 1, the canvas at exactly the target size, `antialias: true`,
`preserveDrawingBuffer: true` (so a `VideoFrame` or a readback always sees
the frame just drawn).

### 4.4 The frame renderer

`src/render/frame-renderer.ts` wraps one `WebGLRenderer`, one world and one
camera. Clips, stills, the animatic's live view and the scene MP4 all draw
through it.

```ts
export type FrameRendererOptions = {
  width: number;                      // even pixels
  height: number;
  look?: RenderLook;                  // default "standard"
  floor?: FloorMode;                  // default "grid" (OD13)
  canvas?: OffscreenCanvas | HTMLCanvasElement;   // default: a new OffscreenCanvas, else a detached <canvas>
};

export interface FrameRenderer {
  readonly canvas: OffscreenCanvas | HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  load(input: WorldInput): Promise<{ missingAssets: string[] }>;  // builds the world; parsed props are kept across loads by asset id
  resize(width: number, height: number): void;                    // the animatic player only
  draw(sample: FrameSample): void;
  readPixels(): Uint8Array;           // RGBA, top row first, width × height × 4 bytes
  dispose(): void;                    // world, renderer, then forceContextLoss()
}

export function createFrameRenderer(opts: FrameRendererOptions): FrameRenderer;
```

**Letterboxing.** When the canvas aspect equals `sample.aspect` within
1e-4, `draw` renders the full canvas. Otherwise it clears the canvas to
`LETTERBOX_COLOR = "#000000"`, sets the viewport and scissor to the largest
rectangle of `sample.aspect` centred in the canvas (whole pixels, even
sizes), and renders into it with `vFovDeg` unchanged. The region inside
the bars is then exactly the exported frame, the same promise M3's
`viewportFovDeg` makes for the live viewport. Clips never letterbox: their
canvas is the format's export size. The animatic player and the scene MP4
do.

**Readback.** `readPixels` calls `gl.readPixels` on the drawing buffer and
flips rows, as S1's `pixelsToPngBlob` in `src/viewport/thumbnails.ts` does,
because WebGL reads bottom row first.

**Dispose.** Film Planner's `renderClip` ends with `renderer.dispose()` and
`renderer.forceContextLoss()`, with the note that Chrome caps live WebGL
contexts and sequential exports could otherwise evict the viewport's
context. `dispose` keeps both calls.

### 4.5 Encoding: WebCodecs and Mediabunny

`src/render/encode-mp4.ts`, the encoder half of Film Planner's
`render-clip.ts` with the muxer swapped.

```ts
export const H264_CODEC_CANDIDATES = ["avc1.640033", "avc1.420032"] as const;  // High 5.1, then Baseline 5.0 (Film Planner)
export const KEYFRAME_INTERVAL_FRAMES = FPS * 2;   // 48: frame 0, then every 2 s (Film Planner used CLIP_FPS * 2)
export const MAX_ENCODE_QUEUE = 4;                 // Film Planner's backpressure threshold

export function clipBitrate(width: number, height: number): number;             // bits per second; Reserved for Nick (13)
export async function pickEncoderConfig(width: number, height: number): Promise<VideoEncoderConfig | null>;

export type Mp4Writer = {
  addFrame(canvas: OffscreenCanvas | HTMLCanvasElement, index: number): Promise<void>;
  finish(): Promise<{ blob: Blob; codec: string }>;
  abort(): Promise<void>;
};
export async function openMp4Writer(opts: { width: number; height: number; signal?: AbortSignal }): Promise<Mp4Writer>;

export class UnsupportedBrowserError extends Error {}   // kept from Film Planner
```

**Encoder config.** For each candidate in order:
`{ codec, width, height, bitrate: clipBitrate(width, height), framerate: FPS, avc: { format: "avc" } }`,
kept when `VideoEncoder.isConfigSupported` answers `supported: true`.
`avc.format` is set explicitly so each chunk arrives in the length-prefixed
form an MP4 track expects. Film Planner's comment on the candidates holds:
the wide sizes exceed the frame size H.264 level 4.2 allows, so the codec
strings declare level 5.x. Every M4 export size is 1,080 px tall with a
width from 1,440 to 2,582 px.

**Default bitrate.** `clipBitrate` scales Film Planner's 8 Mbps at
2520 × 1080 by pixel count, rounded to the nearest 100 kbps:
`round(8_000_000 × (w × h) / (2520 × 1080) / 100_000) × 100_000`.

| Format | Export (px) | Bitrate |
|---|---|---|
| `21:9` | 2520 × 1080 | 8.0 Mbps |
| `2.39:1` | 2582 × 1080 | 8.2 Mbps |
| `1.85:1` | 1998 × 1080 | 6.3 Mbps |
| `16:9` | 1920 × 1080 | 6.1 Mbps |
| `4:3` | 1440 × 1080 | 4.6 Mbps |

The bitrate caps the average data rate. Greybox frames are flat and compress
well, so real files should land well under `bitrate × seconds / 8`; M4.1
measures a 10 s fixture per format and records the sizes in the changelog.
Until then the storage estimate (9) uses the full target, which errs on
the safe side.

**Per frame.** `addFrame` wraps the canvas in
`new VideoFrame(canvas, { timestamp, duration })` with
`timestamp = Math.round(index × 1_000_000 / FPS)` µs and
`duration = Math.round(1_000_000 / FPS)` = 41,667 µs, encodes it with
`keyFrame: index % KEYFRAME_INTERVAL_FRAMES === 0`, closes the frame in a
`finally`, then waits in Film Planner's `awaitEncoderDrain` until
`encodeQueueSize` drops to `MAX_ENCODE_QUEUE` or the signal aborts.

**Muxing.** Mediabunny replaces `mp4-muxer`:

```ts
const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
const source = new EncodedVideoPacketSource("avc");
output.addVideoTrack(source, { frameRate: FPS });
await output.start();
// VideoEncoder output callback: chunks are added in order through one promise chain
chain = chain.then(() => source.add(EncodedPacket.fromEncodedChunk(chunk), meta));
// finish(): check the stored encoder error, encoder.flush(), await chain, output.finalize(),
//           new Blob([output.target.buffer], { type: "video/mp4" })
// abort():  encoder.close(), output.cancel()
```

`fastStart: "in-memory"` keeps the metadata at the front of the file, the
same choice Film Planner made with `mp4-muxer`, so a clip starts playing
from a blob URL before it is fully read. The class names `Output`,
`Mp4OutputFormat`, `BufferTarget`, `EncodedVideoPacketSource` and
`EncodedPacket.fromEncodedChunk`, and the three `fastStart` values, are from
the Mediabunny guide (mediabunny.dev/guide/media-sources,
/guide/packets-and-samples and /guide/output-formats, read 2026-09-25).
The exact names of `start`, `addVideoTrack`, `finalize` and `cancel` are
confirmed against its API reference when M4.1 starts. Mediabunny is
licensed MPL-2.0 (registry.npmjs.org/mediabunny, version 1.60.0, read
2026-09-25): using it unmodified as a dependency puts no obligation on this
repo's own files. Pin the version.

**Error order.** Film Planner checks the stored encoder error before
`flush`, because a close-on-error would otherwise hide the real error
behind `flush`'s `InvalidStateError`. The port keeps that order, and checks
the chain's rejection after `flush` the same way.

**Browser support.** From MDN's browser compatibility data
(github.com/mdn/browser-compat-data, files `api/VideoEncoder.json`,
`api/VideoFrame.json` and `api/OffscreenCanvas.json` on the main branch,
read 2026-09-25):

| Feature | Chrome | Safari | M4 uses it for |
|---|---|---|---|
| `VideoEncoder`, `isConfigSupported`, `encodeQueueSize` | 94 | 16.4 | Encoding |
| `VideoEncoder` `dequeue` event | 106 | 16.4 | Backpressure |
| `VideoFrame` constructor | 94 | 16.4 | Wrapping each rendered canvas |
| `OffscreenCanvas`, `convertToBlob` | 69 | 16.4 | Stills and PNG frames |
| `OffscreenCanvas` `webgl2` context | 69 | 17 | Rendering inside a worker (4.7) |

MDN's `VideoEncoder` page notes it is available in dedicated workers
(developer.mozilla.org/en-US/docs/Web/API/VideoEncoder, read 2026-09-25).
This data says an API exists; it does not say which codec strings and
sizes a given browser's encoder accepts. **Confirm at milestone start:**
run `pickEncoderConfig` for all five export sizes in Chrome and Safari on
the development Mac, and record which candidate each accepts in this
spec's changelog.

### 4.6 When the browser cannot encode

`probeClipSupport(formatId)` returns the accepted config, or `null` when
`VideoEncoder` is undefined or no candidate is supported at that size. The
result is cached per format for the session. With `null`:

- The Render button on a take reads **Export frames (PNG zip)**. It runs
  `renderFrameSequence`, which draws the same frames and downloads them as
  a zip: `<base>/<base>_0000.png` up to `N − 1`, four digits (five above
  9,999 frames, which a 60 s shot never reaches), with `<base>` from 8.4.
  Nothing is stored, and the take's clip status stays `none`.
- The animatic renders every shot live (6.5).
- The scene clips export offers per-shot PNG sequences in one zip instead
  of MP4s.
- One line under the Render button says why: "This browser can't encode
  H.264 at 2520 × 1080. Frames export as PNGs; the animatic plays live."

`MediaRecorder` is never used (OD3).

### 4.7 Worker or main thread

`src/render/render-client.ts` decides where a job runs, once per session:

1. On the first job, start `render-worker.ts`
   (`new Worker(new URL("./render-worker.ts", import.meta.url), { type: "module" })`)
   and send `{ type: "probe" }`. The worker answers `ok: true` when
   `new OffscreenCanvas(16, 16).getContext("webgl2")` returns a context and
   `typeof VideoEncoder !== "undefined"`.
2. `ok: true`: every job runs in the worker. `ok: false`, or no answer in
   3 s: every job runs on the main thread for the rest of the session. From
   the table in 4.5, Safari before 17 always takes the main thread.
3. A job that fails in the worker with a `WorkerCapabilityError` (a prop
   whose textures cannot decode there, a lost context at start) is retried
   once on the main thread. Any other error fails the job.

Worker messages:

```ts
type ToWorker =
  | { type: "probe" }
  | { type: "run"; jobId: string; job: RenderJobSpec; project: Project }   // project: the snapshot (OD7)
  | { type: "cancel"; jobId: string };

type FromWorker =
  | { type: "probe"; ok: boolean; webgl2: boolean; videoEncoder: boolean }
  | { type: "progress"; jobId: string; done: number; total: number }
  | { type: "done"; jobId: string; result: RenderResult }
  | { type: "error"; jobId: string; name: string; message: string };
```

- The worker reads prop GLBs and dense track blobs itself through
  `src/storage/world-input.ts` (IndexedDB is available in workers; `idb`
  works there), decodes tracks with M3's `decodeDenseTrack`, and fills its
  own copy of `denseTrackCache`. Only the document snapshot crosses the
  message boundary.
- The worker never writes to IndexedDB. It returns blobs; the main thread
  stores clips and writes records (5.2), so all document writes stay on the
  thread that owns `documentStore`.
- Parsed props stay cached in the worker by asset id and blob key between
  jobs. The worker is terminated when the project closes, or after 60 s
  with no job.

On the main thread the same `render-clip.ts` functions run with an
`OffscreenCanvas` when `webgl2` works on one, else a detached `<canvas>`.
After every frame the loop yields once through a `MessageChannel` message,
so input and the live viewport keep running between frames. Whether a
hidden tab keeps rendering at full speed on each path is confirmed at
milestone start; if a browser slows it, the queue indicator reads "Paused
while this tab is hidden".

### 4.8 Render entry points

`src/render/render-clip.ts`. Each takes a document snapshot and ids, never
live store state, so the same call works in the worker and on the main
thread.

```ts
export type RenderIO = {
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
};

export type ClipRequest = {
  project: Project; sceneId: string; shotId: string; takeId: string;
  look?: RenderLook;                 // default "standard"; M9 passes "guide"
  collectFrameDigests?: boolean;     // tests only (4.9)
};

export type RenderClipResult = {
  blob: Blob;                        // video/mp4
  codec: string;
  width: number; height: number; frameCount: number;
  missingAssets: string[];
  frameDigests?: string[];           // SHA-256 hex of each frame's RGBA, when requested
};

export type StillRequest = {
  project: Project; sceneId: string; shotId: string; takeId: string;
  frame: number;                     // index into the shot's frame plan
  width?: number; height?: number;   // default: the take's export size
  look?: RenderLook;
  mime?: "image/png" | "image/jpeg"; // default PNG
  quality?: number;                  // JPEG only, default 0.9
};

export async function renderClip(req: ClipRequest, io?: RenderIO): Promise<RenderClipResult>;
export async function renderStills(reqs: StillRequest[], io?: RenderIO): Promise<Blob[]>;   // one world per scene, reused across panels
export async function renderFrameSequence(req: ClipRequest, io?: RenderIO): Promise<Blob>;  // zip of PNGs (4.6)
export async function renderSceneClip(
  req: { project: Project; sceneId: string; formatId: FrameFormatId },
  io?: RenderIO,
): Promise<RenderClipResult>;                                                                  // 8.3
export async function probeClipSupport(formatId: FrameFormatId): Promise<VideoEncoderConfig | null>;

export class TrackMissingError extends Error {}
export class WorkerCapabilityError extends Error {}
```

`renderClip` in order: resolve scene, shot and take from the snapshot
(an unknown id throws); throw `TrackMissingError` for a missing dense
track; pick the config or throw `UnsupportedBrowserError`; create the frame
renderer at the export size; `load` the world; open the writer; for `i` in
`0 … N−1`: check the signal, `draw(sampleShotFrame(scene, shot, take, i))`,
optionally digest `readPixels()`, `addFrame`, report progress `(i + 1, N)`;
then `finish`. A `finally` disposes the renderer and aborts the writer when
it was not finished. This is Film Planner's loop with `frameT(i, total)`
replaced by `sampleShotFrame`.

### 4.9 What "deterministic" means here

Three levels, and only the first two are promised.

1. **The frame plan is a pure function.** For the same document,
   `sampleShotFrame` returns deep-equal samples on every run, and
   `framePlanDigest` is identical across runs and machines on the same
   JavaScript engine. Across engines (Node's V8 in CI, JavaScriptCore in
   Safari) M4 does not rely on bit-equal floats, since slerp and look
   rotation call `Math` functions; the cross-engine check compares
   positions and quaternion components within 1e-9.
2. **Pixels are identical in one browser on one machine.** Two renders of
   the same take in the same browser on the same machine give the same
   SHA-256 for every frame's RGBA readback. That holds because of the
   builder rules in 4.3 and the fixed canvas size. It is not promised
   across GPUs, drivers, browsers or OS versions: rasterisation and
   multisample resolve differ between them.
3. **MP4 bytes are not compared.** The browser may encode in hardware or
   software, and a container can carry creation times (whether Mediabunny
   writes one is checked at milestone start). Tests check what matters
   instead: the demuxed file has one H.264 track, `N` frames, timestamps
   `i / FPS`, the export width and height, and the codec string the
   encoder accepted.

Film Planner's docstring promises "Same state in, same clip out, on any
machine". This spec narrows that to levels 1 and 2, which are the ones a
test can hold.

## 5. Render queue, progress and cancel

### 5.1 The outputs store

A session store in `src/state/outputs-store.ts`, beside M3's three stores.
Never persisted, never undone, reset when the project closes.

```ts
export type RenderJobSpec =
  | { kind: "clip"; sceneId: string; shotId: string; takeId: string; store: boolean }   // store false: download only
  | { kind: "frames"; sceneId: string; shotId: string; takeId: string }                 // PNG zip fallback (4.6)
  | { kind: "stills"; sceneId: string; requests: Omit<StillRequest, "project">[] }      // storyboard, M9 first frame
  | { kind: "scene-clip"; sceneId: string; formatId: FrameFormatId };                  // 8.3

export type RenderResult =
  | { kind: "clip"; clip: RenderClipResult }
  | { kind: "frames"; zip: Blob }
  | { kind: "stills"; images: Blob[] }
  | { kind: "scene-clip"; clip: RenderClipResult };

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export type RenderJob = {
  id: string;
  spec: RenderJobSpec;
  label: string;                         // "Shot 03 · Take 2", "Storyboard · Scene 1"
  status: JobStatus;
  progress: { done: number; total: number };
  stateHash?: string;                    // clip jobs: hash of the snapshot, set when the job starts
  error?: string;                        // plain sentence for the UI (10)
  result?: Blob;                         // a finished clip kept in memory when storing it failed
};

export type OutputsState = {
  jobs: RenderJob[];                                       // queue order; at most one "running"
  presentClipKeys: ReadonlySet<string>;                    // 3.4
  workerMode: "unknown" | "worker" | "main";               // 4.7
  enqueue(spec: RenderJobSpec): { jobId: string; done: Promise<RenderResult> };
  cancel(jobId: string): void;
  cancelAll(): void;
  dismiss(jobId: string): void;                            // removes a finished, failed or cancelled job
  clearAllClips(): Promise<void>;                          // 3.5
  reset(presentClipKeys: ReadonlySet<string>): void;       // project open; cancels everything
};
```

`done` resolves with the result and rejects with the job's error, so an
export can `await` its renders. Clip jobs are fired and forgotten by the
UI: the queue writes their record itself (5.2).

### 5.2 A job's life

1. **Enqueue.** A `clip` job for a take that already has a queued job
   returns that job. A `clip` job for a take whose running job started
   from the same hash returns the running job; from a different hash, a new
   job queues behind it. A stored clip job runs the quota check in 9 first.
   In a read-only tab, `store: true` is refused and the UI offers
   "Download clip" (`store: false`) instead.
2. **Start.** When a job reaches the head, the queue takes
   `documentStore.getState().project` as the snapshot (OD7). A clip job
   computes `stateHash = hashTakeState(snapshot…)` now, not at enqueue.
3. **Run.** `render-client.ts` sends the snapshot and spec to the worker or
   runs it inline (4.7). Progress reaches the store at most 10 times a
   second.
4. **Finish, clip jobs with `store: true`.** On the main thread: if the take
   no longer exists in the current document, the result is dropped and the
   job ends `done` with the note "Take was deleted during the render".
   Otherwise `putClip`, then `setTakeClip(shotId, takeId, record)` with the
   snapshot's hash, then `deleteClipIfUnreferenced` for the replaced blob,
   then add the key to `presentClipKeys`. If the user edited the shot during
   the render, the new record is `stale` at once, which is correct.
5. **Finish, other jobs.** The result goes to `done`. Downloads start from
   the caller (8).
6. **Fail.** Status `failed` with a sentence from the error table. Failed
   jobs stay listed until dismissed; done jobs leave the list after 10 s.
7. **Cancel.** A queued job is removed at once. A running job's
   `AbortController` fires; in the worker, `{ type: "cancel" }` aborts the
   same way. The encoder closes, nothing is stored, and the take keeps
   whatever clip it had before.

The queue runs one job at a time (OD6). Closing the project calls
`cancelAll`. While any job is queued or running, `beforeunload` asks the
browser to confirm leaving, and navigating out of the project (to `/`)
shows "2 renders in progress. Leave and cancel them?".

### 5.3 Where renders show up

- **Queue indicator** in `ProjectLayout`'s header, hidden when idle:
  "Rendering Shot 03 · Take 2 · 45 % · 2 queued". It opens a popover with
  every job, its progress bar, Cancel per job and Cancel all. It is visible
  on every project route, the animatic included.
- **Takes panel** (M3 7.5). Each take row gains a clip chip from
  `clipStatus`: a green dot "Clip" for `ready`, an amber dot "Clip out of
  date" for `stale`, nothing for `none`. A queued or running job shows
  "Queued" or a percentage beside it. The row menu gains Render clip,
  Download clip (ready only) and Delete clip.
- **Clip section**, under the take list, for the selected take:

  ```
  Clip · ready                                  2520 × 1080 · 4.00 s · 3.1 MB
  Rendered 14:02                                [Play] [Download MP4] [Re-render]
  ------------------------------------------------------------------------------
  Clip · out of date                                                 [Re-render]
  The shot changed since this clip was rendered.
  ------------------------------------------------------------------------------
  Rendering  [==========--------------]  frame 43 / 96 · 45 %           [Cancel]
  ```

  Play opens a dialog with a looping `<video controls>` of the clip. The
  layout follows Film Planner's `src/components/stage/block-panel.tsx`
  (progress, frame counter, Cancel, the stale banner), rebuilt with the
  repo's shadcn components.
- **Shot strip cards** (S1) gain a dot for the selected take's clip status:
  green for `ready`, amber for `stale`, none for `none`.
- **Scene page** toolbar gains "Play animatic" and a menu item "Render stale
  clips", which enqueues a stored clip job for every shot whose selected
  take is `stale` or `none`.

## 6. The animatic route

### 6.1 Route and entry points

```ts
// src/app/router.tsx, a child of "/p/:projectId", beside StageLayout (not inside it)
{ path: "scene/:sceneId/play", element: <AnimaticPage /> }
```

- Entry: "Play animatic" on the scene page toolbar and on each scene card
  on the board. Exit: the back link, or Esc when not in fullscreen, returns
  to `/p/:projectId/scene/:sceneId`.
- The route sits outside the stage layout, so opening it unmounts the
  editor's canvas as leaving to the board does (main spec, Navigation). The
  player owns its own canvas (6.5).
- An unknown scene id shows "Scene not found" with a link to the board. A
  scene with no shots shows "No shots in this scene yet" with a link back.

### 6.2 The cut list

Pure, in `src/domain/cut-list.ts`. Scene time is counted in whole frames,
so summing durations never drifts.

```ts
export type CutEntry = {
  index: number;             // 0-based position in scene.shots (the cut order)
  number: string;            // cutNumber(index, total): "01", "02", …
  shotId: string;
  takeId: string;            // the shot's selected take
  takeNumber: number;
  formatId: FrameFormatId;
  frameIn: number;           // scene frame of this shot's first frame
  frameCount: number;        // shotFrameCount(shot)
};

export function buildCutList(scene: Scene): CutEntry[];
export function sceneFrameCount(cut: CutEntry[]): number;
export function locateFrame(cut: CutEntry[], sceneFrame: number): { entry: CutEntry; localFrame: number };
export function dominantFormat(cut: CutEntry[]): FrameFormatId;
```

- `frameIn` of entry `k` is the sum of `frameCount` over entries before it.
- `locateFrame` clamps `sceneFrame` into `[0, total − 1]` and binary-searches
  the entry with `frameIn ≤ F < frameIn + frameCount`.
- `dominantFormat` is the format covering the most frames; a tie goes to
  the earliest in cut order. It sets the player's box and the scene MP4's
  size.

Worked fixture: shots of 4.00 s, 2.50 s and 6.00 s give frame counts 96,
60 and 144, `frameIn` 0, 96 and 156, and 300 frames in all (12.5 s, time
code `00:00:12:12`). Scene frame 100 is shot 2, local frame 4.

### 6.3 Layout

```
+------------------------------------------------------------------------------+
| ← Scene 1 · Animatic          7 shots · 00:00:31:04    [Render 3 stale] [Export ▾] |
+------------------------------------------------------------------------------+
|                                                                  | Cut list  |
|                                                                  | # Shot .. |
|         player: box at the dominant format's aspect,             | 01 Wide   |
|         each shot letterboxed inside it                          | 02 CU     |
|         badge: "03 · Kitchen wide · Take 2 · Live"               | ...       |
|                                                                  |           |
+------------------------------------------------------------------+-----------+
| [01 ][02][03      ][04][05    ][06 ][07     ]   cut strip, widths ∝ frames   |
|        ▲ playhead                                                            |
+------------------------------------------------------------------------------+
| ⏮  ▶  ⏭   00:00:12:07 / 00:00:31:04   Shot 03 · f 31 / 96   Loop   Cut list   ⛶ |
+------------------------------------------------------------------------------+
```

- **Player.** Black background. The box fills the space left by the bars
  at the dominant format's aspect. A shot of another format is letterboxed
  or pillarboxed inside it. The badge shows while paused or on hover: cut
  number, shot name, take and source ("Clip", "Live" or "Track missing").
- **Cut strip.** One segment per entry, width proportional to
  `frameCount`, with the cut number and, when the segment is at least 64 px
  wide, the shot's S1 thumbnail. A 3 px bar along each segment's bottom
  shows its clip status (green ready, amber stale, grey none). The current
  segment has a ring. The playhead is one line across the strip, moved by
  a store subscription that writes the DOM directly, as M3's timeline does.
  Scene Builder v2's segmented bar in `app/scenes/[sceneId]/animatic/page.tsx`
  is the model; it skipped shots with no clip, and this one never skips.
- **Transport.** Previous shot, Play/Pause, Next shot, scene time code
  (current and total), "Shot 03 · f 31 / 96" (the local frame counted from 0, as in M3's time readout, and the shot's frame count), Loop (off by default), Cut list toggle,
  Fullscreen.
- **Top bar.** Back link, scene name, "7 shots" and the total time code,
  "Render N stale" (hidden when N is 0 or the tab is read-only; enqueues a
  stored clip job for every entry whose status is `stale` or `none`), and
  the Export menu (7, 8).
- **Cut list panel.** Right side, 360 px, closed by default, toggled with
  C. One row per entry: #, Shot, Type, Take, Lens, Format, In, Out,
  Duration, Clip status. In and Out are time codes (8.5). Clicking a row
  seeks to the entry's first frame.

### 6.4 The animatic clock

`src/state/animatic-store.ts`. It is separate from M3's `playbackStore`:
that clock belongs to one shot and drives the editor and the VR shell; this
one runs over a scene. Neither writes to the document.

```ts
export type AnimaticState = {
  sceneId: string | null;
  time: number;              // scene seconds, within [0, totalFrames / FPS]
  playing: boolean;
  loop: boolean;             // default false
  totalFrames: number;
  load(sceneId: string, totalFrames: number): void;   // pauses and seeks to 0
  play(): void;
  pause(): void;
  toggle(): void;
  seekFrame(frame: number): void;     // clamps to [0, totalFrames − 1]; time = frame / FPS; keeps the playing flag
  stepFrames(delta: number): void;    // pauses, then seekFrame(current + delta)
  tick(dtSec: number): void;          // live segments: dt clamped to [0, 0.25] s as in M3 6.4
  syncFromVideo(time: number): void;  // clip segments: sets time from the playing video
  setLoop(loop: boolean): void;
};

export function currentFrame(s: Pick<AnimaticState, "time" | "totalFrames">): number;
// Math.min(totalFrames − 1, Math.floor(time × FPS + 1e-9))
```

At the end of the scene, `loop` wraps to frame 0, otherwise the clock
pauses on the last frame. When the document changes while the page is
open (a render finishing writes a clip record, and S1's undo and redo keys
work on every project route), the cut list is rebuilt and `time` is
clamped into the new length.

### 6.5 What each segment plays

| Selected take | Clip status | The segment plays |
|---|---|---|
| any | `ready` | The stored clip, in a `<video>` |
| sparse, or dense with its track loaded | `stale` or `none` | A live render through the frame renderer |
| dense, track missing | any | A slate: black, "03 · Kitchen wide · Take 2 · Track missing", held for the segment's length |
| any, in a browser that cannot encode (4.6) | `none` | A live render |

Whether a `stale` shot plays live or plays its old clip with a badge is
reserved for Nick (13).

**Live segments.** One `FrameRenderer` draws into the player's own
`<canvas>` on the main thread, sized to the player box times
`devicePixelRatio` and capped at the dominant format's export size. Its
world loads once when the page opens and again 300 ms after a document
change; parsed props are reused between loads. It reads dense samples from
the main thread's `denseTrackCache`, which M3 fills at project open. The
draw loop is a `requestAnimationFrame` loop owned by the page: it calls
`tick(dt)`, finds `(entry, localFrame)` with `locateFrame`, and draws only
when that pair changed since the last draw. If a frame takes longer than
1/24 s to draw, the clock keeps real time and the view shows the latest
frame due, skipping the ones in between.

**Clip segments.** Two stacked `<video>` elements, A and B, each `muted`,
`playsInline`, `preload="auto"`, `object-fit: contain`. The current clip
plays on one; the next `ready` segment's clip waits on the other, paused at
0. Object URLs come from `getClip(blobKey)` for the current and the next
two clip segments, and are revoked when they fall out of that window, when
their record changes, and when the page unmounts. While a clip segment
plays, the page's loop reads `video.currentTime` and calls
`syncFromVideo(entry.frameIn / FPS + video.currentTime)`: the video is the
clock, so picture and time code cannot drift apart. When
`video.currentTime ≥ (frameCount − 0.5) / FPS`, or on `ended`, the page
moves to the next entry: a clip entry swaps A and B and calls `play()`, a
live entry hands the clock back to `tick`.

Switching between two `<video>` elements is not frame exact. The target for
M4.3, checked by hand in Chrome and Safari: no frame of the wrong shot is
ever visible at a cut, and a cut lands within two display frames of its
time code.

**A clip finishing mid-play.** When a render finishes for a take in the cut,
its segment switches from live to clip at the next segment boundary, never
in the middle of the segment.

**Scrubbing.** Pointer down on the cut strip pauses and seeks; dragging
seeks continuously. A clip segment sets
`video.currentTime = (localFrame + 0.5) / FPS` (the middle of the frame, so
the decoder never lands on the previous one) and shows the frame on
`seeked`. A live segment draws the frame at once.

### 6.6 Keyboard

Ignored while focus is in a text field, as in S1. Space never activates a
focused button, as in M3 7.7.

| Key | Action |
|---|---|
| Space | Play or pause |
| ← / → | Previous or next frame, pausing |
| Shift+← / Shift+→ | Back or forward one second, pausing |
| [ / ] | Start of the previous or next shot (S1's shot keys) |
| Home / End | First frame, last frame |
| L | Loop on or off |
| C | Cut list panel open or closed |
| F | Fullscreen on the player box, through the Fullscreen API |
| Esc | Leave fullscreen; outside fullscreen, back to the scene page |

### 6.7 States covered

No shots; every shot `ready`; a mix of `ready`, `stale` and `none`; every
shot `none` in a browser that cannot encode; a dense take with a missing
track; a render finishing during playback; a read-only tab (plays and
scrubs, "Render stale" hidden, exports allowed); a scene of 60 shots (the
strip drops thumbnails below 64 px per segment).

## 7. Storyboard export (R6)

Two files from one menu, both built from the same panels: a PDF for reading
and printing, and a zip of full-size PNG frames for decks, editors and M9.

### 7.1 Which frames become panels

Pure, in `src/domain/storyboard.ts`:

```ts
export type PanelSpec = {
  shotId: string;
  takeId: string;            // the selected take
  frame: number;             // index into the shot's frame plan
  role: "first" | "end";
};

export function shotMoves(scene: Scene, shot: Shot, take: Take): boolean;
export function storyboardPanels(scene: Scene): PanelSpec[];   // cut order; Reserved for Nick (13)
```

Default rule, written into `storyboardPanels`:

- Every shot gets a `first` panel at frame 0. It is the same frame as the
  shot's thumbnail and M9's first frame (M3 4.5).
- A shot that moves also gets an `end` panel at frame `N − 1`.
  `shotMoves` compares `sampleShotFrame` at frames 0 and `N − 1`: it is true
  when the camera position differs by more than 1 mm, the rotation by more
  than 0.01°, or any object's position, yaw, visibility or pose differs. A
  move that returns exactly to where it started counts as static; that is
  accepted.
- A dense take with a missing track gets one `first` panel drawn as a
  slate reading "Track missing".

### 7.2 PDF layout

Page sizes and grid, in millimetres, in `src/domain/storyboard.ts` so the
math is tested in Node:

```ts
export type PageSize = "a4" | "letter";      // default "a4"; both turned sideways
export const PAGE_MM = { a4: { w: 297, h: 210 }, letter: { w: 279.4, h: 215.9 } } as const;
export const STORYBOARD_LAYOUT = {
  marginMm: 12, headerMm: 10, columns: 3, rows: 2,
  gutterXMm: 6, gutterYMm: 6, captionMm: 22, maxImageHeightMm: 49,
} as const;

export type PanelBox = {
  page: number;              // 0-based
  xMm: number; yMm: number;  // image box, top left
  wMm: number; hMm: number;
  captionYMm: number;        // top of the caption block
};

export function layoutStoryboard(panelCount: number, boxAspect: number, page: PageSize): { pages: number; boxes: PanelBox[] };
```

- **Grid.** Three columns by two rows, six panels a page, filled left to
  right then top to bottom, in cut order with each `end` panel right after
  its `first`. `pages = ceil(panels / 6)`.
- **Column width** is `(pageW − 2 × margin − 2 × gutterX) / 3`: 87.0 mm on
  A4, 81.1 mm on Letter.
- **Image box.** One aspect for every box on every page: the scene's
  `dominantFormat`. Height is `min(columnW / aspect, 49 mm)`, width is
  `height × aspect`, centred in its column. Each panel's own image is
  fitted inside its box (contain), centred, with white around it and a
  0.3 pt `#bdbdbd` outline on the box, so a 4:3 shot in a 21:9 board still
  shows its whole frame.
- **Fit.** Two rows need `2 × (49 + 22) + 6 = 148 mm` at most. A4 offers
  `210 − 24 − 10 = 176 mm`, Letter 181.9 mm, so every format fits two rows.

| Dominant format | Box on A4 (mm) | Box on Letter (mm) |
|---|---|---|
| `21:9` | 87.0 × 37.3 | 81.1 × 34.8 |
| `2.39:1` | 87.0 × 36.4 | 81.1 × 33.9 |
| `1.85:1` | 87.0 × 47.0 | 81.1 × 43.9 |
| `16:9` | 87.0 × 48.9 | 81.1 × 45.6 |
| `4:3` | 65.3 × 49.0 | 65.3 × 49.0 |

**Header**, on every page, in the top 10 mm: left, "Project name · Scene
name · Storyboard" in Helvetica Bold 10 pt; right, "Page 2 of 4 · 2026-09-25"
(the export date) in 8 pt.

**Caption**, in the 22 mm under each box, Helvetica, `#222222`, line height
3.6 mm:

1. Bold 9 pt: cut number and shot name, "03  Kitchen wide"; right-aligned
   "Take 2". An `end` panel reads "03  Kitchen wide · end".
2. 8 pt: shot type, lens, body, format and duration:
   "CU · 35 mm · Full frame · 21:9 · 4.00 s". The lens shows one decimal
   and drops a trailing ".0", so a migrated 22.5 mm reads "22.5 mm". An
   `end` panel reads "at 3.96 s", the time of frame `N − 1`.
3. to 5. 8 pt: `shot.notes`, wrapped to the column width with jsPDF's
   `splitTextToSize`, at most three lines, the third ending in "…" when cut.
   `end` panels carry no notes.

**Images.** Panels are rendered through `renderStills` (one `stills` job)
at 1200 px on the long side, height from the take's aspect rounded to an
even number, as JPEG at quality 0.9, and placed with jsPDF's `addImage`.
1200 px across 87 mm is about 350 pixels per inch.

**Library.** jsPDF, version 4.2.1, MIT, published 2026-03-17
(registry.npmjs.org/jspdf, read 2026-09-25). jsPDF and fflate are loaded
with a dynamic `import()` on first export, so the editor's bundle does not
grow. The PDF's title metadata is "Project name · Scene name · Storyboard".

**Fonts.** The standard Helvetica font covers a limited character set.
Which characters it drops or garbles in jsPDF is confirmed at milestone
start with a caption fixture holding accented Latin, Cyrillic and CJK
text. Default until then: characters the font cannot show are replaced
with "?", and the export's toast names the shots affected. Bundling a
Unicode font is section 15, question 6.

**File name:** `<project>-<scene>-storyboard.pdf` (8.4).

### 7.3 PNG zip

- Each panel at its take's full export size (2520 × 1080 for 21:9), PNG,
  rendered in the same `stills` job as the PDF's images when both are
  exported together.
- Zip `<project>-<scene>-storyboard-png.zip`, built with fflate, PNGs
  stored without compression (they are compressed already), the CSV
  deflated. Entries at the zip root:

  ```
  01-establishing.png
  02-kitchen-wide.png
  02-kitchen-wide-end.png
  03-close-on-hands.png
  captions.csv
  ```

- Entry names: `<cut number>-<shot slug>.png`, plus `-end` for `end`
  panels. The cut number makes names unique even when two shots share a
  name.
- `captions.csv`, UTF-8 with a byte order mark, RFC 4180 quoting, one row
  per panel: `file,number,shot,type,take,lens_mm,body,format,width,height,frame,time_sec,duration_sec,notes`.

### 7.4 Flow

Export menu → "Storyboard (PDF)", "Storyboard frames (PNG zip)" or
"Storyboard (PDF + PNG)" → a dialog with the page size (A4 or Letter,
remembered per browser) → one `stills` job in the queue → the files are
assembled on the main thread and downloaded (8.6). A read-only tab can
export storyboards; nothing is stored.

## 8. Clip and scene export

### 8.1 One take

- **Download MP4** on a `ready` clip reads the blob and downloads it as
  `<project>-<scene>-<number>-<shot>-t<take>.mp4`.
- **Render and download** on a `stale` or `none` take enqueues a stored
  clip job (download-only in a read-only tab) and downloads when it
  finishes.

### 8.2 Scene clips as a zip (default)

Export menu → **Scene clips (.zip)**:

1. A dialog counts the cut: "7 shots · 3 need rendering (2 out of date,
   1 not rendered) · Render and export". With nothing to render the
   button reads "Export".
2. Stored clip jobs are enqueued for every entry that is not `ready`.
3. When they finish, a zip `<project>-<scene>-clips.zip` is built with
   fflate (MP4s stored without compression):

   ```
   01-establishing-t1.mp4
   02-kitchen-wide-t3.mp4
   03-close-on-hands-t2.mp4
   cutlist.csv
   ```

4. A shot that could not render (track missing, a failed job) is left out
   of the zip; its `cutlist.csv` row keeps its timing with `file` empty and
   `clip_status` set to `missing`, and the toast names it.

In a browser that cannot encode (4.6) the same menu item exports per-shot
PNG sequences in folders named like the MP4s, without the extension.

### 8.3 Scene as one MP4

Export menu → **Scene animatic (.mp4)** runs `renderSceneClip`:

- One frame size: the `dominantFormat`'s export size. Each shot is drawn
  letterboxed or pillarboxed through the frame renderer (4.4).
- Frames `0 … total − 1` of the cut, keyframes at every cut's first frame
  and every 48 frames after it, timestamps `F / FPS`.
- It always renders fresh and never decodes stored clips: re-encoding a
  decoded clip costs as much as drawing the frame and adds a generation of
  compression.
- A track-missing shot contributes slate frames drawn on a 2D
  `OffscreenCanvas` of the same size.
- Download only, never stored: `<project>-<scene>-animatic.mp4`.

### 8.4 Names

Pure, in `src/domain/output-names.ts`:

```ts
export function slug(text: string, fallback: string): string;
export function cutNumber(index: number, total: number): string;   // 2 digits, 3 when total > 99
export function timecode(frame: number): string;                    // "HH:MM:SS:FF" at FPS, non-drop
export function outputBaseName(p: {
  project: string; scene?: string; number?: string; shot?: string; take?: number;
}): string;                                                          // parts slugged and joined with "-"; take as "t3"
```

`slug`: Unicode NFKD, drop combining marks, lower case, every run of
characters outside `a-z0-9` becomes one hyphen, trim hyphens, cut to 40
characters (at the last hyphen before 40 when there is one), and return
`fallback` when nothing is left. Fallbacks: "project", "scene", "shot".

| Input | `slug` |
|---|---|
| `Kitchen Wide A` | `kitchen-wide-a` |
| `Café, night (alt)` | `cafe-night-alt` |
| `  03 / CU  ` | `03-cu` |
| `夜の台所` | the fallback |

`timecode(300)` is `00:00:12:12`. `timecode(0)` is `00:00:00:00`.

### 8.5 `cutlist.csv`

UTF-8 with a byte order mark, RFC 4180 quoting, one row per cut entry:

`number,shot_id,shot,type,take,lens_mm,body,format,width,height,fps,frame_in,frame_count,duration_sec,tc_in,tc_out,file,clip_status`

`tc_in = timecode(frameIn)` and `tc_out = timecode(frameIn + frameCount)`:
the out point is exclusive, so each row's `tc_out` equals the next row's
`tc_in`. The same columns feed the animatic's cut list panel.

### 8.6 Downloads

`src/export/download.ts`: `downloadBlob(blob, fileName)` creates an object
URL, clicks a detached `<a download>`, and revokes the URL after 60 s. The
File System Access save picker is not used: it exists in Chrome only, and
Safari is a verified target.

### 8.7 Project zip

S2's project export gains one checkbox, "Include rendered clips", off by
default (OD10).

- **Off:** every take's `clip` field is removed from the exported
  `project.json` and no clip blob is written. S1's round-trip rule becomes
  "equal apart from project id, blob keys, timestamps and clip records".
- **On:** each referenced clip blob is written once to
  `assets/<blobKey>.mp4` and the records are kept. Import remaps blob keys
  as S2 does, and rewrites `clip.blobKey` in every record that pointed at
  the old key. A record whose file is absent imports with its blob missing,
  which `clipStatus` reads as `none`. The hash inside each record stays
  valid after import, because M3's hash uses track digests and never blob
  keys.

## 9. Storage size and quota

- **Estimate.** `estimateClipBytes(width, height, durationSec)` is
  `ceil(clipBitrate(width, height) × durationSec / 8)`: at most about 4 MB
  for a 4 s 21:9 clip and 60 MB for a 60 s one at the default bitrates. The
  real sizes M4.1 records (4.5) replace this upper bound in the dialog
  copy once known.
- **Check before a stored clip job.** `navigator.storage.estimate()` (the
  same call the main spec's storage status panel uses). When `quota − usage < 2 × estimate`,
  a dialog: "This clip needs up to 32 MB and this site has about 20 MB of
  browser storage left." Buttons: Download without saving, Open storage,
  Cancel. When `estimate()` is missing or throws, the check is skipped and
  the write error below is the guard.
- **Write fails** (`QuotaExceededError` from `putClip`): the job ends
  `failed` with "Storage full: the clip was not saved", keeps the MP4 in
  memory as `result` with a Download button until dismissed, writes no
  record, and leaves the document untouched.
- **Storage panel** (S2) gains a line "Clips: 23 MB in 14 clips", summed
  from `ClipRecord.bytes` over takes whose blob is present, and a "Delete
  all clips" button behind a confirm dialog, which runs `clearAllClips`.
  Clips are the easiest bytes to give back: any clip can be rendered
  again.
- **Eviction.** The app asks for persistent storage (main spec, Storage). When the browser refused,
  clips can be evicted with the rest of the site's data; on the next open
  their blobs are absent and their status reads `none`.
- **Memory.** A render holds its whole MP4 in memory until `finish`
  (`BufferTarget` with `fastStart: "in-memory"`): up to 60 MB for a 60 s
  clip at the default bitrate. Zips and the scene MP4 are also built in
  memory. When an export's estimate passes `LARGE_EXPORT_BYTES = 400 MB`,
  the dialog says "This export is large (about 620 MB) and is built in
  memory. Continue?" and proceeds on confirm.

## 10. Error handling

| Failure | Behaviour |
|---|---|
| `VideoEncoder` undefined, or no H.264 candidate supported at the export size | `UnsupportedBrowserError`. Render becomes "Export frames (PNG zip)", the animatic plays live, scene clips export as PNG sequences (4.6). One line says why. |
| The encoder reports an error mid-render | The job fails: "The video encoder stopped (reason). Try again." Retry re-queues it. The take keeps its previous clip. |
| A WebGL context cannot be created | In the worker: `WorkerCapabilityError`, retried once on the main thread (4.7). On the main thread: the job fails, "This browser could not start WebGL for rendering." |
| The render's WebGL context is lost mid-render | The job fails with Retry. The editor's viewport has its own context and S1's handling. |
| The selected take is dense and its track is missing | `TrackMissingError` before any frame. Render is disabled with the tooltip "Take 2's recorded track is missing. Import the project again or record a new take." The animatic and the scene MP4 show a slate for its length (6.5, 8.3); the storyboard shows a slate panel (7.1). |
| A prop's GLB is missing or fails to parse | The prop renders as a box at its `bounds` in `MISSING_PROP_COLOR`, the asset id goes into `missingAssets`, and the clip section notes "Rendered with 1 missing prop". The clip turns `stale` when the prop comes back (3.3, rule 4). |
| Not enough storage estimated before a stored clip job | The dialog in 9: download without saving, open storage, or cancel. |
| `QuotaExceededError` when storing a clip | The job fails "Storage full: the clip was not saved", offers Download from memory, writes no record (9). |
| The take, shot or scene is deleted during its render | The result is dropped; nothing is stored; the job notes why. |
| The shot is edited during its render | The clip is stored with the snapshot's hash and shows `stale` at once (OD7). |
| The user cancels | Nothing is stored. The take keeps its previous clip. |
| The worker does not answer the probe in 3 s | Main thread for the session (4.7). |
| The worker crashes (`error` event) | The running job fails with Retry. The next job starts a new worker; after a second crash in one session, jobs run on the main thread. |
| A clip record's blob is missing | `clipStatus` returns `none`: Download is disabled and the animatic renders the shot live. |
| A stored clip will not play (`<video>` `error`) | The animatic plays that segment live and the chip offers Re-render with "This clip could not be played". |
| Read-only tab | Stored renders are refused; "Download clip" renders without storing. Storyboard and scene exports work. "Render stale" is hidden. |
| Leaving the project, or the page, with jobs queued or running | A confirm names the number of renders; leaving cancels them (5.2). |
| The tab is hidden during a render | The render continues. If a browser slows it (checked at milestone start), the indicator reads "Paused while this tab is hidden". |
| A caption has characters the PDF font cannot show | They print as "?" and the export toast names the shots (7.2). |
| An export's size estimate passes 400 MB | A confirm before it starts (9). |
| A scene has no shots | Export items are disabled; the animatic shows its empty state. |
| No download starts (a browser blocks it) | The toast keeps a "Download again" button for 60 s, reusing the same blob. |

## 11. Testing

Domain tests are written first and run in Node, as in S1 and M3. New dev
dependencies: `mediabunny` (also a runtime dependency) for demuxing in
tests, and `@vitest/browser` with the Playwright provider for the browser
tests in 11.3. `fast-check` comes from M3.

### 11.1 Domain unit tests

- `frames.test.ts`: `shotFrameCount` for 0.5, 4 and 60 s (12, 96, 1,440);
  `frameOf(i / FPS) === i` for every `i` below 1,440; `sampleShotFrame(…, i)`
  equals `cameraAt(take, i / FPS)` and `resolveScene(scene, shot, i / FPS)`;
  `RangeError` for `−1`, `N` and `1.5`; `TrackMissingError` for a dense take
  with no cached samples; a dense take longer than the shot stops at frame
  `N − 1`; a shorter one holds its last pose; a pose key at frame 24
  switches on sample 24 and not on 23; `framePlanDigest` equals a pinned
  value for the fixture project.
- `clip-status.test.ts`: each rule of 3.3 in order; every row of M3's hash
  table in 4.4 through `hashTakeState`; `hashTakeState` of the selected take
  equals `hashShotState`; notes and `clip` records never change the hash.
- `cut-list.test.ts`: the worked fixture in 6.2; `locateFrame` at frames 95,
  96, 155, 156 and 299; clamping below 0 and past the end; `dominantFormat`
  ties.
- `output-names.test.ts`: the `slug` table in 8.4, the 40-character cut,
  `timecode` at 0, 23, 24, 300 and 86,399, `cutNumber` at 9 and 100 shots.
- `storyboard.test.ts`: the box table in 7.2 for both page sizes and all
  five formats; `pages` for 0, 1, 6 and 7 panels; `shotMoves` at its
  thresholds; panel order with `end` panels.
- `cutlist-csv.test.ts` and the captions CSV: quoting of commas, quotes and
  newlines; the byte order mark; `tc_out` of each row equals the next
  `tc_in`.
- `clipBitrate` against the table in 4.5 (with Nick's final rule, 13).

### 11.2 Property tests

200 runs each, as in M3.

1. For any scene of 1 to 40 shots with durations on the frame grid, every
   scene frame `F` satisfies `locateFrame(cut, F).entry.frameIn + localFrame === F`.
2. The sum of `frameCount` equals `sceneFrameCount`, and `frameIn` is
   strictly increasing.
3. `sampleShotFrame` called twice with the same input returns deep-equal
   samples.
4. `slug` returns either the fallback or a string matching
   `^[a-z0-9]+(-[a-z0-9]+)*$` of at most 40 characters.
5. `layoutStoryboard` places every box inside the page margins, below the
   header, with no two boxes on one page overlapping.

### 11.3 Renderer tests

**In Node, with three and no WebGL:**

- Film Planner's `buildStageScene` and `buildShotCamera` tests, ported
  first and kept green, then rewritten for `buildStageWorld`.
- `applyFrame` moves a node, hides an object the resolver dropped, and
  switches a doll's joints to a new pose without adding meshes.
- The `"guide"` look leaves one shared grey material on every mesh.
- A missing prop becomes a placeholder and lands in `missingAssets`.
- **World recipe digest.** A test builds the fixture world and hashes a
  description of it: node names and order, geometry types and parameters,
  material types, colours and parameters, lights, background, floor and the
  pinned renderer settings. The digest is pinned in the test. When it
  changes, the test fails with "Rendering changed: bump RENDERER_VERSION and
  update this digest", which is how rule 3 of 3.3 gets its bump.
- `renderClip` rejects with `UnsupportedBrowserError` when `VideoEncoder` is
  undefined (Film Planner's test, unchanged).

**In the browser**, Vitest browser mode, Chromium and WebKit through
Playwright:

- **Pixel determinism.** Render the 2 s fixture shot twice in one page with
  `collectFrameDigests`: the two lists of 48 digests are equal. Run it in
  both engines.
- **Worker against main thread.** Render the fixture both ways in one
  browser: mean absolute difference under 0.5 / 255 per channel on every
  frame. Identity is not required, since the two paths draw to different
  canvas kinds.
- **Parity with the thumbnail path.** Frame 0 through the frame renderer at
  320 × 137 with floor `"none"`, against `renderShotPixels` on the same
  shot: mean absolute difference at most 2 / 255 per channel, and 99 % of
  pixels within 8 / 255. This guards OD5.
- **Encoding**, Chromium only in CI, run with Playwright's `channel: "chrome"`
  (whether CI's Chrome encodes H.264 is confirmed at milestone start;
  WebKit's encoding is checked by hand in Safari): render the fixture,
  demux it with Mediabunny, and assert one video track, 48 packets,
  packet `i` at `i / FPS` within 1 ms, the export width and height, and a
  codec string starting `avc1.`.
- **Cancel.** Abort at frame 10: the promise rejects with `AbortError`,
  no blob comes back, and the render's context is released.

### 11.4 Storage tests

Against `fake-indexeddb`: `putClip` keys start with `clip:`; `listClipKeys`
returns keys without reading bytes; `deleteClipIfUnreferenced` keeps a
blob a duplicated take still references; `collectOrphanClips` deletes only
unreferenced clip blobs; project zip with clips off strips records and
writes no MP4, with clips on round trips bytes and remaps `clip.blobKey`; a
simulated `QuotaExceededError` writes no record.

### 11.5 State tests

The queue's dedupe rules in 5.2; one running job at a time; cancelling a
queued and a running job; an edit during a render yields a `stale` record;
a take deleted during a render stores nothing; `store: true` refused in a
read-only tab; `setTakeClip` schedules a save and adds nothing to the undo
stack; `clearAllClips`; the animatic clock's `tick`, loop, end pause,
`seekFrame` clamping and `syncFromVideo`.

### 11.6 End-to-end smoke additions

Playwright, after M3's flow. Steps that encode run in Chromium with
`channel: "chrome"`; the rest run in Chromium and WebKit.

1. On Shot 01 click Render clip: the chip reads "Clip". Move a camera key:
   it reads "Clip out of date". Re-render, reload: it still reads "Clip".
2. Open Play animatic, press Space: the time code passes the end of shot 1,
   and a shot with no clip shows the "Live" badge.
3. Export the storyboard PDF: the download's name ends
   `-storyboard.pdf` and its bytes start with `%PDF`. Export the PNG zip:
   it holds one PNG per panel and `captions.csv`.
4. Export scene clips: the zip holds one MP4 per shot and `cutlist.csv`.

By hand in Chrome and Safari on each slice's preview: clips play in both
browsers and in QuickTime Player, animatic cuts show no frame of the wrong
shot, fullscreen, the PDF in the browser's viewer and in Preview, printing
on A4 and Letter.

## 12. Porting map

Film Planner paths are relative to
`/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner`
(checked at commit `58987e2`). Scene Builder v2 paths are relative to
`/Users/nickv/ClaudeCode Projects/Scene Builder V2 (3d editor)`. S1 paths
are on `origin/feat/s0-s1-walking-skeleton`. Every path was checked on
2026-09-25.

| Into | From | Source | How |
|---|---|---|---|
| `src/render/build-scene.ts` | Film Planner | `src/stage/render/build-scene.ts`; the `buildStageScene` and `buildShotCamera` tests in `src/stage/render/render-clip.test.ts` | Copy with tests, confirm green, then make the changes in 4.3. |
| `src/render/constants.ts` | Film Planner | `src/stage/render/clip-constants.ts` | Keep `STAGE_BACKGROUND`. `CLIP_WIDTH` and `CLIP_HEIGHT` give way to `takeOptics`; `CLIP_FPS = 30` gives way to M3's `FPS = 24`. |
| `src/render/encode-mp4.ts`, `src/render/render-clip.ts` | Film Planner | `src/stage/render/render-clip.ts`, `render-clip.test.ts` | Copy the encoder loop, `awaitEncoderDrain`, `H264_CODEC_CANDIDATES`, the error order, the dispose and `forceContextLoss`, `UnsupportedBrowserError` and its test. Replace `mp4-muxer` with Mediabunny and `frameT` with `sampleShotFrame`; the `frameT` tests give way to `frames.test.ts`. |
| Clip section in the takes panel | Film Planner | `src/components/stage/block-panel.tsx` | Rebuild with shadcn: progress, frame counter, Cancel, the stale banner, the 300 ms hash debounce, the unsupported message. |
| `src/app/routes/AnimaticPage.tsx` | Scene Builder v2 | `app/scenes/[sceneId]/animatic/page.tsx` | Rebuild. Keep the playlist idea, the segmented bar sized by duration and the "now playing" line. Change: never skip a shot, play live when there is no fresh clip, add the clock, scrubbing, cut list and keyboard. |
| Primitive meshes in the builder | S1 | `src/viewport/PrimitiveMesh.tsx` | Copy the size rules and the `wall` shape into pure three.js. |
| Doll meshes in the builder | Film Planner, S1 | `buildDoll` in Film Planner's `build-scene.ts`; S1 `src/viewport/DollMesh.tsx` | Keep Film Planner's `buildDoll`. Its `HIP_SPREAD_X = 0.09` and `NECK_GAP = 0.05` match S1's `DollMesh.tsx`. |
| Lights and environment in the builder | S1 | `src/viewport/StageCanvas.tsx` (`Lighting`) | Rebuild in pure three.js with `PMREMGenerator.fromScene`. |
| Floor grid | S1 | `src/viewport/Ground.tsx` | Same colours on a `GridHelper`. |
| Readback row flip | S1 | `src/viewport/thumbnails.ts` (`pixelsToPngBlob`) | Reuse the flip in `readPixels`. |
| Clip blobs | S1 | `src/storage/blob-store.ts`, `src/storage/db.ts` | Reuse `putBlob` and `getBlob` with kind `"clip"`. |
| `stableStringify`, SHA-256 hex | S1 | `src/domain/hash.ts` (itself ported from Film Planner's `src/stage/hash.ts`) | Reuse for `framePlanDigest`. |
| Not ported | Scene Builder v2 | `lib/capture.ts` | Real-time `MediaRecorder` capture (OD3). |
| Not ported | Scene Builder v2 | `lib/clips.ts` | Its own IndexedDB database keyed by shot id; replaced by S1's blob store and `Take.clip`. |
| Not ported | Scene Builder v2 | `lib/hash.ts` | A djb2 hash; M3's SHA-256 `hashShotState` replaces it. |
| Not ported here | Scene Builder v2 | `components/PackageTab.tsx`, `components/GenerateTab.tsx`, `lib/prompt.ts` | Belong to M9. |
| Not a source | This repo | `spikes/vr-camera-feel/src/stage/render/build-scene.ts` | An unmodified copy of Film Planner's file; the port takes Film Planner's original. |

Rule for every port, from the main spec: copy from the real source with its
tests, confirm the tests pass unchanged, then adapt.

## 13. Build slices

The roadmap sizes M4 as M. Written out, it is four slices (M, S, M, M),
which is closer to L. Section 15, question 10 offers the cut back to M.
Each slice has its own implementation plan and PR and ends with a Vercel
preview link verified in Chrome and Safari. The gate is M3 closed: M4
samples `cameraAt`, `resolveScene` with tracks and M3's hash.

**Confirm at milestone start**, before M4.1's plan is written, each with
its result recorded in the changelog: which H.264 candidate each export
size gets in Chrome and Safari (4.5); the Mediabunny method names (4.5);
whether Mediabunny writes creation times (4.9); GLB texture decoding in a
worker in both browsers (4.3); rendering speed in a hidden tab (4.7);
whether CI's Chrome encodes H.264 (11.3); jsPDF's Helvetica coverage (7.2);
the R3F renderer defaults to pin (4.3); S2's loader, normalisation and kit
builders (4.3).

### M4.1 Renderer and single-take clips (M)

The frame plan, `clip-status.ts`, the builder port, the frame renderer, the
encoder with Mediabunny, `renderClip`, `renderFrameSequence`, the probe and
the PNG fallback, `clip-store.ts` with orphan collection, `ClipRecord` and
`setTakeClip`, a minimal `outputsStore` (one job at a time, cancel), the
clip chips and clip section in the takes panel, the strip dot, and the
parity test. Main thread only.

- **Done when:**
  1. Render clip on a shot produces an MP4 at the take's export size with
     `N` frames (demux test) that plays in Chrome, Safari and QuickTime
     Player, and the chip reads "Clip".
  2. Moving a key, changing the lens or selecting another take turns the
     chip "Clip out of date", following M3's table in 4.4; renaming the shot
     does not. Undoing an edit made before the render leaves the clip
     record in place.
  3. Two renders of the fixture in one browser give equal frame digest
     lists, in Chromium and WebKit (browser test).
  4. Frame 0 matches the thumbnail path within the parity tolerance
     (browser test).
  5. With `VideoEncoder` removed in a test, the button reads "Export frames
     (PNG zip)" and the zip holds `N` PNGs named per 4.6.
  6. A take duplicated from a `ready` take is `ready` and shares its blob;
     reopening the project deletes orphan clip blobs and keeps referenced
     ones.
  7. A 10 s 21:9 fixture with 50 objects renders in under 30 s in Chrome
     and Safari on the development Mac. This is a target: the measured
     times go in the changelog either way.
- **States covered:** no clip, ready, out of date, rendering, failed,
  browser that cannot encode, dense take with a missing track (render
  refused), prop missing (placeholder, note), read-only tab (download
  only).

### M4.2 Queue, worker and storage (S)

The full queue in 5.1 and 5.2, the queue indicator and popover, the worker
with its probe and main-thread fallback, the quota check and storage-full
path, the storage panel line and "Delete all clips", the `beforeunload`
and leave confirms, "Render stale clips" on the scene page, and the project
zip checkbox.

- **Done when:**
  1. Five queued renders run one at a time, each cancellable, with progress
     visible on the scene page, the shot page and the board.
  2. In Chrome, and in Safari when its probe passes, jobs run in the
     worker, and typing in the inspector during a 30 s render stays
     responsive (by hand). With the probe forced to fail, the same render
     runs on the main thread and passes the worker-against-main tolerance.
  3. With `estimate()` stubbed low, the dialog offers download without
     saving; a simulated `QuotaExceededError` ends with a Download button
     and no record.
  4. "Delete all clips" frees the bytes the panel showed, and every chip
     reads nothing.
  5. Project zip with "Include rendered clips" off and on round trips as
     8.7 says.
- **States covered:** idle, queued, running in the worker, running on the
  main thread, cancelled, storage full, leaving with renders running.

### M4.3 Animatic (M)

The route, the cut list, the animatic clock, the live renderer, the A/B
clip players, scrubbing, the keyboard map, the cut list panel and "Render
N stale".

- **Done when:**
  1. A scene holding a `ready`, a `stale` and a `none` shot plays end to
     end with no shot skipped. The badges read Clip, Live, Live, and the
     time code stops at the scene total.
  2. Stepping with ← and → on a live segment shows exactly the frames
     `renderStills` gives for the same indices (browser test on digests).
  3. At every cut, no frame of the wrong shot is visible, and the cut lands
     within two display frames of its time code (by hand, Chrome and
     Safari).
  4. "Render 3 stale" during playback switches each segment to its clip at
     a segment boundary.
  5. Every key in 6.6 works, including Space with a button focused.
  6. A track-missing shot holds its slate for its full length.
- **States covered:** the list in 6.7.

### M4.4 Storyboard and scene exports (M)

`Shot.notes` with `setShotNotes` and a Notes field in the shot page's right
panel, `storyboardPanels`, the PDF, the PNG zip, the scene clips zip,
`cutlist.csv`, the scene MP4, and `output-names.ts`.

- **Done when:**
  1. A seven-shot scene with two moving shots exports a PDF with nine
     panels on two pages, captions as in 7.2, that opens in Chrome's
     viewer and Preview and prints on A4 and Letter without clipping.
  2. The PNG zip holds nine PNGs at export size and `captions.csv`, named
     as in 7.3.
  3. The scene clips zip holds seven MP4s and `cutlist.csv`, and every
     row's `tc_out` equals the next row's `tc_in`.
  4. The scene MP4 plays, its length equals the scene time code, and a
     4:3 shot in a 21:9 scene is pillarboxed.
  5. A caption with characters the font lacks prints "?" and the toast
     names the shot.
- **States covered:** one shot, sixty shots (eleven PDF pages or more),
  mixed formats, a track-missing shot, empty notes, notes over three lines.

### Reserved for Nick

Sessions run in learning mode, as in the main spec. Three small decisions
are left for Nick to write during implementation, five to ten lines each:

- **`clipBitrate(width, height)`** (4.5). Scale 8 Mbps by pixel count as
  drafted, pick one fixed rate for every format, or scale by duration too.
  Higher rates cost storage (9); lower ones show blocking on moving
  greybox edges. The table in 4.5 follows his rule.
- **`storyboardPanels(scene)`** (7.1). First frame only, first and end for
  moving shots as drafted, or one panel per camera key. More panels tell
  a move better and make longer PDFs.
- **`segmentSource(entry, status)`** in the animatic (6.5). A `stale` shot
  plays live as drafted (always current, heavier on the GPU), or plays its
  old clip with an "out of date" badge (smooth, but it shows a picture the
  shot no longer has).

## 14. Out of scope

- Audio of any kind: scratch tracks, temp music, sync.
- Burned-in overlays on clips: time code, shot name, frame lines.
- EDL, XML or OTIO export. `cutlist.csv` carries the same timing.
- Share links (R6), and any server render or upload (D6).
- Transitions between shots; every cut is a hard cut.
- Codecs other than H.264 in MP4: HEVC, ProRes, VP9, AV1, WebM, alpha.
- Frame rates other than `FPS`, custom resolutions, and sizes above the
  format's export size.
- Running more than one render at a time.
- Moving the viewport onto the builder's meshes (alternatives in 2).
- Picking storyboard frames by hand, drawing or annotating on panels.
- Playing AI-generated outputs in the animatic. Scene Builder v2 preferred
  a generated output over the blocking clip; that choice belongs to M9.
- Rendering inside the headset. The VR viewfinder is its own render pass
  (M5), and VR takes are rendered on the desktop by this renderer (VR spec
  decision 5).
- Storing the scene MP4 or storyboard files in IndexedDB. They are
  downloads.

## 15. Open questions

Each has a default, already written into the sections above. Nick's answer
overrides it.

1. **Clip on the take or on the shot?** Default: the take (OD1). Switching
   takes keeps both renders. On the shot there is one clip, and switching
   takes discards it.
2. **The last frame and the end key.** Frames run `0 … N − 1` at `i / FPS`
   (OD2), so an end key at `durationSec` is one frame past the cut. Default:
   no change in M4 or M3; the difference is one frame. The alternative is
   that M3's move presets put their end key at frame `N − 1`, so the last
   frame shows the end framing exactly.
3. **Scene export default.** Default: a zip of per-shot MP4s plus
   `cutlist.csv` (OD9), with one continuous MP4 as the second item.
4. **Floor grid in outputs.** Default: on (OD13), while thumbnails keep it
   off. Off makes storyboard frames match thumbnails exactly.
5. **Storyboard page size.** Default: A4 turned sideways, with Letter in the
   dialog.
6. **Unicode captions in the PDF.** Default: Helvetica, with "?" for
   characters it lacks and a warning. The alternative bundles a Unicode
   font (such as Noto Sans) as a lazily loaded asset, adding its file size
   to the first export.
7. **Clips in the project zip.** Decided 2026-09-25 by Nick: left out, with a checkbox to
   include them (OD10).
8. **Animatic: a stale shot plays live or plays its old clip?** Default:
   live. Reserved for Nick (13).
9. **Storyboard panels per shot.** Default: first frame, plus the last
   frame when the shot moves. Reserved for Nick (13).
10. **Milestone size.** Decided 2026-09-25 by Nick: all four slices, size L. The
    roadmap's M4 row now says L. To hold M, move the worker (part of M4.2) and the scene
    MP4 (8.3) to a later milestone; clips then render on the main thread
    only.
11. **Shot notes.** Default: a new optional `Shot.notes` (OD12). The
    alternative prints `Scene.notes` once in the PDF header and gives
    panels no notes.
12. **Clip bitrate.** Default: 8 Mbps at 2520 × 1080, scaled by pixel count.
    Reserved for Nick (13).
13. **What M9 takes from M4.** Default: M9's guide clip is a
    `renderClip(…, { look: "guide" })` download, and its first and last
    stills come from `renderStills` at frames 0 and `N − 1`. The frame
    renderer works without the editor's canvas, which `renderShotPixels`
    needs. The alternative is that M9 packages the take's stored
    `"standard"` clip unchanged, which saves a render but makes the guide
    clip look like the editor rather than grey. Decided in the 2026-09-25 cross-spec review: M9 uses
    this default, and its decisions P3 and P4 say so.

## Changelog

- 2026-09-25: initial spec. Ports Film Planner's deterministic clip
  renderer onto M3's take model with Mediabunny in place of `mp4-muxer`,
  adds clip records and derived status per take, the render queue and
  worker, the animatic route (R5) and storyboard export as PDF plus PNG zip
  (R6), and records browser support from MDN's compatibility data read on
  2026-09-25.
