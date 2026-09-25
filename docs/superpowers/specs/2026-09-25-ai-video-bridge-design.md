# AI video bridge: design spec (M9)

> **Status:** exploration · **Stage:** draft for review, written 2026-09-25
> **Milestone:** M9 in the [roadmap](../../roadmap.md), size M, gated on M8 (VR Director's calls)
> **Builds approved by this document:** none until Nick approves it. Anything published from this work starts unlisted and is labeled `exploration`.
> **Related:** [main spec](2026-09-18-scene-builder-3d-design.md) (architecture, storage, error handling) · [camera and motion spec](2026-09-25-camera-and-motion-design.md) (M3: `Take`, `cameraAt`, `takeOptics`, `ShotTracks`, `FPS`) · [VR operator spec](2026-09-18-vr-operator-design.md) (track background) · [outputs spec](2026-09-25-outputs-design.md) (M4: clip renderer, stills, clip status) · predecessors [Scene Builder v2](https://github.com/weeeha/Scene-Builder-v2) (`PackageTab.tsx`, `GenerateTab.tsx`, `lib/prompt.ts`, `lib/capture.ts`, `lib/clips.ts`) and [Film Planner](https://github.com/weeeha/Film-Planner-)

## TL;DR

M9 packages a shot, or every shot in a scene, into a zip a person uploads by
hand to a video generation provider. The zip holds a manifest, a fresh grey
guide clip rendered by M4's `renderClip(..., { look: "guide" })`, first and
last frame stills from M4's `renderStills`, a camera path sampled from
`cameraAt`, a blocking summary, a prompt, and any reference images. The
manifest format is provider-neutral; a Seedance profile sits beside it as the
first named target, advisory only, since nothing in this milestone calls an
API. Generated video comes back by hand too: importing an MP4 attaches it to a
take as a `Generation` record, a new blob kind, so it can play next to the
guide clip for comparison. Scene Builder v2's `PackageTab` and `lib/prompt.ts`
port with changes; its `GenerateTab` and its Next.js API routes do not port at
all, because R7 rules out a server and direct provider calls.

## 1. Problem

The suite blocks and frames a shot but never renders final video; that stays
a provider's job, by design (roadmap end state 2, R7). Scene Builder v2
proved the shape of a useful package (guide clip, prompt, reference stills)
but built it around a Next.js server, an `ARK_API_KEY` and a BytePlus
polling loop (`GenerateTab.tsx`, `app/api/generate/*`), none of which exist
in a browser-only, no-server app (main spec D6). Without M9, the AI-bridge
end state has no artifact: nothing a person can drag onto Seedance's upload
form. Nothing generated has anywhere to live once it comes back, either;
today's `Take` and blob store have no place for a video that is a result
rather than an input.

## 2. Decisions

Decisions fixed before this spec and cited here. They are not reopened.

| # | Decision | Source | Made |
|---|---|---|---|
| R7 | The AI bridge is package-first: export a zip with a grey guide clip, first frame, camera path and prompt, for manual upload. No server, consistent with D6 in the main spec. | [roadmap](../../roadmap.md) | 2026-09-25 |
| R8 | The AI package format is provider-neutral. Seedance is the first named target, since both predecessor repos had Seedance packaging. | roadmap | 2026-09-25 |
| D6 | Browser-only app, static deploy, no server. | [main spec](2026-09-18-scene-builder-3d-design.md) | 2026-09-18 |

Decisions this spec makes. Each is a default Nick can overturn in review; the
ones with a real trade-off are repeated in section 14.

| # | Decision | Why |
|---|---|---|
| P1 | The package is a zip per shot, plus an optional zip per scene that bundles every shot's package under one manifest. Both use the same `PackageManifest` shape (`kind: "shot" \| "scene"`). | One shot is the common case (upload one shot, get one generation back). A scene package saves re-zipping by hand when a batch of shots goes out together; it is not a new format. |
| P2 | The manifest is schema-versioned from 1, independent of the project's `schemaVersion`. | A package is a point-in-time export a provider or a person keeps; it must stay readable even after the project's own schema moves on. |
| P3 | The guide clip in the package is a fresh render: M4's `renderClip(..., { look: "guide" })`, called at export time, at the take's export size. M9 does not store a clip of its own, re-encode, transcode or remux it, and does not reuse the take's stored `"standard"` clip. | Decided in the 2026-09-25 cross-spec review (outputs spec, open question 13): M4's frame renderer works without the editor's canvas, and a grey guide render reads as guidance rather than as the editor's own look. M9 still has no rendering pipeline of its own (ownership map); it calls M4's function, it does not write one. |
| P4 | First and last frame stills are PNGs from M4's `renderStills`, one request per still, at frames `0` and `N − 1` where `N = shotFrameCount(shot)`, at the take's export size from `takeOptics`. `renderShotPixels` is not used by M9. | Decided alongside P3 in the same review: `renderStills` is the same M4 entry point the guide clip goes through, at the same frame indices M4's own frame plan uses, so the stills and the guide clip agree on exactly which frames they show. |
| P5 | The camera path in the package is JSON, one row per exported frame, sampled with `cameraAt` at `FPS` (24) from `t = 0` to `durationSec`, not the take's raw keys or dense samples. | A provider-side consumer (today: a person reading it, later maybe a script) wants "where the camera is at frame N", the exact question `cameraAt` answers, not the authoring representation. A dense take's raw samples may run at 72 to 90 Hz and off the shot's own clock; sampling through `cameraAt` gives every take, sparse or dense, the same row shape. |
| P6 | The blocking summary is object position tracks and doll pose spans, sampled the same way as the camera path, one row per exported frame per animated object and doll. Objects and dolls with no track for this shot are omitted. | A provider generating video from a guide clip may still want the raw numbers behind the blocking, and this reuses the same per-frame sampling idea as the camera path instead of inventing a second summary shape. |
| P7 | The prompt writer is rewritten, not ported verbatim. It keeps `lib/prompt.ts`'s shape (a locked "follow the guide clip" sentence, a cast line from the dolls' poses, a reference-image line per ordered still, a shot-type and lens line, an ambient-sound line) and drops the model-specific "Video 1" / "Image N" numbering in favour of the same numbering restated from the manifest's own `guideClip` and `referenceImages` order, so the prompt text and the zip's file order always agree. | The predecessor's numbering assumed its own upload order; this package's order is the manifest's, and the prompt has to name that order, not a separate one a person could get out of sync by hand. |
| P8 | Reference images are optional stills of props or characters, added on the shot page's package panel, stored per project (not per shot) so the same reference can back multiple shots, and referenced into a package by an ordered list of ids. | Scene Builder v2 kept references per shot (`lib/clips.ts` `refs` keyed by `shot.id`); a set's hero prop is usually referenced from more than one shot, and re-uploading the same image five times has no benefit. |
| P9 | A generated video comes back as a `Generation`: a new record type holding a blob key (`BlobKind` gains `"generation"`), attached to the take it was generated from, imported by picking a local `.mp4` file. Nothing is fetched from a URL and no API key is stored. | Matches the roadmap's stated default exactly. A blob key, not raw bytes in the document, keeps generations out of the 500 ms autosave, the same reasoning C5 in the camera spec gives for dense tracks. |
| P10 | `Generation` records live in a new top-level `Project.generations: Generation[]`, not on `Take`, because `Take` is M3's contract and this spec extends the document without touching it. | The ownership map says M3 owns the `Take` type; adding a field to it here would be redefining another milestone's contract, which the task instructions rule out. |
| P11 | Comparing a generation against its guide clip is a two-up video player (generation left, guide clip right, matching Scene Builder v2's `GenerateTab` two-column layout) on the shot page, not a new route. | The comparison is a shot-page concern, like the takes panel it sits beside; a full route would duplicate the shot page's camera and take context for no benefit. |
| P12 | The Seedance profile records provider facts as labels only: a model name string and free-text notes. It computes nothing and validates nothing against a provider limit unless that limit has a source URL and an access date (see section 4). | Without network access in this session, any numeric Seedance limit (max duration, max resolution, file size cap) would be invented. Section 4 marks every such figure "confirm at M9 start" instead. |

### Alternatives considered

- **Call Seedance's API directly from the browser**, as Scene Builder v2's
  `GenerateTab` did through a Next.js proxy. Ruled out by R7 and D6: no
  server, and a browser-held API key is a secret in client code. The
  predecessor's server route (`app/api/generate/*`) and its key are exactly
  what this milestone does not port.
- **A single package format with no provider profile**, leaving Seedance out
  entirely until R8 forces the question. Rejected: R8 names Seedance as the
  first target now, and a profile that is just labels (P12) costs nothing to
  include and saves a second pass later.
- **Store `Generation` bytes on `Take` directly**, as a new optional field.
  Rejected by P10: it would edit M3's contract from a different milestone's
  spec, which the ownership map forbids.
- **Auto-poll a provider's status endpoint**, the way `GenerateTab` polled
  `/api/generate/:taskId` every 5 s. There is no endpoint to poll without a
  server; import is a file the person drags in once the provider's own UI
  says it is done.
- **Transcode the guide clip to a fixed container in M9.** Rejected by P3:
  it duplicates whatever M4 already decided, and adds a codec dependency to
  a milestone whose job is packaging, not rendering.

## 3. Package contents and manifest

All new types in `src/domain/package.ts`, pure, no React, no three.js,
following the rest of `src/domain`. Types from M3 (`Take`, `CameraPose`,
`CameraBodyId`, `FrameFormatId`, `ShotTracks`, `PoseName`) are imported, never
redefined.

### 3.1 Types

```ts
// src/domain/package.ts

export const PACKAGE_SCHEMA_VERSION = 1;

export type PackageKind = "shot" | "scene";

export type CameraPathSample = {
  frame: number;        // 0-based, one per exported frame
  t: number;             // seconds, frame / FPS
  position: Vec3;
  rotation: Quat;
  vFovDeg: number;       // from takeOptics(take); constant across a take, repeated for a self-contained row
};

export type BlockingObjectSample = { frame: number; t: number; position: Vec3; rotationY: number };
export type BlockingPoseSample = { frame: number; t: number; pose: PoseName };

export type BlockingSummary = {
  objects: Record<string, BlockingObjectSample[]>;  // by set object id, only ids with a track in this shot
  poses: Record<string, BlockingPoseSample[]>;       // by doll id, only ids with a track in this shot
};

export type ReferenceImage = {
  id: string;
  caption: string;
  blobKey: string;       // src/storage, BlobKind "ref"
};

export type ShotPackageEntry = {
  shotId: string;
  shotName: string;
  shotType: ShotType;              // WIDE | MED | CU | POV, from the main spec
  takeId: string;
  takeNumber: number;
  durationSec: number;
  fps: number;                     // FPS from src/domain/time.ts, 24 in M3
  bodyId: CameraBodyId;
  formatId: FrameFormatId;
  lensMm: number;
  exportW: number;
  exportH: number;
  guideClip: { file: string; mimeType: string; hash: string } | null;   // null when the fresh guide render fails (3.4)
  firstFramePng: { file: string };
  lastFramePng: { file: string };
  cameraPath: { file: string };    // camera-path.json, CameraPathSample[]
  blocking: { file: string } | null;  // blocking.json, BlockingSummary; null when the shot animates nothing
  referenceImageIds: string[];     // ordered; indexes into the manifest's referenceImages, becomes "Image N" in the prompt
  prompt: string;
};

export type SeedanceProfile = {
  providerId: "seedance";
  modelHint: string;               // a label shown in the UI and written to the manifest, never sent anywhere
  notes: string[];                 // free-text facts, each with a source in section 4 or marked "confirm at M9 start"
};

export type PackageManifest = {
  schemaVersion: 1;
  kind: PackageKind;
  generatedAt: string;             // ISO 8601
  projectId: string;
  projectName: string;
  sceneId: string;
  sceneName: string;
  shots: ShotPackageEntry[];       // one entry for "shot", one per included shot for "scene"
  referenceImages: ReferenceImage[];  // the project's reference library, filtered to ids any shot entry uses
  provider: "neutral";
  seedanceProfile: SeedanceProfile;
};
```

### 3.2 Zip layout

```
manifest.json
shots/<shotId>/guide.<ext>          # fresh renderClip(..., { look: "guide" }) output; <ext> from guideClip.mimeType
shots/<shotId>/first.png
shots/<shotId>/last.png
shots/<shotId>/camera-path.json
shots/<shotId>/blocking.json        # absent when blocking is null
refs/<refId>.<ext>                  # <ext> from the reference's stored image type
```

A shot package (`kind: "shot"`) has exactly one entry under `shots/`. A scene
package (`kind: "scene"`) has one folder per included shot, in scene order,
and one shared `refs/` folder so a reference used by three shots is not
tripled in the zip. Filenames avoid the project's own ids where a shorter
name reads better in a provider's upload UI; `shots/<shotId>/` keeps the
folder unambiguous when several shots share a name.

### 3.3 Building a package

```ts
// src/domain/package.ts, continued
export function sampleCameraPath(take: Take, durationSec: number): CameraPathSample[];
export function sampleBlockingSummary(tracks: ShotTracks, durationSec: number): BlockingSummary;
export function buildShotPackageEntry(args: {
  scene: Scene; shot: Shot; take: Take;
  guideClip: { bytes: ArrayBuffer; mimeType: string; hash: string } | null;
  firstFramePng: ArrayBuffer; lastFramePng: ArrayBuffer;
  referenceImageIds: string[]; prompt: string;
}): { entry: ShotPackageEntry; files: Record<string, ArrayBuffer | string> };
export function buildPackageManifest(args: {
  project: Project; scene: Scene; kind: PackageKind;
  entries: { shot: Shot; entry: ShotPackageEntry }[];
  referenceImages: ReferenceImage[];
}): PackageManifest;
```

- `sampleCameraPath` calls `cameraAt(take, frame / FPS)` for `frame` from `0`
  to `Math.round(durationSec * FPS)` inclusive, and `takeOptics(take).vFovDeg`
  once, repeated on every row (self-contained rows, at the cost of a little
  redundancy, so a consumer never has to open a second file to know the FOV).
  A take whose `track.kind` is `"dense"` and whose blob is missing (M3
  3.3, `missingTracks`) samples `cameraAt`'s fallback (`track.first`) for
  every frame; the manifest's own `guideClip: null` rule (below) is the
  signal that the take was incomplete, not a special case in this function.
- `sampleBlockingSummary` mirrors `resolveScene`'s per-frame sampling
  (`sampleObjectKeys`, `dollPoseAt`, M3 4.3) over the same frame range, one
  call per animated object or doll, skipping ids with no track (M3 3.6
  invariant 5 guarantees every id used here names a real object or doll).
- The actual zip write, in `src/export/package-export.ts`, follows S2's zip
  helper (`fflate`) and gathers bytes from three places: the blob store (the
  reference images), M4's renderer (a fresh `renderClip(..., { look: "guide" })`
  for the guide clip and `renderStills` for the two stills), and the two pure
  JSON builders above.

### 3.4 The guide clip is always a fresh render

M9 does not read `clipStatus` and does not gate packaging on it. Every
export calls M4's `renderClip(..., { look: "guide" })` for that take at
that moment, so a guide clip is fresh by construction; whether the take's
own stored `"standard"` clip is `none`, `ready` or `stale` makes no
difference to what M9 packages.

`guideClip` is `null` only when that render call itself fails: `renderClip`
throws `TrackMissingError` (a dense take whose track blob is missing) or
`UnsupportedBrowserError` (this browser cannot encode H.264 at the take's
export size, M4 section 4.6). Either way the failure is reported per the
error table (10); the rest of the shot's package (stills, camera path,
blocking, prompt) still builds, so one shot's guide-clip failure does not
block the others.

A scene package with some shots' guide renders failing and others not still
builds; the failing ones are skipped from `shots/<id>/guide.<ext>`, and the
manifest lists them with `guideClip: null` so the zip's shot count and the
manifest's shot count always agree, and a person opening the manifest sees
which shots need attention before re-exporting.

## 4. Provider-neutral format and the Seedance profile

The manifest (3.1) is the whole contract: nothing in `PackageManifest` or
`ShotPackageEntry` names Seedance. `seedanceProfile` is additive, a label
block a person reading the manifest (or a future script) can use to decide
whether the package is likely to work with that provider, never something
`buildPackageManifest` branches on.

**Confirmed facts.** None yet. This session has no verified, dated source for
any Seedance input limit (maximum clip duration, maximum resolution, maximum
reference image count, accepted video container, accepted image formats,
file size caps). Every field below that would normally carry such a number
instead reads `confirm at M9 start`, and the build slice in section 12 makes
confirming them (with a source URL and an access date) the first task, before
`seedanceProfile.notes` is written.

```ts
export const SEEDANCE_PROFILE_DEFAULT: SeedanceProfile = {
  providerId: "seedance",
  modelHint: "seedance",           // no version number until confirmed (section 14, question 2)
  notes: [
    "Maximum guide clip duration: 15 s (default, sourced from Film Planner's SCENE_DURATION_CAP_SEC, a prior-project value; confirm at M9 start).",
    "Maximum export resolution: confirm at M9 start.",
    "Accepted guide clip container and codec: confirm at M9 start.",
    "Maximum reference image count: confirm at M9 start.",
    "Accepted reference image formats: confirm at M9 start.",
  ],
};
```

- **Where the profile is used.** The package panel (6) shows these notes
  under a "Seedance" heading, read-only, so a person packaging a shot sees
  the open questions before uploading, without the suite pretending to
  enforce a limit it has not verified.
- **A second provider.** Adding one is adding a second `notes`-only profile
  and a second `providerId` literal; nothing about `PackageManifest` changes.
  The manifest's `provider` field stays the literal `"neutral"` regardless of
  how many profiles exist, because the package itself never targets one
  provider; only the advisory block beside it does.
- **What ports from Scene Builder v2.** `GenerateTab.tsx`'s model picker
  (`dreamina-seedance-2-0-fast-260128`, `dreamina-seedance-2-0-260128`) is
  the only place either predecessor names concrete Seedance model strings.
  Those strings are unverified marketing names from a UI `<select>`, not a
  documented API contract, so `modelHint` starts as the plain label
  `"seedance"` rather than copying an unconfirmed model id (section 14,
  question 2).

## 5. The prompt writer

`src/domain/prompt.ts`, pure, rewritten from `lib/prompt.ts` (P7).

```ts
export function buildPackagePrompt(args: {
  scene: Scene;
  shot: Shot;
  take: Take;
  referenceImages: { caption: string }[];   // in manifest order; index + 1 is "Image N"
}): string;
```

Default template, one sentence per line, joined with single spaces as
`lib/prompt.ts` does:

1. **Locked guide-clip line.** `"Follow the camera movement and blocking from the guide clip exactly, same framing, same motion, same timing."` Fixed text; not a template field. The predecessor's version named "Video 1"; this one names "the guide clip" because the package always has exactly one guide clip per shot entry, so a number would repeat information the file layout (3.2) already gives.
2. **Cast line.** Every `doll`-kind object resolved into the scene at `t = 0`, in scene order: `"<name> (<pose>)"` when a pose exists, else `"<name>"`, joined with commas. No dolls: `"the subjects"`.
3. **Reference lines**, one per `referenceImages` entry in order: `"Keep the <caption> from Image <n> consistent."`, `<n>` starting at 1. No references: the line is omitted entirely (the predecessor's `.filter(Boolean)` behaviour, kept).
4. **Shot-type and lens line.** `"<Shot type label>, <lensMm>mm lens, cinematic natural light, photorealistic."` Shot type label: `"Close-up"` (CU), `"Wide shot"` (WIDE), `"POV shot"` (POV), `"Medium shot"` (MED, and the default for any future `ShotType`). `lensMm` is the take's own lens, not a separate field, so a re-lensed take gets an updated prompt on rebuild.
5. **Ambient line.** Fixed: `"Ambient environmental sound only, no music."`

- **Editable per shot, like the predecessor.** The package panel shows the
  built prompt in a textarea. Editing it stores the edited text on the
  package's working state (6), not on the document, until "Rebuild from
  scene" is pressed, which discards the edit and calls `buildPackagePrompt`
  again. This matches `PackageTab.tsx`'s `shot.prompt ?? buildPrompt(...)`
  behaviour, with one change: the predecessor persisted the override to the
  document (`shot.prompt`); M9 does not add a field to `Shot`, another
  milestone's contract, so the override lives in `editorStore` only and is
  lost on reload, same as any other unsaved text field in this app family.
  Section 14, question 3 asks whether Nick wants that override durable.
- **Length.** No cap is enforced; the panel shows a character count, as the
  predecessor did, and the Seedance profile note about prompt length reads
  "confirm at M9 start" alongside the other unconfirmed limits.

## 6. Where the export UI lives

**Shot page.** A "Package" section is added to the right panel, under the
Camera / Takes section from M3 (camera-and-motion spec 7.5), so packaging a
shot always happens beside the take it packages.

- No persisted guide clip preview: the guide render happens fresh at export
  time (3.4), so there is nothing in M4's clip store for this panel to show
  ahead of an export. The panel shows the take's own `"standard"` clip
  status badge, reused from M4, only as a general take-readiness cue, not as
  a gate on packaging.
- Reference images: a project-wide picker (checkbox list with captions) plus
  "+ add reference image" (uploads a new one into the project's reference
  library, `BlobKind` `"ref"`), reordered by drag, matching `PackageTab`'s
  up/down buttons conceptually but with real reordering instead.
  "confirm at M9 start" replaces nothing here: drag order is decided now
  (P8's ordering need), no external fact required.
  Non-drag fallback: ↑ / ↓ buttons per row, since `PackageTab.tsx` had no
  drag and the up/down pattern is proven simpler to test.
- Prompt textarea with "Rebuild from scene" and "Copy", as `PackageTab`.
- Seedance profile notes (4), read-only.
- **Export package** button: builds the zip for this shot and its selected
  take, rendering a fresh guide clip through M4's `renderClip` as part of
  the export, and downloads the result. Enabled whenever the shot has a
  selected take; a guide-render failure for that take is reported per the
  error table (10) rather than disabling the button ahead of time.

**Animatic route** (`/p/:projectId/scene/:sceneId/play`, R5). A "Package
scene…" action in its toolbar opens a small dialog: a checklist of the
scene's shots, "Select all", and an **Export scene package** button that
builds the `kind: "scene"` zip from the checked shots, rendering each
included shot's guide clip fresh. The dialog does not pre-filter shots by
clip status, since packaging no longer depends on one (3.4); a shot whose
guide render fails still contributes its stills, camera path and blocking
to the zip. This is the only new UI the animatic route gets; nothing about
playback changes.

**Generations panel**, shot page, under Package: see section 8.

## 7. How generated videos come back

Manual import (P9). No fetch, no polling, no key. `Generation` is a new
type; nowhere does it touch `Take`.

```ts
// src/domain/package.ts, continued
export type Generation = {
  id: string;
  takeId: string;
  shotId: string;
  importedAt: string;      // ISO 8601
  fileName: string;         // the imported file's original name, shown in the panel
  provider: string;         // free text, defaults to "seedance"; not validated against a fixed list
  blobKey: string;           // src/storage, BlobKind "generation"
  mimeType: string;          // from the File object
  sizeBytes: number;
};

// Project (main spec, Storage) gains two new top-level fields:
//   generations?: Generation[];       // P10; defaults to [] on load
//   referenceImages?: ReferenceImage[];  // P8's project-wide reference library; defaults to [] on load
```

- **Blob kind.** `BlobKind` in `src/storage/db.ts` (main spec, Storage;
  extended by M3 5.3 to add `"track"`) gains `"generation"`, the same
  no-version-bump pattern M3 used: the kind is a field on the record, not
  part of the IndexedDB schema.
- **Storage.** `Project.generations: Generation[]` is a new top-level field
  (P10), append-only from the suite's side; deleting a generation removes
  its entry and its blob. Metadata is small (a few hundred bytes per
  record); the video bytes live in the blob store, the same split M3 made
  for dense tracks and the same reason: the 500 ms autosave stays small.
- **Import.** `importGeneration(shotId: string, takeId: string, file: File): Promise<string>` in
  `src/state/commands.ts`, beside the other document commands (M3 6.2). It
  validates the file is a browser-playable video (`file.type` starts with
  `video/`, or the extension is `.mp4`/`.webm`/`.mov` when `type` is empty,
  which happens on some OS file pickers), stores the blob, appends the
  `Generation` record, and is one undo step, matching every other document
  command's contract in M3 6.3.
- **Where the file comes from.** The provider's own web UI, downloaded by
  hand, dragged onto the Generations panel or picked with a file input. No
  URL is ever fetched by the suite; this keeps M9 inside D6 even though the
  video itself came from an external service.
- **Multiple generations per take.** Allowed; each import adds a row. This
  matches trying more than one generation from the same package and keeping
  the ones worth comparing, rather than only the latest.

**Schema.** The project's Zod schema gains `generations` and
`referenceImages`, both `.optional()` and defaulting to `[]` on load, the
same pattern M4 uses for `Take.clip` and `Shot.notes`. `schemaVersion` stays
2 and no migration step is added, for the same reason: every field is
optional, so a document written before M9 is still a valid M9 document.
Both new `BlobKind` values, `"generation"` (this section) and `"ref"`
(P8's reference images), travel through S2's zip export blob-key remap the
same way `"track"` and `"clip"` already do (10), and orphaned blobs of
either kind are left for a later cleanup pass rather than a new sweep in
this milestone (14, question 5).

## 8. Comparing a generation against the guide clip

Two-up player (P11), Generations panel, shot page:

- Left: the selected `Generation`'s video, from its blob.
- Right: the take's current guide clip, from M4's clip store, with its
  status badge.
- A dropdown over the left player picks among the take's `Generation`
  records when there is more than one, newest first.
- Transport is independent per side (each `<video>` has its own controls,
  as both predecessor tabs did) with one shared "sync play" toggle that
  starts both from `t = 0` together, for judging whether the generation
  actually followed the guide clip's timing.
- A "Mark reviewed" affordance is out of scope (9): M9 stores generations,
  it does not add an approval workflow. Section 14, question 4 asks whether
  Nick wants one later.

## 9. Out of scope

- Calling any provider's API directly, from the browser or from a server
  this app does not have (R7, D6). No `fetch` to a generation endpoint
  anywhere in this milestone's code.
- Storing, reading or prompting for an API key. Nothing in M9 has a
  credentials field.
- Polling a provider for job status. There is no job; there is a file the
  person imports when the provider's own UI says it is ready.
- Transcoding, re-encoding or remuxing the guide clip after M4 renders it,
  or an imported generation (P3). M9 calls M4's renderer once per export and
  packages what it returns; it does not touch the resulting bytes again, and
  an imported generation's bytes pass through unchanged.
- An approval or review workflow for generations (an "approved" status,
  a board thumbnail promotion, the way Scene Builder v2's `approve()` set
  `shot.status`). M9 stores and compares; a workflow on top is a later
  decision (14, question 4).
- Enforcing any Seedance numeric limit. The profile (4) states facts only
  once they carry a source; it never blocks an export.
- A second provider profile. The shape supports one (4); only Seedance's is
  written now, per R8.

## 10. Error handling

| Failure | Behaviour |
|---|---|
| `renderClip` throws `TrackMissingError` for the take's guide render | That shot's `guideClip` is `null` and no `guide.<ext>` file is written (3.4); the rest of the shot's package still builds; a banner names the take and says the dense track needs re-recording or repair |
| `renderClip` throws `UnsupportedBrowserError` for the take's guide render | Same as above: `guideClip: null`, rest of the package builds, banner names the browser limit, matching M4's 4.6 message |
| A reference image's blob is missing at export time | That reference is skipped from `refs/` and from `referenceImageIds`; the prompt's numbering (5) reflects only the references actually included, so numbers never point at a missing file |
| A scene package has zero shots | The dialog's Export button stays disabled; a line explains the scene needs at least one shot to package |
| `renderStills` fails for a still (WebGL context lost mid-export) | The export is aborted, nothing downloads, a toast names the failure; the person retries, as S1's WebGL-context-lost handling already does for the canvas generally |
| The zip write fails (out of memory on a very large scene package) | Nothing downloads; a message names the failure. No partial zip is offered, matching S2's zip-export rule of never writing a partial file |
| `importGeneration` is given a non-video file | Rejected before any blob write; the panel names the accepted types. Nothing is stored |
| The blob write in `importGeneration` fails (storage quota) | The command rejects; no `Generation` record is added; the panel shows a retry affordance, matching `commitRecordedTake`'s failure handling in M3 6.2 |
| A `Generation`'s blob is later missing (deleted by hand in devtools, or an orphaned blob swept by a future cleanup pass) | The panel shows a "video missing" badge in place of the player for that row, the same pattern M3 uses for a missing dense track; the record itself is not deleted automatically |
| Export or import of the project (S1/S2's zip, not this milestone's package zip) | `Project.generations` and `referenceImages`' blobs travel through the same blob-key remap S2 already does for prop and clip blobs; nothing package-specific is needed here since `Generation.blobKey` is just another blob reference |
| A take is deleted while it has generations | Its `Generation` records are deleted with it, in the same undo step as `deleteTake` (M3 6.2), and their blobs become orphaned for the next `collectOrphanTracks`-style sweep; M9 does not add a new sweep, and names this as a gap for Nick (14, question 5) |
| Second tab on the same project (S1's Web Lock) | Read-only, as every other editing surface; package export still works (it is a read of the document plus offscreen renders), but "Export scene package" and "Import generation" are disabled since one writes generation records and the other, being export-only, needs no write, so package export alone stays enabled while import is not |

## 11. Testing

Domain tests written first, in Node, as every earlier spec in this repo.

**Domain unit tests**

- `package.test.ts`: `sampleCameraPath` returns `Math.round(durationSec * FPS) + 1` rows, each equal to `cameraAt(take, frame / FPS)` within 1e-9; a dense take with a missing blob samples `track.first` on every row; `sampleBlockingSummary` matches `resolveScene`'s per-frame values for an object and a doll track, including a pose-span boundary at its exact key frame (mirroring the camera-and-motion spec's `resolve.test.ts` boundary case); an object or doll with no track in the shot is absent from the summary.
- `prompt.test.ts`: one test per template line in section 5; the reference-line count matches `referenceImages.length`; no dolls gives "the subjects"; each `ShotType` maps to its label, with an unknown future value falling back to "Medium shot"; the reference numbering in the prompt always matches `referenceImageIds` order, checked by building a prompt from a three-reference fixture and asserting "Image 1", "Image 2", "Image 3" appear in that order.
- `package-manifest.test.ts`: `buildPackageManifest` for `kind: "shot"` has exactly one `shots` entry; for `kind: "scene"` it has one entry per included shot, in scene order, and `referenceImages` is the union of every included entry's references with no duplicates; a shot with `guideClip: null` is still present in `shots` (3.4) but contributes no `refs/` or `shots/<id>/guide.*` file when the zip is actually written.
- `generation.test.ts`: `importGeneration`'s file-type check (accepts `video/*`, and the extension fallback for an empty `type`); rejects a non-video file with no state change.

**Property tests** (`fast-check`, following the camera-and-motion spec's convention)

1. For any valid take and any `durationSec` in `[SHOT_MIN_SEC, SHOT_MAX_SEC]`, every `CameraPathSample.rotation` in `sampleCameraPath`'s output is a unit quaternion within 1e-9 (reusing the invariant the camera spec already proves for `cameraAt`).
2. For any `ShotTracks` fixture and any `durationSec`, `sampleBlockingSummary`'s frame count per lane equals `sampleCameraPath`'s frame count for the same `durationSec`, so a consumer can zip the two files by row index.

**Storage tests**, against `fake-indexeddb`, following M3's `storage tests` pattern: `importGeneration` writes a `"generation"` blob and a `Project.generations` entry in one call; `deleteTake` removes that take's generations and their blobs' references (10); export then import of the project (S2's zip) preserves `Project.generations` with remapped blob keys and identical bytes.

**Export tests**, against a fixture project and two reference images, with M4's `renderClip` and `renderStills` stubbed: a shot package's zip contains exactly the files listed in 3.2; `manifest.json` parses and validates against a Zod schema for `PackageManifest`; a scene package with three shots, one of them stubbed to throw `TrackMissingError` from its guide render, produces two `shots/<id>/` folders with a `guide.*` file and a `shots` array of three manifest entries.

**End-to-end smoke addition**, Chromium and WebKit, appended to the suite's growing smoke flow (main spec, S1; extended by M3 section 10): on a shot with a take that can render, open the Package section, add a reference image, edit the prompt, click Export package, and assert a download event fires with a `.zip` filename; on the same shot, use Import generation with a small fixture `.mp4`, and assert it appears in the Generations panel and plays.

## 12. Porting map

Scene Builder v2 paths are relative to
`/Users/nickv/ClaudeCode Projects/Scene Builder V2 (3d editor)`, verified with
`ls` on 2026-09-25. Film Planner paths are relative to
`/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner`.

| Into | From | Source | How |
|---|---|---|---|
| `src/domain/prompt.ts` | Scene Builder v2 | `lib/prompt.ts` (33 lines, no tests) | Rewritten, not copied (P7): the sentence shape and "locked contract" idea port; the "Video 1" / model-specific numbering is replaced by the manifest's own reference order (section 5). Tests are written first, since the source has none. |
| `src/state/package-ui-store.ts` (editor-only working state: prompt override, reference picker selection) | Scene Builder v2 | `components/PackageTab.tsx` (its `refs` state, `move`, `persist`, `addFiles` functions) | Rebuilt from the ideas: reference ordering and captioning port; the shot-scoped `loadRefs`/`saveRefs` pair (`lib/clips.ts`) is replaced by the project-scoped reference library (P8), a real change to the storage shape, not a copy. |
| `src/export/package-export.ts` (zip assembly) | Scene Builder v2 | `lib/clips.ts` (IndexedDB `clips`/`outputs`/`refs` object stores, `hydrateMedia`) | Not copied. This repo already has one blob store (S1/S2's `src/storage`, extended by M3); M9 adds the `"generation"` and `"ref"` kinds to it instead of opening a second `scene-builder-v2`-style database. |
| none | Scene Builder v2 | `components/GenerateTab.tsx`, and its server routes `app/api/generate/*` (not read; out of scope by R7 and D6) | Not ported. Direct provider calls, an `ARK_API_KEY`, and status polling are exactly what R7 replaces with manual export and manual import. |
| none | Film Planner | `src/components/app/shot-view.tsx`, `scene-board.tsx` (Seedance-labeled UI strings only: a "no API key" message and a "Model: Seedance 2.0" badge, confirmed by `grep -n -i seedance` on 2026-09-25) | Not ported. No packaging or prompt logic exists in Film Planner beyond these two UI labels; the grep found no `lib/prompt`-equivalent or capture code there. `scene-board.tsx` also defines `SCENE_DURATION_CAP_SEC = 15`, with a comment calling 15 s the Seedance per-request ceiling (`grep -n SCENE_DURATION_CAP_SEC scene-board.tsx`, 2026-09-25); that value is not ported as code, but sources section 4's guide clip duration default. |
| none | This repo, M4 | outputs spec 4.4, 4.8 (`renderClip`, `renderStills`) | Not ported, called. M9 has no renderer of its own (P3, P4); it calls M4's `renderClip(..., { look: "guide" })` for the guide clip and `renderStills` for the two frame stills, both at export time. |

## 13. Build slices

Each slice ends with a Vercel preview link verified in Chrome and Safari
(main spec, Testing and CI; AGENTS.md, Finishing a task).

### M9a: Package export

Types and zip building (3), the Seedance profile as labels (4), the prompt
writer (5), and the shot-page Package section plus the animatic's "Package
scene…" dialog (6).

- **Done when:**
  1. Fetch Seedance's current documentation and record every figure in
     section 4 with a source URL and an access date, replacing "confirm at
     M9 start" with the real value or, if genuinely undocumented, with
     "undocumented, confirmed absent as of `<date>`".
  2. On a shot with a take, add two reference images, edit the caption of
     one, reorder them, and export a package: the zip contains
     `manifest.json`, both stills, the camera path, a fresh guide clip
     rendered through `renderClip(..., { look: "guide" })`, and both
     references, and the prompt's "Image 1" / "Image 2" lines match the
     final order.
  3. On a shot whose take has a missing dense track, the Export package
     button stays enabled, and the resulting zip has `guideClip: null` for
     that shot with no `guide.*` file, while the rest of the shot's package
     (stills, camera path, blocking, prompt) is present.
  4. From the animatic route, package a three-shot scene where one shot's
     guide render throws `TrackMissingError`: the zip has two shot folders
     with a `guide.*` file, the manifest lists all three, and the failing
     shot's entry has `guideClip: null`.
  5. `buildPackagePrompt` output for a shot with two dolls, no references,
     and a CU shot type reads exactly as section 5's template predicts.
- **States covered:** a guide render that succeeds, a guide render that
  fails with `TrackMissingError`, a guide render that fails with
  `UnsupportedBrowserError`, zero references, one shot's worth of
  references reused across a scene package, a shot type not seen in the
  fixtures above (POV), an empty scene (package dialog with nothing to
  select).

### M9b: Generations

`Generation`, the `"generation"` blob kind, `importGeneration`, and the
Generations panel with the two-up comparison (7, 8).

- **Done when:**
  1. Import a fixture `.mp4` on a take: it appears in the Generations panel
     within one undo step, and undo removes it while its blob stays until
     the next project open, matching `commitRecordedTake`'s undo contract.
  2. With two generations on one take, the dropdown lists both, newest
     first, and switching plays the right blob on the left while the guide
     clip stays on the right.
  3. Sync play starts both players at `t = 0` together.
  4. Reject a `.txt` file dropped on the import control: nothing is stored,
     the panel's file-type message shows.
  5. Delete the take: its generations and their document records are gone
     in the same undo step; redo restores them.
  6. Export the project, delete it, import the copy: the copy's generations
     play back with identical bytes, per S2's export/import equality rule.
- **States covered:** zero generations (panel shows an empty state, not an
  error), one generation, several generations on one take, a generation
  whose blob is later missing (10), second-tab read-only (import disabled,
  comparison still viewable).

## 14. Reserved for Nick

Sessions run in learning mode. Small decisions with a real trade-off, five to
ten lines each:

1. **The v1-to-v2-style lens conversion question doesn't recur here, but a
   parallel one does: should the package's camera path be written in the
   suite's own metres-and-quaternions frame, or converted to a coordinate
   convention closer to what a video model's camera-conditioning input
   expects (often Y-down or a different forward axis)?** Default: keep the
   suite's frame (Y up, camera looks down local −Z, as documented in the
   camera-and-motion spec section 3) and let a provider-specific converter
   be a later, separate concern once a real provider camera-conditioning
   format is confirmed, since guessing one now risks writing dead code.
2. **`SeedanceProfile.modelHint`: a plain label, or the exact model strings
   from Scene Builder v2's `GenerateTab` picker** (`dreamina-seedance-2-0-fast-260128`,
   `dreamina-seedance-2-0-260128`)? Default: the plain label `"seedance"`
   (section 4), since those strings were never confirmed against a dated
   source and may already be stale.
3. **Does an edited prompt persist across reloads**, meaning `Shot` (M3's
   contract) would need a `promptOverride` field added by a future spec, or
   does M9 stay read-only against `Shot` and accept that an edited prompt is
   lost on reload? Default: lost on reload (section 5), since adding a field
   to `Shot` is out of this milestone's ownership and the loss is small (a
   `buildPackagePrompt` rebuild is one click).
4. **Does a reviewed or approved generation get any marker** (a badge on the
   take, a board thumbnail promotion, as Scene Builder v2's `approve()`
   did), or does M9 stop at storing and comparing? Default: stop at storing
   and comparing (section 9); an approval workflow is easy to add later once
   it is clear whether Nick actually wants one per generation or per take.
5. **Orphaned generation blobs**: M3 sweeps orphaned track blobs on project
   open (`collectOrphanTracks`). Does M9 add the same sweep for generation
   and reference blobs, or leave them until a later cleanup milestone?
   Default: leave them (section 10); the suite has no total-storage pressure
   yet that a sweep would meaningfully relieve, and copying `collectOrphanTracks`'s
   pattern later is small work once it is needed.

## 15. Out of scope

Repeated from section 9 for visibility, plus the main spec's and the
roadmap's standing exclusions that also apply here: calling any provider API,
storing credentials, polling job status, transcoding media, an approval
workflow, a second provider profile, any server (main spec D6), accounts,
collaboration.

## 16. Open questions

1. Which Seedance input limits are real, and as of when. Not decided here;
   every figure in section 4 reads "confirm at M9 start" until someone
   fetches Seedance's current documentation and records the URL and the
   access date next to each figure.
2. Whether `modelHint` should ever carry a specific model id. Decided as a
   default in section 14, question 2: plain label until a dated source
   exists.
3. Whether the prompt override should persist. Decided as a default in
   section 14, question 3: it does not, in M9.
4. Whether generations get an approval workflow. Decided as a default in
   section 14, question 4: not in M9.

## Changelog

- 2026-09-25: initial spec for M9, written against the roadmap's R7 and R8,
  the camera-and-motion spec's `Take`/`cameraAt`/`takeOptics` contracts, and
  the porting map's verified predecessor paths (section 12).
- 2026-09-25: cross-spec review fixes: guide clip and stills now come from
  M4's `renderClip` and `renderStills` (P3, P4) instead of a stored clip and
  `renderShotPixels`; `Project.referenceImages` declared alongside
  `Project.generations`, with a schema note; citations corrected.


