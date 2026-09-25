# scene-builder-3d: Design Spec

**Date:** 2026-09-18
**Owner:** Nick
**Status:** Draft for review
**Related:** [FigJam board](https://www.figma.com/board/Vv6Q75mVAOujsE9qsJ0nrM/Job-Smith?node-id=0-1) (wireframes, sitemap, concept map, decision log) · [Previs Pro](https://www.previspro.com) (reference product) · predecessors [weeeha/Scene-Builder-v2](https://github.com/weeeha/Scene-Builder-v2) and [weeeha/Film-Planner-](https://github.com/weeeha/Film-Planner-)

## TL;DR

A browser-only 3D previs app. One project document in IndexedDB, `.glb` props
in a blob store, zip export as the backup. Two pages, a scene page and a shot
page, share one live 3D canvas held by a layout route, and a shot strip moves
between them in one click. The set is editable from both pages, and the shot
page has a "writes to: Set / This shot" switch. Code is ported from two earlier
repos instead of written from zero. This spec details slices S0 to S2
(scaffold, walking skeleton, props). Motion and outputs get their own specs.

## Problem

Two earlier attempts each hold half of the tool. Scene Builder v2 has the
better shot editor but only five primitive shapes, a single 427-line store, no
tests, and a strict page tree where every sideways move (shot to shot, shot to
stage) goes up through a board. Film Planner has a tested stage domain layer
and a GLB viewer, but its 3D stage is mounted on no live page, and previs does
not belong inside a film and world tool. Neither lets you build a scene out of
real props.

## User and job

- **User:** Nick, single operator, desktop browser.
- **Job:** "I have a scene in my head. I want to dress a set with props and
  characters, frame each shot with a camera, and hop between shots fast enough
  that I am directing, not navigating."

## Decisions

| # | Decision | Made |
|---|---|---|
| D1 | Film, set and shot are all covered. The shot comes first. | 2026-09-18 |
| D2 | Home is this new repo. Film Planner stays the film and world tool. Scene Builder v2 stays the archived prototype. Code is ported from both. | 2026-09-18 |
| D3 | Two pages, scene page and shot page, plus a shot strip on both. | 2026-09-18 |
| D4 | The set is editable on both pages. The shot page has a "writes to: Set / This shot" switch. | 2026-09-18 |
| D5 | First build is a walking skeleton, then props. | 2026-09-18 |
| D6 | Approach A: browser-only app, static deploy, no server. | 2026-09-18 |
| D7 | No sequences level. Project, then scenes, then shots. | 2026-09-18 |

### Alternatives considered

- **One scene workspace with `?shot=` URL state.** Recommended during the
  brainstorm, not chosen. D3 keeps two pages. The layout route below recovers
  its main benefit, a canvas that never rebuilds.
- **Immersive full-screen editor.** Most viewport room, but a second
  navigation model (enter and exit).
- **Build inside Film Planner.** Rejected by D2: previs is its own product.
- **Approach B, Next.js + PGlite + local media.** Strongest durability, but a
  deployed preview has no data, because PGlite cannot exist on serverless.
- **Approach C, straight port of Scene Builder v2.** Fastest start, but it
  inherits the single store, the localStorage size cap and zero tests.

## Architecture

Stack: Vite, React 19, TypeScript, react-three-fiber 9, drei 10, Zustand 5 with
Immer, React Router 7, Tailwind 4, shadcn/ui for panels, `idb`, `fflate`, Zod,
Vitest, Playwright. Units are metres, Y is up, the ground plane is `y = 0`.

Dependencies point one way, down this table. Storage sits beside state as a
swappable adapter.

| Layer | Folder | Holds | React or three.js? |
|---|---|---|---|
| Domain | `src/domain` | Types, `resolveScene`, state hash, poses, lens math, camera move presets, model format rules, schema migrations | Neither. Plain TypeScript, tested in Node |
| Storage | `src/storage` | Project repository, blob store, zip export and import, storage status | Neither |
| State | `src/state` | Three Zustand stores split by lifetime (below) | React only |
| Viewport | `src/viewport` | The one `StageCanvas`, camera rigs (shot, orbit, plan), gizmos, meshes for primitives, dolls and props | Both |
| App | `src/app` | Routes, layouts, panels | React only |

### Stores, split by lifetime

| Store | Holds | Persisted | Undoable |
|---|---|---|---|
| `documentStore` | The open `Project` | Yes, through the storage adapter | Yes |
| `editorStore` | Selection, active tool, gizmo mode, write target, camera mode | No | No |
| `playbackStore` | Playhead time, playing flag | No | No |

Undo covers the document only. It uses Immer patches and inverse patches, 100
deep, held in memory. Selection and playhead never enter the undo stack, and
playhead changes never trigger a save.

## Navigation

```
/                                 Projects: pick, create, import
/p/:projectId                     Board: scenes, each with its shot thumbnails
/p/:projectId/props               Prop library
/p/:projectId/scene/:sceneId      Scene page   \  children of the stage layout,
/p/:projectId/shot/:shotId        Shot page    /  which owns the canvas
```

- **Stage layout.** A pathless layout route is the parent of the scene page
  and the shot page. It mounts `StageCanvas` and the shot strip once. Moving
  scene to shot, shot to shot, or shot to scene swaps panels around a canvas
  that stays mounted. Leaving to the board or the prop library unmounts it.
- **Shot strip.** `[Set] [01] [02] [03] [+]` along the bottom of both pages.
  Set opens the scene page. A number opens that shot. Each shot card shows a
  thumbnail, name and duration, and offers duplicate, delete and drag to
  reorder. A thumbnail is rendered through that shot's camera into an
  offscreen target, never grabbed from the screen, so any shot can be
  refreshed from either page. A refresh runs, debounced, for every shot whose
  state hash differs from the hash stored with its thumbnail.
- **Scene page.** Looks through the orbit or plan (top-down) camera. Every
  edit writes to the set. Panels: object palette, inspector, scene notes.
- **Shot page.** Looks through the shot camera, with a toggle to orbit for
  adjusting things out of frame. Carries the "writes to" switch. Panels:
  object palette, inspector with camera fields (lens in mm, position, aim).
  Framing means moving the shot camera while looking through it (orbit around
  the aim point, pan, dolly). Every such move writes the shot's single
  position key and aim key.
- **Global, no route:** undo and redo, export project, storage status.
- **Keys:** `Cmd+Z` and `Shift+Cmd+Z`, `Delete`, `W` `E` `R` for move, rotate,
  scale, `[` and `]` for previous and next shot.

## Data model

One JSON document per project. Blobs live outside it and are referenced by key.

```ts
type Vec3 = [number, number, number];
type Transform = { position: Vec3; rotationY: number; scale: number }; // yaw, uniform scale
type Keyframe = { t: number; value: Vec3 };                            // seconds from shot start

type Project = {
  id: string; name: string; schemaVersion: 1;
  createdAt: string; updatedAt: string; lastExportedAt?: string;
  scenes: Scene[];                 // array order = scene order
  props: PropAsset[];              // the project's prop library
};

type Scene = {
  id: string; name: string; notes: string;
  set: { objects: StageObject[] };
  shots: Shot[];                   // array order = cut order
};

type StageObjectBase = { id: string; name: string; transform: Transform; visible: boolean };
type StageObject = StageObjectBase & (
  | { kind: 'primitive'; shape: 'box' | 'cylinder' | 'sphere' | 'plane' | 'wall'; size: Vec3; color: string }
  | { kind: 'doll'; pose: PoseName; color: string }
  | { kind: 'prop'; assetId: string; tint?: string }
);

type PropAsset = {
  id: string; name: string; tags: string[];
  source: 'import' | 'kit';
  blobKey?: string;                // import: the .glb in the blob store
  kitId?: string;                  // kit: a built-in parametric prop
  bounds: Vec3;                    // metres, measured once at import
  unitScale: number;               // normalisation factor chosen at import
  thumbKey?: string;
};

type Shot = {
  id: string; name: string;
  type: 'WIDE' | 'MED' | 'CU' | 'POV';
  durationSec: number;
  camera: { lensMm: number; position: Keyframe[]; aim: Keyframe[] };  // one key each = static shot
  overrides: Record<string, { transform?: Transform; pose?: PoseName; visible?: boolean }>;
  thumb?: { blobKey: string; stateHash: string };   // stale when stateHash differs from the current hash
};
```

`PoseName` is the six presets from Film Planner: stand, walk, run, sit, crouch,
point. Camera tracks are keyframe arrays from day one so S3 adds keys without
a migration. In S1 and S2 each array holds exactly one key.

M3 replaces `Shot.camera` with `ShotCamera` v2: a shot holds a list of takes
and one selected take, and one `cameraAt(take, t)` samples both a sparse
flat-edited track and a dense VR-recorded one. S1's single-key array migrates
to one take with one key. See
[`docs/superpowers/specs/2026-09-25-camera-and-motion-design.md`](2026-09-25-camera-and-motion-design.md).

### Resolve, write target, status, hash

- **Resolve.** The viewport renders only the output of one pure function,
  `resolveScene(scene, shot | null, t)`. Order of truth: set default, then the
  shot's override, then (from S3) the track value at time `t`. With `shot`
  null the result is the bare set.
- **Write target.** On the scene page the target is always Set. On the shot
  page the switch picks. Set edits the object's defaults, which every shot
  without an override sees. This shot writes `overrides[objectId]`. Adding an
  object always adds it to the set. "Only in this shot" is stored as default
  `visible: false` plus a `visible: true` override in the current shot.
  Deleting a set object removes its overrides in every shot, in the same
  undoable step.
- **Status is derived, never stored.** Clip states (none, ready, stale) arrive
  with S4 and come from comparing a clip's hash with the current one.
- **Hash.** `hashShotState(scene, shot)` covers exactly the render-relevant
  slice: resolved objects, camera, duration. For props it includes `assetId`
  and `unitScale`, so swapping a model invalidates a render. Names, notes and
  tags are excluded on purpose.

## Storage

- **IndexedDB** through `idb`. Stores: `projects` (documents), `blobs`
  (`{ key, projectId, kind: 'glb' | 'thumb' | 'clip', bytes, blob }`), `meta`.
- **Autosave.** A document change schedules a whole-document put after 500 ms
  of quiet. Pending saves flush on `visibilitychange` and `pagehide`.
- **Persistence.** The app calls `navigator.storage.persist()` when the first
  project is created. The storage status panel shows usage from
  `navigator.storage.estimate()`, whether persistence was granted, and a nudge
  when a project changed since `lastExportedAt` and that was over 7 days ago.
- **Export.** S1 exports `name.sb3d.json` (document only, no blobs exist yet
  apart from thumbnails, which are regenerated). S2 upgrades it to
  `name.sb3d.zip` holding `project.json` and `assets/<blobKey>.<ext>`.
- **Import.** Read `schemaVersion`, run migrations up to the current version,
  then validate the result with Zod. Import always creates a copy: a fresh
  project id and fresh blob keys, so the copy and the original never share a
  blob. Ids inside the document (scenes, shots, objects, assets) stay as they
  are, since routes scope them by project. A file that fails validation
  writes nothing. A newer `schemaVersion` refuses to open with a plain
  message. There is no auto-downgrade.
- **Two tabs.** A Web Lock per project id. The second tab opens read-only with
  a notice naming the reason.

## Props (S2)

- **Import.** Drop a `.glb` or `.gltf` on the prop library or onto the
  viewport. Validation runs before anything is stored: the last-extension
  rule and 32 MB cap from Film Planner's `model-format.ts`, then a real parse.
  A failed parse stores nothing and shows the reason.
- **Normalise once, at import.** Measure the bounding box, move the pivot to
  bottom-centre so props stand on the floor, and store `bounds`. When the
  largest side is above 50 m or below 1 cm, offer a unit fix and store the
  chosen factor as `unitScale`.
- **Thumbnail.** Rendered once, offscreen, 256 px, under a built-in
  Lightformer rig. No HDRI is fetched from a CDN. This is the fix Film
  Planner's viewer needed for metal materials rendering near black.
- **Place.** Click a prop in the palette, a ghost follows the cursor on the
  ground plane, click to drop. 0.25 m snap, and holding `Alt` turns it off.
- **Render.** One parse per asset, clones for every instance. Object URLs are
  revoked when the project closes.
- **Missing file.** A labeled box at the asset's `bounds` with a warning
  badge. A lost blob never breaks a scene.
- **Starter kit.** Twelve parametric props built in code from primitives:
  table, chair, sofa, bed, door, window, car, tree, crate, lamp, stairs, and a
  human-scale reference figure. No downloads and no licences. Kit items are
  `PropAsset` rows with `source: 'kit'`, present in every new project.

S2 is built on the S1 camera model. M3 migrates S2's data to `ShotCamera` v2
along with S1's, and prop hashing carries over unchanged: `hashShotState`
keeps covering `assetId` and `unitScale` for the M3 hash, so swapping a
model still invalidates a render.

## Porting map

| Into | From | Source files | How |
|---|---|---|---|
| `src/domain` | Film Planner | `film-planner/src/stage/types.ts`, `resolve.ts`, `hash.ts`, `lens.ts`, `poses.ts`, with tests | Copy with tests, then extend for the `prop` kind, default `visible`, keyframed camera |
| `src/domain/model-format.ts` | Film Planner | `film-planner/src/lib/model-format.ts` with test | Copy as is |
| `src/domain/moves.ts` | Scene Builder v2 | `lib/moves.ts`, `lib/camera.ts` | Copy in S3 and write the missing tests |
| `src/viewport` | Film Planner | `components/stage/doll-mesh.tsx`, `primitive-mesh.tsx`, `camera-rigs.tsx`, the light rig in `components/app/model-canvas.tsx` | Copy, remove Next.js specifics |
| `src/viewport` | Scene Builder v2 | Plan mode, camera ghost and gizmo logic in `components/StageCanvas.tsx` | Rebuild from the ideas. The file itself is not copied |
| S3, S4 | both | Film Planner `stage/render/*`, Scene Builder v2 `components/Timeline.tsx` and its auto-key logic | Ported in their own slices |
| Not ported | both | Seedance PACKAGE and GENERATE, prompt writer, Drizzle schema, server actions, auth and hosting seams | Outside this spec |

Rule for every port: copy from the real source with its tests, confirm the
tests pass unchanged, then adapt.

## Error handling

| Failure | Behaviour |
|---|---|
| IndexedDB unavailable, or quota exceeded on open | App runs in memory only behind a persistent "changes are not being saved" banner with an export button |
| Quota exceeded on a blob write | The import fails with a message. The document is untouched |
| Document save fails | Retry with backoff. Banner after three failures. Never a silent drop |
| Project has a newer `schemaVersion` | Refuse to open, plain message |
| Same project in a second tab | Second tab is read-only |
| GLB parse fails | Nothing stored, reason shown |
| Prop blob missing | Placeholder box at `bounds` with a badge |
| WebGL context lost | Remount the canvas once and show a toast. The document is unaffected |

## Testing and CI

- **Domain.** Full unit coverage: resolve precedence including visibility,
  hash stability across key order, lens round trip, model format rules,
  migrations.
- **Storage.** Against `fake-indexeddb`: save and load round trip, debounce and
  flush, export then import yielding an equal document and identical blob
  bytes, corrupt zip leaving zero partial writes.
- **State.** Write-target routing, undo and redo through patches, deleting a
  set object cleaning its overrides in every shot.
- **Viewport.** One regression test: the same canvas element survives scene to
  shot to shot. WebGL output is checked by hand and in stories, not in unit
  tests.
- **End to end.** A Playwright smoke run in Chromium and WebKit: create a
  project, add a box, add a shot, use the strip, reload, state persisted.
- **CI.** GitHub Actions on every push: typecheck, lint, unit tests, the
  Playwright smoke run. Present from S0.
- **Browsers.** Desktop Chrome and Safari are verified targets. iPad Safari
  should load and orbit. Touch editing is not a goal in S0 to S2.

## Build slices

Each slice ends with a Vercel preview link verified in Chrome and Safari. The
first implementation plan covers S0 and S1. S2 gets its own plan, written on
top of working navigation.

### S0 Scaffold

Vite app with the stack above, the folder layout, one placeholder route, CI
green, preview deployed.

- **Done when:** the preview URL loads the shell in both browsers, and CI runs
  typecheck, lint, unit and smoke jobs on a PR.

### S1 Walking skeleton

Domain port, `projects` and `blobs` stores with autosave, JSON export and
import, all five routes (prop library as an empty state), the stage layout
with one canvas, scene page with primitives and dolls under orbit and plan
cameras, shot page with shot camera, lens and framing, the shot strip with
thumbnails, the "writes to" switch with overrides, undo and redo.

- **Done when:**
  1. Create a project and a scene, place a box and a doll, add three shots,
     frame each one differently.
  2. Any strip item opens in one click, and the canvas element is the same
     object before and after (asserted in a test).
  3. With target This shot, moving the doll in shot 02 leaves shots 01 and 03
     unchanged. With target Set, it moves in every shot without an override.
  4. Reload restores the document. Twenty undo steps then twenty redo steps
     return to the same document.
  5. Export, delete the project, import: the copy equals the original apart
     from its project id, blob keys and timestamps.
- **States covered:** no projects, empty scene, scene with no shots (strip
  shows Set and +), save failing, second tab read-only.

### S2 Props

GLB import with validation, normalise and thumbnail, prop library page,
palette with ghost placement and snap, clones, missing-file placeholder,
starter kit, zip export and import, storage status panel.

- **Done when:**
  1. Drop a `.glb`, see its thumbnail in the library, place five copies, and
     the network and parse cost is paid once.
  2. A model exported in centimetres gets the unit-fix offer and lands at a
     believable size.
  3. A corrupt file and a `.fbx` are both rejected with nothing stored.
  4. Export the zip, import it in a clean browser profile: same scene, same
     props, identical blob bytes.
  5. Delete a blob by hand in devtools: the scene opens with a placeholder
     box and a badge.
- **States covered:** empty library, import in progress, import failed, prop
  missing, storage nearly full.

### S3 and S4: superseded by the roadmap

S3 merged with VR piece F into **M3 Camera and motion**:
[`docs/superpowers/specs/2026-09-25-camera-and-motion-design.md`](2026-09-25-camera-and-motion-design.md).
S4 is **M4 Outputs**:
[`docs/superpowers/specs/2026-09-25-outputs-design.md`](2026-09-25-outputs-design.md).
The two open questions below are decided, by R5 and R6 in
[`docs/roadmap.md`](../../roadmap.md).

### Reserved for Nick

Sessions run in learning mode. A few small decisions with real trade-offs are
left for Nick to write during implementation, each five to ten lines: the
unit-fix thresholds at import, snap size and rotation snap, and what "only in
this shot" does when the object is later edited from the scene page.

## Out of scope

Full three-axis rotation and non-uniform prop scale, lights, AI-generated
props, a prop library shared across projects, importing props or scenes from
Film Planner, Seedance packaging and generation, sequences, collaboration,
accounts, any server.

## Open questions

1. Where the animatic player lives: a tab beside the pages, or its own route.
   Decided, R5: its own route, `/p/:projectId/scene/:sceneId/play`. See
   [`docs/roadmap.md`](../../roadmap.md).
2. What storyboard export is: frames, PDF, share link.
   Decided, R6: a PDF plus a zip of PNG frames, no share link. See
   [`docs/roadmap.md`](../../roadmap.md).

## Changelog

- 2026-09-18: initial spec from the brainstorm (D1 to D7, approach A, three
  design sections approved in chat).
- 2026-09-25: noted that M3 replaces `Shot.camera` with `ShotCamera` v2 in
  the data model; pointed the S3/S4 outline at M3 and M4 and their specs;
  marked both open questions decided (R5, R6) with a link to
  `docs/roadmap.md`; added a note under Props (S2) that M3 migrates the S2
  camera model and prop hashing carries over unchanged.
