# scene-builder-3d S0 + S1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the scaffold (S0) and the walking skeleton (S1) of scene-builder-3d: create a project and a scene, dress the set with primitives and dolls, add and frame shots, move between them in one click on a canvas that never remounts, with autosave, undo and JSON export.

**Architecture:** A browser-only Vite single-page app. A framework-free domain layer (types, resolve, hash, schema) sits under an IndexedDB storage adapter and three Zustand stores split by lifetime (document, editor, playback). One react-three-fiber canvas is mounted by a pathless layout route that is the parent of the scene page and the shot page, so route changes swap panels around a live canvas.

**Tech Stack:** Vite 7, React 19, TypeScript 5, react-three-fiber 9, drei 10, three 0.185, Zustand 5, Immer (current major), React Router 7 (library mode, `createBrowserRouter`), Tailwind CSS 4 (`@tailwindcss/vite`), `@weeeha/ui` (Nick's Minimal Design System, vendored as an npm workspace package), Super AI Components (shadcn registry items `kbd`, `field-row`, `choice-chips`, `shortcuts-sheet`), `idb` 8, Zod 4, Vitest 4, `@testing-library/react` 16, `fake-indexeddb` 6, `@react-three/test-renderer` 9, Playwright, ESLint 9.

**Spec:** `docs/superpowers/specs/2026-09-18-scene-builder-3d-design.md`. Executors read both. Where this plan and the spec disagree, stop and ask.

## Global Constraints

- Repo: `/Users/nickv/ClaudeCode Projects/scene-builder-3d` (GitHub `weeeha/scene-builder-3d`, private). The path contains a space, so quote it in every shell command.
- Never push to `main`. All work happens on the branch `feat/s0-s1-walking-skeleton`, opened as one PR. Commit after every task.
- Commits use the author email `1083934+weeeha@users.noreply.github.com` (already set in the repo's local git config). The Gmail address is rejected on push.
- Node 22 or newer. Package manager: npm.
- Units are metres. Y is up. The ground plane is `y = 0`.
- Import alias: `@/` maps to `src/`.
- `src/domain` and `src/storage` import neither React nor three.js. This is checked by an ESLint `no-restricted-imports` rule added in Task 1.
- Dependencies point one way: app -> viewport -> state -> domain, and state -> storage -> domain. Nothing in `domain` imports from another layer.
- Port rule: when a task ports a file, copy it from the real source path with its tests, run the copied tests, then adapt. Do not retype ported code from memory.
- Port sources (read-only, never modify them):
  - Film Planner: `/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src`
  - Scene Builder v2: `/Users/nickv/ClaudeCode Projects/Scene Builder V2 (3d editor)`, files read with `git -C "<path>" show origin/v2/app:<file>`
- UI is built from `@weeeha/ui` components, imported one at a time by path: `import { Button } from "@weeeha/ui/components/button"`, `import { cn } from "@weeeha/ui/lib/utils"`. Do not install stock shadcn copies of a component that `@weeeha/ui` already has, and do not hand-roll a control the kit provides. Colors, radii and spacing come from the kit's semantic tokens (Tailwind classes such as `bg-background`, `text-muted-foreground`, `border-border`). No raw hex values in app code. The only exception is object colors inside the 3D scene.
- `@weeeha/ui` source of truth: `/Users/nickv/ClaudeCode Projects/Minimal Design System` (GitHub `weeeha/Minimal-Design-System`, private, read-only for this plan). It is vendored into `packages/ui` by `scripts/sync-ui.sh` at a pinned commit recorded in `packages/ui/VENDORED.md`. Never edit files under `packages/ui` by hand. A fix belongs upstream, followed by a re-sync.
- Super AI Components source of truth: the live registry `https://super-ai-components.vercel.app/r/<name>.json` (repo `/Users/nickv/ClaudeCode Projects/Super-AI-Components`, read-only). Items install with `npx shadcn@latest add <url>` into `src/components/super-ai/`. They import `@/lib/utils`, so `src/lib/utils.ts` re-exports `cn` from `@weeeha/ui/lib/utils`.
- UI copy: sentence case, no exclamation marks, plain verbs.
- Both light and dark mode must be checked before a UI task is called done. The kit's `ThemeProvider` (next-themes) is mounted in Task 2, together with a small `ThemeToggle` built on a kit `Button`. The kit's `mode-toggle` is a viewer and designer content switch. It is not a theme control and is not used.
- Prose rules for every comment, doc and commit message: no em dash character, no exclamation marks.
- Each of the two slices ends with a Vercel preview link verified in Chrome and Safari. A green build is not proof that a page works.
- Document saves are debounced 500 ms and flushed on `visibilitychange` and `pagehide`. Undo depth is 100.
- Defaults: new shot camera `lensMm: 35`, position `[0, 1.6, 6]`, aim `[0, 1, 0]`, `durationSec: 4`. New primitives are 1 m boxes (`size: [1, 1, 1]`), walls are `[4, 2.5, 0.2]`, planes are `[4, 0.02, 4]`. Translate snap is 0.25 m.

## File Structure

```
index.html
package.json  vite.config.ts  tsconfig.json  tsconfig.node.json  eslint.config.js
vercel.json  playwright.config.ts  components.json
scripts/sync-ui.sh
packages/ui/            vendored snapshot of @weeeha/ui (src/, package.json, postcss.config.mjs, VENDORED.md)
.github/workflows/ci.yml
e2e/smoke.spec.ts
src/
  main.tsx  index.css  test-setup.ts
  lib/utils.ts           re-exports cn from @weeeha/ui/lib/utils
  components/super-ai/   kbd, field-row (+ reset-affordance), choice-chips, shortcuts-sheet, installed from the registry
  domain/        (no React, no three.js)
    types.ts           every document type
    ids.ts             newId()
    factories.ts       createProject, createScene, createShot, createPrimitive, createDoll
    lookup.ts          findScene, findShot
    lens.ts            ported as is
    poses.ts           ported as is
    resolve.ts         resolveSceneAll, resolveScene, cameraAt
    hash.ts            stableStringify, hashShotState
    schema.ts          Zod schema, CURRENT_SCHEMA_VERSION
    migrations.ts      migrateProject, ProjectVersionError, ProjectInvalidError
  storage/       (no React, no three.js)
    db.ts              openDb, store names, BlobRecord
    project-repo.ts    listProjects, loadProject, saveProject, deleteProject
    blob-store.ts      putBlob, getBlob, deleteBlob, deleteProjectBlobs
    export-import.ts   exportProjectJson, exportFileName, importProjectJson
    autosave.ts        createAutosaver
    project-lock.ts    acquireProjectLock
  state/
    document-store.ts  useDocumentStore (project, apply, applyTransient, undo, redo)
    object-actions.ts  addObject, updateObject, deleteObject
    shot-actions.ts    addScene, renameScene, deleteScene, setSceneNotes, addShot, duplicateShot, deleteShot, moveShot, updateShot, setShotFraming, setShotLens, setShotThumb
    editor-store.ts    useEditorStore
    playback-store.ts  usePlaybackStore
  viewport/
    StageCanvas.tsx    the one canvas
    SceneContents.tsx  resolved objects to meshes
    PrimitiveMesh.tsx  DollMesh.tsx   (ported from Film Planner)
    Ground.tsx
    rigs/ShotCameraRig.tsx  rigs/OrbitRig.tsx  rigs/PlanRig.tsx
    Gizmo.tsx          transform-commit.ts
    thumbnails.ts      thumbnail-queue.ts      ThumbnailWorker.tsx
  app/
    router.tsx
    routes/ProjectsPage.tsx  BoardPage.tsx  PropsPage.tsx  ProjectLayout.tsx  StageLayout.tsx  ScenePage.tsx  ShotPage.tsx
    components/ThemeToggle.tsx  ShotStrip.tsx  ObjectPalette.tsx  Inspector.tsx  WriteTargetSwitch.tsx  SaveBanner.tsx  ReadOnlyNotice.tsx  UndoRedoButtons.tsx  ExportImportButtons.tsx
    hooks/useKeyboardShortcuts.ts
```

Tests sit beside their file as `<name>.test.ts` or `<name>.test.tsx`.

## Shared Interfaces (the contract between tasks)

Every task must use these names and signatures exactly.

```ts
// src/domain/types.ts
export type Vec3 = [number, number, number];
export type Transform = { position: Vec3; rotationY: number; scale: number };
export type Keyframe = { t: number; value: Vec3 };
export type Framing = { position: Vec3; aim: Vec3 };
export type PoseName = "stand" | "walk" | "run" | "sit" | "crouch" | "point";
export type PrimitiveShape = "box" | "cylinder" | "sphere" | "plane" | "wall";
export type StageObjectBase = { id: string; name: string; transform: Transform; visible: boolean };
export type PrimitiveObject = StageObjectBase & { kind: "primitive"; shape: PrimitiveShape; size: Vec3; color: string };
export type DollObject = StageObjectBase & { kind: "doll"; pose: PoseName; color: string };
export type PropObject = StageObjectBase & { kind: "prop"; assetId: string; tint?: string };
export type StageObject = PrimitiveObject | DollObject | PropObject;
export type PropAsset = {
  id: string; name: string; tags: string[]; source: "import" | "kit";
  blobKey?: string; kitId?: string; bounds: Vec3; unitScale: number; thumbKey?: string;
};
export type ObjectOverride = { transform?: Transform; pose?: PoseName; visible?: boolean };
export type ShotCamera = { lensMm: number; position: Keyframe[]; aim: Keyframe[] };
export type ShotType = "WIDE" | "MED" | "CU" | "POV";
export type Shot = {
  id: string; name: string; type: ShotType; durationSec: number;
  camera: ShotCamera; overrides: Record<string, ObjectOverride>;
  thumb?: { blobKey: string; stateHash: string };
};
export type Scene = { id: string; name: string; notes: string; set: { objects: StageObject[] }; shots: Shot[] };
export type Project = {
  id: string; name: string; schemaVersion: 1;
  createdAt: string; updatedAt: string; lastExportedAt?: string;
  scenes: Scene[]; props: PropAsset[];
};

// src/domain/ids.ts
export function newId(): string;                     // crypto.randomUUID()

// src/domain/factories.ts
export function createProject(name: string): Project;
export function createScene(name: string): Scene;
export function createShot(name: string): Shot;      // defaults from Global Constraints
export function createPrimitive(shape: PrimitiveShape): PrimitiveObject;
export function createDoll(): DollObject;

// src/domain/lookup.ts
export function findScene(project: Project, sceneId: string): Scene | null;
export function findShot(project: Project, shotId: string): { scene: Scene; shot: Shot } | null;

// src/domain/lens.ts (ported)
export function lensToVFovDeg(lensMm: number): number;
export function vFovToLensMm(vFovDeg: number): number;

// src/domain/poses.ts (ported): POSES, DOLL, Joint

// src/domain/resolve.ts
export function resolveSceneAll(scene: Scene, shot: Shot | null, t: number): StageObject[]; // overrides applied, set order kept, invisible objects KEPT with visible false
export function resolveScene(scene: Scene, shot: Shot | null, t: number): StageObject[];    // resolveSceneAll filtered to visible objects
export function cameraAt(camera: ShotCamera, t: number): Framing;  // linear between keys, clamped at both ends, one key = constant

// src/domain/hash.ts
export function stableStringify(value: unknown): string;
export function hashShotState(scene: Scene, shot: Shot, assets?: PropAsset[]): Promise<string>; // hex SHA-256 of resolved objects at t=0 (names excluded), camera, durationSec, and for props assetId + unitScale

// src/domain/schema.ts
export const CURRENT_SCHEMA_VERSION = 1;
export const projectSchema: z.ZodType<Project>;

// src/domain/migrations.ts
export class ProjectVersionError extends Error {}    // document is newer than this app
export class ProjectInvalidError extends Error {}    // document fails validation
export function migrateProject(raw: unknown): Project; // read schemaVersion, migrate, then validate

// src/storage/db.ts
export type BlobKind = "glb" | "thumb" | "clip";
export type BlobRecord = { key: string; projectId: string; kind: BlobKind; bytes: number; blob: Blob };
export const DB_NAME = "sb3d";
export function openDb(): Promise<IDBPDatabase<Sb3dSchema>>;  // stores: projects (keyPath id), blobs (keyPath key, index byProject), meta
export function resetDbForTests(): Promise<void>;

// src/storage/project-repo.ts
export type ProjectSummary = { id: string; name: string; updatedAt: string; sceneCount: number };
export function listProjects(): Promise<ProjectSummary[]>;      // newest first
export function loadProject(id: string): Promise<Project | null>; // runs migrateProject
export function saveProject(project: Project): Promise<void>;
export function deleteProject(id: string): Promise<void>;       // also deletes the project's blobs

// src/storage/blob-store.ts
export function putBlob(rec: { key: string; projectId: string; kind: BlobKind; blob: Blob }): Promise<void>;
export function getBlob(key: string): Promise<Blob | null>;
export function deleteBlob(key: string): Promise<void>;
export function deleteProjectBlobs(projectId: string): Promise<void>;

// src/storage/export-import.ts
export function exportProjectJson(project: Project): Blob;      // thumbs stripped, application/json
export function exportFileName(project: Project): string;       // "<slug>.sb3d.json"
export function importProjectJson(file: Blob): Promise<Project>; // migrate + validate, fresh project id, thumbs stripped, does not save

// src/storage/autosave.ts
export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
export function createAutosaver(opts: {
  save: (project: Project) => Promise<void>;
  delayMs?: number;                                             // default 500
  onStatus: (status: SaveStatus, failures: number) => void;
}): { schedule(project: Project): void; flush(): Promise<void>; dispose(): void };
// retry with backoff 1 s, 2 s, 4 s; status "error" after 3 consecutive failures; keeps retrying on the next schedule

// src/storage/project-lock.ts
export function acquireProjectLock(projectId: string): Promise<{ readOnly: boolean; release: () => void }>;
// navigator.locks with ifAvailable. No Web Locks support means readOnly false.

// src/state/document-store.ts
export type DocumentState = {
  project: Project | null; readOnly: boolean;
  saveStatus: SaveStatus; saveFailures: number;
  canUndo: boolean; canRedo: boolean;
  load(project: Project, opts?: { readOnly?: boolean }): void;  // clears history
  close(): void;
  apply(recipe: (draft: Project) => void): void;          // undoable, bumps updatedAt, schedules autosave, no-op when readOnly
  applyTransient(recipe: (draft: Project) => void): void; // not undoable, does not bump updatedAt, still saved
  undo(): void; redo(): void;
};
export const useDocumentStore: UseBoundStore<StoreApi<DocumentState>>;
export function setAutosaver(a: { schedule(p: Project): void } | null): void;

// src/state/object-actions.ts  (recipes that mutate an Immer draft)
export type EditTarget = { kind: "set" } | { kind: "shot"; shotId: string };
export function addObject(draft: Project, sceneId: string, object: StageObject, opts?: { onlyInShotId?: string }): void;
export function updateObject(draft: Project, sceneId: string, objectId: string, patch: ObjectOverride, target: EditTarget): void;
export function renameObject(draft: Project, sceneId: string, objectId: string, name: string): void;
export function deleteObject(draft: Project, sceneId: string, objectId: string): void; // also removes its overrides in every shot

// src/state/shot-actions.ts
export function addScene(draft: Project, name: string): string;
export function renameScene(draft: Project, sceneId: string, name: string): void;
export function deleteScene(draft: Project, sceneId: string): void;
export function setSceneNotes(draft: Project, sceneId: string, notes: string): void;
export function addShot(draft: Project, sceneId: string): string;
export function duplicateShot(draft: Project, sceneId: string, shotId: string): string; // copy inserted right after, thumb dropped
export function deleteShot(draft: Project, sceneId: string, shotId: string): void;
export function moveShot(draft: Project, sceneId: string, shotId: string, toIndex: number): void;
export function updateShot(draft: Project, sceneId: string, shotId: string, patch: Partial<Pick<Shot, "name" | "type" | "durationSec">>): void;
export function setShotFraming(draft: Project, sceneId: string, shotId: string, framing: Framing): void; // writes key 0 of position and aim
export function setShotLens(draft: Project, sceneId: string, shotId: string, lensMm: number): void;      // clamped 12 to 200
export function setShotThumb(draft: Project, sceneId: string, shotId: string, thumb: { blobKey: string; stateHash: string }): void;

// src/state/editor-store.ts
export type WriteTarget = "set" | "shot";
export type CameraMode = "shot" | "orbit" | "plan";
export type GizmoMode = "translate" | "rotate" | "scale";
export type EditorState = {
  selectedObjectId: string | null; gizmoMode: GizmoMode; writeTarget: WriteTarget; cameraMode: CameraMode;
  select(id: string | null): void; setGizmoMode(m: GizmoMode): void;
  setWriteTarget(t: WriteTarget): void; setCameraMode(m: CameraMode): void;
};
export const useEditorStore: UseBoundStore<StoreApi<EditorState>>;

// src/state/playback-store.ts
export const usePlaybackStore: UseBoundStore<StoreApi<{ time: number; playing: boolean; setTime(t: number): void; setPlaying(p: boolean): void }>>;

// src/viewport/transform-commit.ts
export function editTargetFor(page: "scene" | "shot", writeTarget: WriteTarget, shotId: string | null): EditTarget;
export function snapPosition(p: Vec3, step: number, enabled: boolean): Vec3;
export function framingFromControls(cameraPosition: Vec3, target: Vec3): Framing; // rounds to 3 decimals

// src/viewport/StageCanvas.tsx
export function StageCanvas(props: { sceneId: string; shotId: string | null }): JSX.Element;
// shotId null = scene page (orbit or plan camera, edits go to the set)
// Every set object is always mounted as a group named `obj:<id>`, with `visible` from resolveSceneAll.
// Every non-scene helper is named with the prefix `helper:` (`helper:ground`, `helper:gizmo`).

// src/viewport/thumbnail-queue.ts
export function shotsNeedingThumbs(scene: Scene, currentHashes: Record<string, string>): string[]; // shot ids whose thumb is missing or whose thumb.stateHash differs

// src/viewport/thumbnails.ts
export function renderShotPixels(gl: THREE.WebGLRenderer, scene3d: THREE.Scene, framing: Framing, lensMm: number): { pixels: Uint8Array; width: number; height: number }; // synchronous, 320x136, offscreen render target
export function pixelsToPngBlob(pixels: Uint8Array, width: number, height: number): Promise<Blob>;
export function renderShotThumbnail(gl: THREE.WebGLRenderer, scene3d: THREE.Scene, framing: Framing, lensMm: number): Promise<Blob>; // composition of the two

// src/viewport/ThumbnailWorker.tsx
export function ThumbnailWorker(props: { scene: Scene; sceneId: string }): null; // mounted inside the Canvas by StageCanvas

// src/app/components/ThemeToggle.tsx
export function ThemeToggle(): JSX.Element;
```

Routes (`src/app/router.tsx`):

```
/                                 ProjectsPage
/p/:projectId                     ProjectLayout (loads the project, takes the lock, mounts autosave, shows SaveBanner and ReadOnlyNotice)
  index                           BoardPage
  props                           PropsPage (empty state in S1)
  (pathless) StageLayout          mounts StageCanvas and ShotStrip once
    scene/:sceneId                ScenePage
    shot/:shotId                  ShotPage
```

## UI Component Map

Use these kit components for these jobs. Read each component's source under `packages/ui/src/components/` (or upstream before Task 2 has run) for its real props before using it.

| Job | Component |
|---|---|
| All buttons, icon buttons | `button`, `button-group`, `tooltip` for icon-only buttons |
| "Writes to: Set / This shot" switch, camera mode, gizmo mode | `toggle-group` |
| Shot type (WIDE, MED, CU, POV) | Super AI `choice-chips` |
| Inspector rows, with reset = clear this shot's override for that field | Super AI `field-row` |
| Number and text inputs, labels | `input`, `field`, `label` |
| Lens in mm | `slider` with a paired `input` |
| Side panel and canvas split | `resizable` |
| Panel scrolling | `scroll-area` |
| Shot card menu (duplicate, delete, move) | `dropdown-menu`, also bound to `context-menu` |
| Delete confirmations | `alert-dialog` |
| New project and new scene name entry | `dialog` with `input` |
| Empty states (no projects, empty scene, props page) | `empty` |
| Thumbnail loading | `skeleton` |
| Save failures, import errors, WebGL context loss | `sonner` toasts, plus `alert` for the persistent save banner and the read-only notice |
| Project and scene location | `breadcrumb` |
| Project cards, scene rows | `card`, `badge` |
| Key hints | Super AI `kbd` |
| Shortcut cheat sheet on `?` | Super AI `shortcuts-sheet` |
| Light and dark | `theme-provider`, plus `ThemeToggle` from `@/app/components/ThemeToggle` (Task 2) |

## Reserved for Nick (inside Task 13)

The spec reserves small decisions with real trade-offs for Nick because his sessions run in learning mode. In Task 13 the executor prepares the function below with its signature, doc comment and failing tests for the two unambiguous cases, then stops and asks Nick to write the body (5 to 10 lines) before continuing:

```ts
// src/state/object-actions.ts
/**
 * An object added with "only in this shot" has default visible false and a
 * visible true override in one shot. Later, on the scene page, the user edits
 * it with the set target. This decides what that edit does to visibility.
 * Options: (a) leave visibility alone, so the object stays a one-shot object
 * that can be moved from the scene page only while "show hidden" is on;
 * (b) promote it, setting default visible true and removing the now redundant
 * override, because editing it from the scene page signals it belongs to the set.
 */
export function reconcileOnlyInShot(draft: Project, sceneId: string, objectId: string): void
```

## Deviations From the Spec

- Shot reorder uses move buttons in S1. Drag to reorder is deferred, and the spec was updated to say so.
- `hashShotState` takes a third argument, the project's prop assets, so a prop's `unitScale` can enter the hash. The spec shows two arguments.
- `resolveSceneAll` was added beside `resolveScene`. The viewport mounts every set object and hides the invisible ones, so a thumbnail for any shot can be rendered from any page.
- Not in this plan: the memory-only mode for when IndexedDB is unavailable at open. S1 covers failing saves (banner with an export button) and the read-only second tab. Memory-only mode lands in S2 beside the storage status panel.
- Not in this plan: rotation snap. Translate snap is fixed at 0.25 m as the spec states. Rotation snap stays on the Reserved for Nick list and moves to S2.
- Known limitation in S1: a doll's per-shot pose override is not reflected in the thumbnail of a shot other than the one on screen. Revisited in S3.

## Conventions

- Every task follows test first order: write the failing test, run it and see it fail, write the minimal code, run it and see it pass, commit.
- Commands run from the repo root with the path quoted.
- Port steps copy from the real source and run the copied tests before adapting.
- A step marked STOP waits for Nick.

## Task Overview

| # | Task | Group |
|---|---|---|
| 1 | Project scaffold | S0 Scaffold |
| 2 | Design system wiring | S0 Scaffold |
| 3 | CI, smoke test, preview deploy | S0 Scaffold |
| 4 | Types, ids, factories, lookup | S1 Domain |
| 5 | Port lens and poses | S1 Domain |
| 6 | Resolve | S1 Domain |
| 7 | Hash | S1 Domain |
| 8 | Schema and migrations | S1 Domain |
| 9 | Database, project repository, blob store | S1 Storage |
| 10 | JSON export and import | S1 Storage |
| 11 | Autosaver and project lock | S1 Storage |
| 12 | Document store | S1 State |
| 13 | Object actions and the write target | S1 State |
| 14 | Scene and shot actions | S1 State |
| 15 | Editor and playback stores | S1 State |
| 16 | Canvas, scene contents, meshes, rigs | S1 Viewport |
| 17 | Selection, gizmo, write-target routing | S1 Viewport |
| 18 | Framing the shot camera | S1 Viewport |
| 19 | Router, projects, board, project layout | S1 App |
| 20 | Stage layout, scene page, shot page, shot strip, panels | S1 App |
| 21 | Shot thumbnails | S1 App |
| 22 | Shortcuts, undo and export UI, full smoke test, docs, S1 verification | S1 App |

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `eslint.config.js`, `src/index.css`, `src/test-setup.ts`, `src/main.tsx`, `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: nothing (first task on the branch).
- Produces: the `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:watch`, `e2e` npm scripts; the `@/` import alias resolving to `src/`; the ESLint `no-restricted-imports` guard on `src/domain/**` and `src/storage/**`; a root `App` component rendering the text `scene-builder-3d`, which Task 2 extends and Task 19 later replaces with the router.

- [ ] **Create the branch from an up to date `main`.** From the repo root:

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git fetch origin
  git checkout main
  git pull origin main
  git checkout -b feat/s0-s1-walking-skeleton
  ```

  Expected: `git status` reports `On branch feat/s0-s1-walking-skeleton` with a clean working tree.

- [ ] **Write `package.json`.**

  ```json
  {
    "name": "scene-builder-3d",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "engines": {
      "node": ">=22"
    },
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview",
      "typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json",
      "lint": "eslint .",
      "test": "vitest run",
      "test:watch": "vitest",
      "e2e": "playwright test"
    },
    "dependencies": {
      "react": "^19.2.4",
      "react-dom": "^19.2.4"
    },
    "devDependencies": {
      "@eslint/js": "^9.39.2",
      "@tailwindcss/vite": "^4.1.18",
      "@testing-library/dom": "^10.4.1",
      "@testing-library/jest-dom": "^7.0.0",
      "@testing-library/react": "^16.3.2",
      "@types/node": "^25.1.0",
      "@types/react": "^19.2.10",
      "@types/react-dom": "^19.2.3",
      "@vitejs/plugin-react": "^5.1.1",
      "eslint": "^9.39.2",
      "eslint-plugin-react-hooks": "^7.0.1",
      "eslint-plugin-react-refresh": "^0.4.24",
      "globals": "^17.2.0",
      "jsdom": "^30.0.1",
      "tailwindcss": "^4.1.18",
      "typescript": "^5.9.3",
      "typescript-eslint": "^8.54.0",
      "vite": "^7.3.2",
      "vitest": "^4.1.10"
    }
  }
  ```

  The `e2e` script is defined now so the script surface in Global Constraints exists from Task 1; `@playwright/test` and `playwright.config.ts` land in Task 3, so do not run `npm run e2e` yet.

- [ ] **Install.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  npm install
  ```

  Expected: exits 0, creates `node_modules/` and `package-lock.json`, and the summary line reads `added N packages in Ns` with `0 vulnerabilities`.

- [ ] **Write `tsconfig.json` and `tsconfig.node.json`.** Two files, not a `tsc -b` composite project: `tsconfig.json` covers `src/`, `tsconfig.node.json` covers `vite.config.ts`, and the `typecheck` script runs both explicitly (a bare `tsc --noEmit` against a references-only root config silently checks zero files in this TypeScript version, so `typecheck` never relies on that).

  `tsconfig.json`:

  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "useDefineForClassFields": true,
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "types": ["vite/client"],
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "verbatimModuleSyntax": true,
      "moduleDetection": "force",
      "noEmit": true,
      "jsx": "react-jsx",
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noFallthroughCasesInSwitch": true,
      "noUncheckedSideEffectImports": true,
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"]
      }
    },
    "include": ["src"]
  }
  ```

  `tsconfig.node.json`:

  ```json
  {
    "compilerOptions": {
      "target": "ES2023",
      "lib": ["ES2023"],
      "module": "ESNext",
      "types": ["node"],
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "verbatimModuleSyntax": true,
      "moduleDetection": "force",
      "noEmit": true,
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noFallthroughCasesInSwitch": true
    },
    "include": ["vite.config.ts"]
  }
  ```

- [ ] **Write `vite.config.ts`.** `defineConfig` comes from `vitest/config`, not `vite`, so the `test` field type-checks against Vitest's schema.

  ```ts
  import path from "path";
  import tailwindcss from "@tailwindcss/vite";
  import react from "@vitejs/plugin-react";
  import { defineConfig } from "vitest/config";

  export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test-setup.ts"],
      css: false,
    },
  });
  ```

- [ ] **Write `index.html`.**

  ```html
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta
        name="description"
        content="scene-builder-3d, a shot-first 3D previs tool for the browser."
      />
      <title>scene-builder-3d</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
    </body>
  </html>
  ```

- [ ] **Write `eslint.config.js`,** including the guard that keeps `src/domain` and `src/storage` framework-free.

  ```js
  import js from "@eslint/js";
  import globals from "globals";
  import reactHooks from "eslint-plugin-react-hooks";
  import reactRefresh from "eslint-plugin-react-refresh";
  import tseslint from "typescript-eslint";
  import { defineConfig, globalIgnores } from "eslint/config";

  export default defineConfig([
    globalIgnores(["dist"]),
    {
      files: ["**/*.{ts,tsx}"],
      extends: [
        js.configs.recommended,
        tseslint.configs.recommended,
        reactHooks.configs.flat.recommended,
        reactRefresh.configs.vite,
      ],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
      },
    },
    {
      files: ["src/domain/**/*.{ts,tsx}", "src/storage/**/*.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "react",
                message:
                  "src/domain and src/storage must stay framework-free. See AGENTS.md, Global Constraints.",
              },
              {
                name: "react-dom",
                message:
                  "src/domain and src/storage must stay framework-free. See AGENTS.md, Global Constraints.",
              },
              {
                name: "three",
                message:
                  "src/domain and src/storage must stay framework-free. See AGENTS.md, Global Constraints.",
              },
            ],
            patterns: [
              {
                group: ["@react-three/*"],
                message:
                  "src/domain and src/storage must stay framework-free. See AGENTS.md, Global Constraints.",
              },
            ],
          },
        ],
      },
    },
  ]);
  ```

- [ ] **Write `src/index.css` and `src/test-setup.ts`.** `index.css` is a bare Tailwind import for now; Task 2 replaces it with the kit's stylesheet.

  `src/index.css`:

  ```css
  @import "tailwindcss";
  ```

  `src/test-setup.ts`:

  ```ts
  import "@testing-library/jest-dom/vitest";

  import { afterEach } from "vitest";
  import { cleanup } from "@testing-library/react";

  afterEach(() => {
    cleanup();
  });
  ```

- [ ] **Commit the scaffold.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html eslint.config.js src/index.css src/test-setup.ts
  git commit -m "$(cat <<'EOF'
  chore: scaffold Vite, React, TypeScript, Tailwind and ESLint

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Write the failing test for the placeholder `App`.**

  `src/App.test.tsx`:

  ```tsx
  import { render, screen } from "@testing-library/react";
  import { describe, expect, it } from "vitest";

  import App from "./App";

  describe("App", () => {
    it("renders the placeholder text", () => {
      render(<App />);

      expect(screen.getByText("scene-builder-3d")).toBeInTheDocument();
    });
  });
  ```

- [ ] **Run it and confirm it fails.**

  ```
  npm test
  ```

  Expected: fails, because `./App` does not exist yet. Vitest reports a module resolution error for `src/App.test.tsx` (`Failed to resolve import "./App"` or `Cannot find module './App'`).

- [ ] **Write `src/App.tsx`.**

  ```tsx
  function App() {
    return <p>scene-builder-3d</p>;
  }

  export default App;
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npm test
  ```

  Expected: `1 passed`, exit code 0.

- [ ] **Write `src/main.tsx`,** the app's entry point. It is not itself unit-tested: it has the side effect of mounting to the real DOM, which is why the rendered content lives in the separately testable `App`.

  ```tsx
  import { StrictMode } from "react";
  import { createRoot } from "react-dom/client";

  import App from "./App";
  import "./index.css";

  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Root element #root not found in index.html");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  ```

- [ ] **Run typecheck, lint and build, and confirm all three are clean.**

  ```
  npm run typecheck
  npm run lint
  npm run build
  ```

  Expected: `typecheck` and `lint` print nothing and exit 0. `build` exits 0 and prints a `dist/` manifest (an `index.html`, a hashed `assets/index-*.js`, and a hashed `assets/index-*.css`).

- [ ] **Prove the domain and storage import guard actually fires, then remove the scratch file.** `src/domain` and `src/storage` do not exist yet as real folders; this step confirms the ESLint rule added above is wired to the right paths before any real domain code (Task 4 onward) depends on it.

  ```
  mkdir -p src/domain
  ```

  `src/domain/scratch.ts` (temporary, not committed):

  ```ts
  import { useState } from "react";

  export const scratch = useState;
  ```

  ```
  npm run lint
  ```

  Expected: fails. ESLint reports `src/domain/scratch.ts` with the message `src/domain and src/storage must stay framework-free. See AGENTS.md, Global Constraints.` on the `import { useState } from "react"` line.

  ```
  rm src/domain/scratch.ts
  rmdir src/domain
  npm run lint
  ```

  Expected: exits 0, nothing printed.

- [ ] **Commit the placeholder App.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/App.tsx src/App.test.tsx src/main.tsx
  git commit -m "$(cat <<'EOF'
  test: add App placeholder with a passing render test

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 2: Design system wiring

Two rules from the design system's own docs shape every step below, read in full from `/Users/nickv/ClaudeCode Projects/Minimal Design System/README.md` and `CLAUDE.md` before starting:

- **React must resolve to exactly one copy.** `@weeeha/ui` ships source `.tsx`, not compiled `.d.ts`, and is consumed through an npm workspace (a symlink), so without a `paths` override in `tsconfig.json`, TypeScript resolves React's types from the kit's own `node_modules` as well as the app's, producing two unrelated `react` type identities and `ref` errors everywhere. The README's exact fix is applied below.
- **Files under `packages/ui` are never hand-edited.** A fix belongs upstream, in the Minimal Design System repo, followed by a re-sync with `scripts/sync-ui.sh`.

One more thing to say plainly before starting: `@weeeha/ui/components/mode-toggle` is a Viewer/Designer content switch (its props are `mode: "viewer" | "designer"`), not a light and dark control. It is not used anywhere in this task. Light and dark mode is verified through a new `ThemeToggle` component, built below on `next-themes`' own `useTheme`.

**Files:**
- Create: `scripts/sync-ui.sh`, `packages/ui/` (generated by the script, not hand-written), `components.json`, `src/lib/utils.ts`, `src/app/components/ThemeToggle.tsx`
- Modify: `package.json` (workspaces, `@weeeha/ui` and `next-themes` dependencies), `tsconfig.json` (React types pin), `src/index.css` (kit stylesheet import), `eslint.config.js` (ignore `packages/ui`), `src/test-setup.ts` (`matchMedia` stub), `src/App.tsx`, `src/App.test.tsx`
- Test: `src/app/components/ThemeToggle.test.tsx`

**Interfaces:**
- Consumes: Task 1's `package.json` scripts, `tsconfig.json`, `eslint.config.js`, `src/index.css`, `src/App.tsx`, `src/App.test.tsx`, `src/test-setup.ts`.
- Produces: the vendored `packages/ui` package, importable as `@weeeha/ui/components/<name>` and `@weeeha/ui/lib/utils`; `src/lib/utils.ts`'s `cn`; `src/components/super-ai/{kbd,reset-affordance,field-row,choice-chips,shortcuts-sheet}.tsx`; the `components.json` alias contract later Super AI installs (S2 onward) reuse; `export function ThemeToggle(): JSX.Element` from `@/app/components/ThemeToggle`, the light and dark control later tasks mount wherever the kit's `mode-toggle` might otherwise have been reached for.

- [ ] **Turn the repo into an npm workspace.** Modify `package.json`: add a top-level `"workspaces"` key (placed after `"private"`).

  ```json
    "private": true,
    "workspaces": ["packages/*"],
    "type": "module",
  ```

- [ ] **Write `scripts/sync-ui.sh`.**

  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  # scripts/sync-ui.sh [path-to-Minimal-Design-System-checkout]
  #
  # Vendors @weeeha/ui into packages/ui at the upstream checkout's current
  # commit. Never edit files under packages/ui by hand: a fix goes upstream,
  # in the Minimal Design System repo, then this script runs again.

  SRC="${1:-/Users/nickv/ClaudeCode Projects/Minimal Design System}"
  REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
  PKG_DIR="$REPO_ROOT/packages/ui"

  if [ ! -f "$SRC/package.json" ]; then
    echo "Error: no package.json at $SRC. Pass the Minimal Design System checkout path as the first argument." >&2
    exit 1
  fi

  if ! git -C "$SRC" rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "Error: $SRC is not a git checkout." >&2
    exit 1
  fi

  # Scoped to exactly what this script reads: src/, package.json,
  # postcss.config.mjs, LICENSE. The upstream checkout regularly carries
  # unrelated untracked docs (review notes, spec drafts) outside those paths;
  # a whole-tree dirty check would block every run over files this script
  # never touches.
  SCOPED_STATUS="$(git -C "$SRC" status --porcelain -- src package.json postcss.config.mjs LICENSE)"

  if [ -n "$SCOPED_STATUS" ]; then
    echo "Error: $SRC has uncommitted or untracked changes in the files this script vendors (src, package.json, postcss.config.mjs, LICENSE). Commit or stash them upstream, then re-run." >&2
    echo "$SCOPED_STATUS" >&2
    exit 1
  fi

  UPSTREAM_SHA="$(git -C "$SRC" rev-parse HEAD)"
  UPSTREAM_DATE="$(git -C "$SRC" log -1 --format=%cd --date=short)"

  if [ -n "$(git -C "$SRC" status --porcelain)" ]; then
    REST_DIRTY="yes (outside the vendored files, not blocking)"
  else
    REST_DIRTY="no"
  fi

  mkdir -p "$PKG_DIR"

  rsync -a --delete \
    --exclude='*.stories.tsx' \
    --exclude='*.test.ts' \
    --exclude='*.test.tsx' \
    --exclude='*.mdx' \
    "$SRC/src/" "$PKG_DIR/src/"

  cp "$SRC/postcss.config.mjs" "$PKG_DIR/postcss.config.mjs"
  cp "$SRC/LICENSE" "$PKG_DIR/LICENSE"

  SRC="$SRC" PKG_DIR="$PKG_DIR" node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from "node:fs";
  import { join } from "node:path";

  const src = process.env.SRC;
  const pkgDir = process.env.PKG_DIR;

  const upstream = JSON.parse(readFileSync(join(src, "package.json"), "utf8"));

  const exportsOut = {};
  for (const [key, value] of Object.entries(upstream.exports ?? {})) {
    if (key.includes(".stories")) continue;
    exportsOut[key] = value;
  }

  const out = {
    name: upstream.name,
    version: upstream.version,
    exports: exportsOut,
    dependencies: upstream.dependencies,
    peerDependencies: upstream.peerDependencies,
  };

  writeFileSync(
    join(pkgDir, "package.json"),
    JSON.stringify(out, null, 2) + "\n"
  );
  NODE

  SYNCED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  cat > "$PKG_DIR/VENDORED.md" <<EOF
  # Vendored: @weeeha/ui

  - Source: $SRC
  - Upstream commit: $UPSTREAM_SHA
  - Upstream commit date: $UPSTREAM_DATE
  - Synced: $SYNCED_AT
  - Rest of checkout dirty at sync time (outside src, package.json, postcss.config.mjs, LICENSE): $REST_DIRTY

  Command used:

  \`\`\`
  scripts/sync-ui.sh "$SRC"
  \`\`\`

  Never edit files under \`packages/ui\` by hand. A fix goes upstream, in the
  Minimal Design System repo, followed by a re-sync with this script.
  EOF

  echo "Vendored @weeeha/ui from $SRC at $UPSTREAM_SHA ($UPSTREAM_DATE)"
  ```

  ```
  chmod +x scripts/sync-ui.sh
  ```

- [ ] **Run it against the default checkout.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  mkdir -p packages/ui
  ./scripts/sync-ui.sh
  ```

  Expected: exits 0 and prints `Vendored @weeeha/ui from ... at <sha> (<date>)`. The dirty-checkout guard only looks at the files this script actually copies (`src`, `package.json`, `postcss.config.mjs`, `LICENSE`), scoped with `git status --porcelain -- src package.json postcss.config.mjs LICENSE`; unrelated untracked docs elsewhere in that checkout (for example dated review notes or spec drafts under `docs/`) do not block the run, and `packages/ui/VENDORED.md` records whether any of those existed at sync time. If the guard does fire, it means one of the four vendored paths itself has uncommitted or untracked changes: the script exits 1, prints `Error: ... has uncommitted or untracked changes in the files this script vendors (src, package.json, postcss.config.mjs, LICENSE). Commit or stash them upstream, then re-run.` followed by the matching `git status --porcelain` lines; stop and tell Nick which of those four paths need committing or stashing upstream before continuing.

- [ ] **Inspect the vendored output.**

  ```
  cat packages/ui/VENDORED.md
  ls packages/ui/src
  cat packages/ui/package.json
  ```

  Expected: `VENDORED.md` names the upstream path, commit SHA and date, and states whether the rest of the checkout was dirty at sync time. `packages/ui/src` contains `components/`, `docs/`, `hooks/`, `lib/`, `styles/`, `tokens.ts` and `Foundations.stories.tsx` is absent (excluded as a `.stories.tsx` file, along with every other `*.stories.tsx`, `*.test.ts`, `*.test.tsx` and `*.mdx`). `package.json`'s `exports` map has no `.stories` entry; its `name`, `version`, `dependencies` and `peerDependencies` match the upstream `package.json` read in the previous step, and it has no `scripts` or `devDependencies` key. As of the commit this plan was written against, the vendored `package.json` reads:

  ```json
  {
    "name": "@weeeha/ui",
    "version": "0.1.0",
    "exports": {
      "./globals.css": "./src/styles/globals.css",
      "./postcss.config": "./postcss.config.mjs",
      "./tokens": "./src/tokens.ts",
      "./lib/*": "./src/lib/*.ts",
      "./components/*": "./src/components/*.tsx",
      "./hooks/*": "./src/hooks/*.ts"
    },
    "dependencies": {
      "@base-ui/react": "^1.5.0",
      "class-variance-authority": "^0.7.1",
      "clsx": "^2.1.1",
      "cmdk": "^1.1.1",
      "date-fns": "^4.4.0",
      "embla-carousel-react": "^8.6.0",
      "input-otp": "^1.4.2",
      "lucide-react": "^1.24.0",
      "nanoid": "^3.3.12",
      "next-themes": "^0.4.6",
      "radix-ui": "^1.6.0",
      "react-day-picker": "^10.0.1",
      "react-resizable-panels": "^4.11.2",
      "recharts": "^3.8.0",
      "shadcn": "^4.11.0",
      "shiki": "^4.2.0",
      "sonner": "^2.0.7",
      "streamdown": "^2.5.0",
      "tailwind-merge": "^3.6.0",
      "tokenlens": "^1.3.1",
      "tw-animate-css": "^1.4.0",
      "use-stick-to-bottom": "^1.1.6",
      "vaul": "^1.1.2",
      "zod": "^4.4.3"
    },
    "peerDependencies": {
      "ai": "^6.0.0",
      "react": "^19.0.0",
      "react-dom": "^19.0.0"
    }
  }
  ```

  A live run may show different dependency versions if the upstream kit changed since; that is expected and correct, the script is not pinned to these exact values.

- [ ] **Add `@weeeha/ui` as a workspace dependency, plus `next-themes` directly.** Modify `package.json`'s `"dependencies"`: the app imports `next-themes` directly in the theme toggle built later in this task, so it is declared explicitly rather than relied on as a hoisted transitive dependency of `packages/ui`.

  ```json
    "dependencies": {
      "@weeeha/ui": "*",
      "next-themes": "^0.4.6",
      "react": "^19.2.4",
      "react-dom": "^19.2.4"
    },
  ```

  ```
  npm install
  ```

  Expected: exits 0. `node_modules/@weeeha/ui` is a symlink to `../packages/ui` (`ls -la node_modules/@weeeha/ui` shows `-> ../packages/ui`). npm also installs `packages/ui`'s own `dependencies`, and resolves its `peerDependencies` (`ai`, `react`, `react-dom`); the `added N packages` count in the summary line grows accordingly. `0 vulnerabilities`.

- [ ] **Pin React's types in `tsconfig.json`,** exactly as the design system README's "React must resolve to exactly one copy" section specifies. Modify the `"paths"` block:

  ```json
      "paths": {
        "@/*": ["./src/*"],
        "react": ["./node_modules/@types/react"],
        "react-dom": ["./node_modules/@types/react-dom"]
      }
  ```

- [ ] **Replace `src/index.css`** with the kit's stylesheet plus an `@source` line for the app's own code (the kit's own `globals.css` already scans its own source tree for classes it uses internally, such as `bg-surface-card` in `request-card.tsx`; this `@source` line is for classes the app itself will write).

  ```css
  @import "@weeeha/ui/globals.css";

  @source "./**/*.{ts,tsx}";
  ```

- [ ] **Exclude `packages/ui` from the app's ESLint run.** Modify `eslint.config.js`'s `globalIgnores` call. Use `"packages/ui/**"`, not the bare directory name: the design system's own `CLAUDE.md` documents that ESLint's flat-config `ignores` need the trailing `/**` to exclude a directory's contents, and a bare name silently lets the vendored kit's ~97 components through the app's lint run.

  ```js
    globalIgnores(["dist", "packages/ui/**"]),
  ```

  ```
  npm run lint
  ```

  Expected: exits 0, nothing printed (packages/ui is skipped, and no app code exists yet to violate anything).

- [ ] **Commit the workspace and the vendored kit.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add package.json package-lock.json tsconfig.json src/index.css eslint.config.js scripts/sync-ui.sh packages/ui
  git commit -m "$(cat <<'EOF'
  chore: vendor @weeeha/ui into packages/ui as an npm workspace

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Write `components.json`,** matching the schema and Vite-app values verified against other Vite and Tailwind 4 projects in this fleet (`rsc: false`, no Tailwind config file under v4, `css` pointing at the app's own stylesheet).

  ```json
  {
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "radix-nova",
    "rsc": false,
    "tsx": true,
    "tailwind": {
      "config": "",
      "css": "src/index.css",
      "baseColor": "neutral",
      "cssVariables": true,
      "prefix": ""
    },
    "iconLibrary": "lucide",
    "rtl": false,
    "aliases": {
      "components": "@/components",
      "utils": "@/lib/utils",
      "ui": "@weeeha/ui/components",
      "lib": "@/lib",
      "hooks": "@/hooks"
    },
    "menuColor": "default",
    "menuAccent": "subtle",
    "registries": {}
  }
  ```

- [ ] **Write `src/lib/utils.ts`.** This is the file every Super AI component below imports as `@/lib/utils`; it exists purely to forward to the kit's own `cn`, so there is exactly one `cn` implementation in the app.

  ```ts
  export { cn } from "@weeeha/ui/lib/utils";
  ```

- [ ] **Install the four Super AI Components items from the live registry.**

  ```
  npx shadcn@latest add --yes \
    https://super-ai-components.vercel.app/r/kbd.json \
    https://super-ai-components.vercel.app/r/field-row.json \
    https://super-ai-components.vercel.app/r/choice-chips.json \
    https://super-ai-components.vercel.app/r/shortcuts-sheet.json
  ```

  Expected: the CLI reports files written under `src/components/super-ai/`: `kbd.tsx`, `field-row.tsx`, `choice-chips.tsx`, `shortcuts-sheet.tsx`, and `reset-affordance.tsx` (a `registryDependencies` pull triggered by `field-row`'s own registry entry). `shortcuts-sheet` also declares a `registryDependencies` entry on the bare name `dialog`, which resolves against the default shadcn registry (a Radix-based component, not the kit's); depending on how the CLI resolves the `ui` alias (`@weeeha/ui/components`, which is a package export, not a plain folder it can always write into) this either lands as an extra file somewhere under `src/` or is skipped. Either way, `@weeeha/ui` already ships `dialog`, so the next two steps make sure no stock copy survives and that the import used is the kit's.

- [ ] **Remove any stock `dialog` copy the CLI wrote.**

  ```
  find src -iname "dialog.tsx"
  git status --porcelain src/components
  ```

  If `find` reports a `dialog.tsx` anywhere under `src/` (for example `src/components/ui/dialog.tsx`), delete it and the directory it leaves empty:

  ```
  rm -rf src/components/ui
  ```

  Confirm only the five files named in the previous step remain under `src/components/super-ai/`.

- [ ] **Confirm `npm run typecheck` fails on `shortcuts-sheet.tsx`,** then fix it. The registry item was written for a Base UI dialog whose `DialogTrigger` takes a `render` prop; `@weeeha/ui`'s `DialogTrigger` is a thin wrapper around Radix's `DialogPrimitive.Trigger`, which takes `asChild`, not `render`.

  ```
  npm run typecheck
  ```

  Expected: fails, TypeScript reports `Property 'render' does not exist on type ...` at the `<DialogTrigger render={trigger} />` line in `src/components/super-ai/shortcuts-sheet.tsx`.

  Open `src/components/super-ai/shortcuts-sheet.tsx`. Its `Dialog` import reads either `@/components/ui/dialog` (left as the CLI found it in the registry source) or `@weeeha/ui/components/dialog` (if the CLI's alias rewrite already repointed it); make it read the kit's path either way:

  ```tsx
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@weeeha/ui/components/dialog";
  ```

  Then replace the Base UI render-prop trigger with Radix's `asChild` pattern:

  ```tsx
  {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
  ```

  ```
  npm run typecheck
  ```

  Expected: exits 0, nothing printed.

- [ ] **Commit the Super AI components.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add components.json src/lib/utils.ts src/components/super-ai
  git commit -m "$(cat <<'EOF'
  feat: install kbd, field-row, choice-chips and shortcuts-sheet from Super AI Components

  Repoint shortcuts-sheet's Dialog at @weeeha/ui and its trigger at Radix's
  asChild pattern; the registry item was written against a Base UI dialog.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Write the failing test for `ThemeToggle`, in its own file.** The kit ships a component named `mode-toggle`, but its own props (`mode: "viewer" | "designer"`) make it a content-view switch, not a light and dark control. `ThemeToggle` is a new, standalone component that uses `next-themes`' own `useTheme` instead (a real dependency of the kit already, through `theme-provider`); this test mocks `next-themes` entirely, so it needs no DOM polyfill.

  `src/app/components/ThemeToggle.test.tsx`:

  ```tsx
  import { fireEvent, render, screen } from "@testing-library/react";
  import { describe, expect, it, vi } from "vitest";

  const { setTheme } = vi.hoisted(() => ({ setTheme: vi.fn() }));

  vi.mock("next-themes", () => ({
    useTheme: () => ({ resolvedTheme: "light", setTheme }),
  }));

  import { ThemeToggle } from "./ThemeToggle";

  describe("ThemeToggle", () => {
    it('renders a button named "Toggle theme"', () => {
      render(<ThemeToggle />);

      expect(
        screen.getByRole("button", { name: "Toggle theme" })
      ).toBeInTheDocument();
    });

    it("calls setTheme with the opposite of the resolved theme on click", () => {
      render(<ThemeToggle />);

      fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));

      expect(setTheme).toHaveBeenCalledWith("dark");
    });
  });
  ```

- [ ] **Run it and confirm it fails.**

  ```
  npm test
  ```

  Expected: fails, because `./ThemeToggle` does not exist yet. Vitest reports a module resolution error for `src/app/components/ThemeToggle.test.tsx`.

- [ ] **Write `src/app/components/ThemeToggle.tsx`.** A kit `Button` in its icon variant, with sun and moon icons from `lucide-react` (the icon library the kit is built on) swapped by the `dark` class, and an accessible name that does not depend on which icon is visible.

  ```tsx
  import { Moon, Sun } from "lucide-react";
  import { useTheme } from "next-themes";

  import { Button } from "@weeeha/ui/components/button";

  // @weeeha/ui/components/mode-toggle is a Viewer/Designer content switch
  // (see its own ModeToggleProps), not a light and dark control. next-themes
  // is already a dependency of the kit through theme-provider, so this reads
  // and flips the resolved theme directly. The kit's ThemeProvider also binds
  // the "d" key (outside a text field) to the same toggle.
  export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();

    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        <Sun className="dark:hidden" />
        <Moon className="hidden dark:block" />
      </Button>
    );
  }
  ```

- [ ] **Run the test again and confirm it passes.**

  ```
  npm test
  ```

  Expected: `2 passed`, exit code 0.

- [ ] **Commit `ThemeToggle`.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/app/components/ThemeToggle.tsx src/app/components/ThemeToggle.test.tsx
  git commit -m "$(cat <<'EOF'
  feat: add a light and dark ThemeToggle backed by next-themes

  The kit's mode-toggle is a Viewer/Designer content switch, not a theme
  control, so this reads and flips next-themes' resolved theme directly.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Add a `matchMedia` stub to `src/test-setup.ts`.** `next-themes` calls `window.matchMedia` unconditionally, outside any feature check or try/catch, to read the OS color scheme; jsdom does not implement `matchMedia`, so any test that mounts the kit's real `ThemeProvider` throws `TypeError: window.matchMedia is not a function` without this. (`ThemeToggle`'s own test above mocks `next-themes` entirely and never touches this path; the App-level test below mounts the real `ThemeProvider` and needs it.) `next-themes` also uses the legacy `addListener`/`removeListener` pair, not `addEventListener`, so both are stubbed.

  ```ts
  import "@testing-library/jest-dom/vitest";

  import { afterEach } from "vitest";
  import { cleanup } from "@testing-library/react";

  afterEach(() => {
    cleanup();
  });

  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
  ```

- [ ] **Write the failing test for the kit-backed `App`.**

  `src/App.test.tsx`:

  ```tsx
  import { render, screen } from "@testing-library/react";
  import { describe, expect, it } from "vitest";

  import App from "./App";

  describe("App", () => {
    it("renders the placeholder text, a kit button, a kit kbd and the theme toggle", () => {
      render(<App />);

      expect(screen.getByText("scene-builder-3d")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Placeholder button" })
      ).toBeInTheDocument();
      expect(screen.getByText("D")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Toggle theme" })
      ).toBeInTheDocument();
    });
  });
  ```

- [ ] **Run it and confirm it fails.**

  ```
  npm test
  ```

  Expected: fails. `App` still only renders the plain `<p>scene-builder-3d</p>` from Task 1, so none of the four assertions find anything.

- [ ] **Update `src/App.tsx`** to mount the kit's `ThemeProvider`, a kit `Button`, the Super AI `Kbd`, and the `ThemeToggle` built above.

  ```tsx
  import { Button } from "@weeeha/ui/components/button";
  import { ThemeProvider } from "@weeeha/ui/components/theme-provider";

  import { ThemeToggle } from "@/app/components/ThemeToggle";
  import { Kbd } from "@/components/super-ai/kbd";

  function App() {
    return (
      <ThemeProvider>
        <div className="flex flex-col items-start gap-4 p-8">
          <p>scene-builder-3d</p>
          <Button>Placeholder button</Button>
          <Kbd>D</Kbd>
          <ThemeToggle />
        </div>
      </ThemeProvider>
    );
  }

  export default App;
  ```

- [ ] **Run the test again and confirm it passes.**

  ```
  npm test
  ```

  Expected: `1 passed` for `App.test.tsx` (`3 passed` total across the suite, counting `ThemeToggle.test.tsx`'s two), exit code 0.

- [ ] **Run typecheck and confirm no duplicate React types.**

  ```
  npm run typecheck
  ```

  Expected: exits 0, nothing printed. A duplicate-React-copy failure (the bug the `paths` pin in an earlier step prevents) would show as errors like `Type 'Element' is not assignable to type 'ReactNode'` or `'Button' cannot be used as a JSX component` pointing at two different `@types/react` locations; there should be none.

- [ ] **Run the build and confirm the kit's CSS ships.**

  ```
  npm run build
  grep -l "bg-surface-card" dist/assets/*.css
  ```

  Expected: `build` exits 0. `grep` prints the built CSS file's path: `bg-surface-card` is a Layer 2 semantic-token class the kit's own `request-card.tsx` uses, scanned in through the kit's own `@source` directive inside `packages/ui/src/styles/globals.css`, so its presence confirms the token system compiled correctly end to end, independent of anything the app itself writes.

- [ ] **Verify light and dark mode by hand.**

  ```
  npm run dev
  ```

  Open the printed local URL. Click the sun/moon icon button (accessible name "Toggle theme") and confirm the page background, the button and the `Kbd` chip all switch between light and dark. Press "d" outside any input and confirm the same toggle fires through the kit's hotkey. Stop the dev server.

- [ ] **Commit the theming.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/App.tsx src/App.test.tsx src/test-setup.ts
  git commit -m "$(cat <<'EOF'
  feat: mount ThemeProvider and verify light and dark mode

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 3: CI, smoke test, preview deploy

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `.github/workflows/ci.yml`, `vercel.json`
- Modify: `package.json` (`@playwright/test` devDependency), `.gitignore` (Playwright artifacts), `README.md` (status header)

**Interfaces:**
- Consumes: Task 1's `e2e` script and `build`/`preview` scripts; Task 2's finished, themeable `App`.
- Produces: the CI pipeline that every later task's PR runs against; `vercel.json`'s build configuration, reused unchanged through S1 and S2; a live preview URL recorded in `README.md`.

- [ ] **Add Playwright and install its browsers.** Modify `package.json`'s `"devDependencies"`, adding one line (keep the rest of the block from Task 1 as is):

  ```json
      "@playwright/test": "^1.62.1",
  ```

  ```
  npm install
  npx playwright install --with-deps chromium webkit
  ```

  Expected: `npm install` exits 0. `npx playwright install` downloads the Chromium and WebKit browser binaries into Playwright's cache and exits 0; on macOS the `--with-deps` system-package step is a no-op (that flag matters on Linux, including the CI runner in a later step).

- [ ] **Write `playwright.config.ts`.** `vite preview`'s default port is 4173.

  ```ts
  import { defineConfig, devices } from "@playwright/test";

  const PORT = 4173;

  export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: "list",
    use: {
      baseURL: `http://localhost:${PORT}`,
      trace: "on-first-retry",
    },
    projects: [
      { name: "chromium", use: { ...devices["Desktop Chrome"] } },
      { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ],
    webServer: {
      command: `npm run preview -- --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  });
  ```

- [ ] **Write `e2e/smoke.spec.ts`,** asserting the placeholder text. This grows into the full S1 flow in Task 22; for S0 it only proves the pipeline works end to end.

  ```ts
  import { test, expect } from "@playwright/test";

  test("the placeholder shell loads", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("scene-builder-3d")).toBeVisible();
  });
  ```

- [ ] **Keep Playwright's local artifacts out of git.** Modify `.gitignore`, appending:

  ```
  /test-results/
  /playwright-report/
  /blob-report/
  /playwright/.cache/
  ```

- [ ] **Run the smoke test locally and confirm both browsers pass.**

  ```
  npm run build
  npm run e2e
  ```

  Expected: `build` exits 0. `e2e` starts `vite preview` on port 4173, runs the one test in both the `chromium` and `webkit` projects, reports `2 passed`, and exits 0.

- [ ] **Commit the e2e setup.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add package.json package-lock.json playwright.config.ts e2e/smoke.spec.ts .gitignore
  git commit -m "$(cat <<'EOF'
  test: add Playwright smoke test against the built preview

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Write `.github/workflows/ci.yml`,** adapted from the Minimal Design System's own CI (`/Users/nickv/ClaudeCode Projects/Minimal Design System/.github/workflows/ci.yml`): fast static checks first, so a typo never burns a browser job, then unit tests, then the Playwright smoke run gated on both.

  ```yaml
  name: CI

  on:
    pull_request:
    push:
      branches: [main]

  concurrency:
    group: ci-${{ github.ref }}
    cancel-in-progress: true

  jobs:
    static:
      name: typecheck and lint
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: npm
        - run: npm ci
        - run: npm run typecheck
        - run: npm run lint

    unit:
      name: unit tests
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: npm
        - run: npm ci
        - run: npm run test

    e2e:
      name: smoke (chromium, webkit)
      runs-on: ubuntu-latest
      needs: [static, unit]
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: npm
        - run: npm ci
        - run: npx playwright install --with-deps chromium webkit
        - run: npm run build
        - run: npm run e2e
  ```

- [ ] **Write `vercel.json`.** The repo root is both the npm workspace root and the Vite app (`packages/ui` is a workspace sibling, not a separate deployable), so no `Root Directory` override is needed in the Vercel project settings, and the SPA rewrite sends every path to `index.html` so client-side routing (added in Task 19) works on a hard reload.

  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "framework": "vite",
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "installCommand": "npm install",
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

- [ ] **Commit CI and the deploy config.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add .github/workflows/ci.yml vercel.json
  git commit -m "$(cat <<'EOF'
  ci: add typecheck, lint, unit and smoke jobs; add Vercel build config

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Push the branch.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git push -u origin feat/s0-s1-walking-skeleton
  ```

  Expected: exits 0, prints the new remote branch and a compare/PR link.

- [ ] **Open the PR against `main`.** This PR stays open through Task 22; later tasks keep pushing commits to the same branch.

  ```
  gh pr create \
    --repo weeeha/scene-builder-3d \
    --base main \
    --head feat/s0-s1-walking-skeleton \
    --title "S0+S1: walking skeleton" \
    --body "$(cat <<'EOF'
  ## Summary

  Scaffold, design system wiring and CI for scene-builder-3d, per
  docs/superpowers/specs/2026-09-18-scene-builder-3d-design.md. This PR starts
  with S0 (Tasks 1 to 3) and grows through S1 (Tasks 4 to 22) on this same
  branch.

  - Vite, React 19, TypeScript strict, Tailwind 4, ESLint 9, Vitest 4.
  - @weeeha/ui vendored into packages/ui by scripts/sync-ui.sh, pinned to an
    upstream commit recorded in packages/ui/VENDORED.md.
  - kbd, field-row, choice-chips and shortcuts-sheet installed from the Super
    AI Components registry.
  - CI: typecheck, lint, unit tests, then a Playwright smoke run in Chromium
    and WebKit.

  ## Test plan

  - [x] npm run typecheck, npm run lint, npm run test, npm run build all pass locally.
  - [x] npm run e2e passes in both chromium and webkit locally.
  - [ ] CI green on this PR.
  - [ ] Preview deploy loads in Chrome and Safari.
  EOF
  )"
  ```

  Expected: exits 0, prints the PR URL.

- [ ] **State the Vercel deploy target and wait for Nick's go.** Do not run `vercel link` or any deploy before an explicit yes.

  State plainly: "Ready to link this repo to Vercel. Team: `nick-vyhouskis-projects`. Project name: `scene-builder-3d`. This creates a new Vercel project and deploys a preview (not production). Confirm to proceed." Wait for a clear yes before continuing.

- [ ] **After the go, link and deploy a preview.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  vercel link --yes --project scene-builder-3d --scope nick-vyhouskis-projects
  vercel deploy
  ```

  Expected: `vercel link` exits 0 and writes `.vercel/project.json`. `vercel deploy` builds and prints a `https://scene-builder-3d-*.vercel.app` preview URL (no `--prod` flag, so this is a preview deploy, consistent with the repo's own "everything published starts unlisted" convention in `AGENTS.md`). Record that URL for the next two steps.

- [ ] **Verify the preview in Chrome and Safari.** Open the printed preview URL in both browsers. Confirm the page shows "scene-builder-3d", the placeholder button and the `D` key chip, and that clicking the theme toggle icon button (accessible name "Toggle theme") flips light and dark in each browser.

- [ ] **Record the preview URL and push.** Modify `README.md`'s status header, replacing the existing line:

  ```
  > **Status:** exploration · **Stage:** design, no app code yet · **Live URL:** none yet
  ```

  with (substituting the actual URL from the deploy step):

  ```
  > **Status:** building · **Stage:** S0 scaffold done, S1 in progress · **Live URL:** <the preview URL from vercel deploy> (preview, unlisted)
  ```

  ```
  git add README.md
  git commit -m "$(cat <<'EOF'
  docs: record the S0 preview URL

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  git push
  ```

- [ ] **Confirm the S0 done check.** On the PR page, confirm all three CI jobs (`static`, `unit`, `e2e`) are green, and that the preview URL visited in the previous step showed a working, themeable placeholder in both Chrome and Safari. Report the PR URL and the preview URL.

### Task 4: Types, ids, factories, lookup

**Files:**
- Create: `src/domain/types.ts`, `src/domain/ids.ts`, `src/domain/factories.ts`, `src/domain/lookup.ts`
- Test: `src/domain/ids.test.ts`, `src/domain/factories.test.ts`, `src/domain/lookup.test.ts`

**Interfaces:**
- Consumes: nothing (first domain task; everything after this depends on it).
- Produces:

  ```ts
  // src/domain/types.ts
  export type Vec3 = [number, number, number];
  export type Transform = { position: Vec3; rotationY: number; scale: number };
  export type Keyframe = { t: number; value: Vec3 };
  export type Framing = { position: Vec3; aim: Vec3 };
  export type PoseName = "stand" | "walk" | "run" | "sit" | "crouch" | "point";
  export type PrimitiveShape = "box" | "cylinder" | "sphere" | "plane" | "wall";
  export type StageObjectBase = { id: string; name: string; transform: Transform; visible: boolean };
  export type PrimitiveObject = StageObjectBase & { kind: "primitive"; shape: PrimitiveShape; size: Vec3; color: string };
  export type DollObject = StageObjectBase & { kind: "doll"; pose: PoseName; color: string };
  export type PropObject = StageObjectBase & { kind: "prop"; assetId: string; tint?: string };
  export type StageObject = PrimitiveObject | DollObject | PropObject;
  export type PropAsset = {
    id: string; name: string; tags: string[]; source: "import" | "kit";
    blobKey?: string; kitId?: string; bounds: Vec3; unitScale: number; thumbKey?: string;
  };
  export type ObjectOverride = { transform?: Transform; pose?: PoseName; visible?: boolean };
  export type ShotCamera = { lensMm: number; position: Keyframe[]; aim: Keyframe[] };
  export type ShotType = "WIDE" | "MED" | "CU" | "POV";
  export type Shot = {
    id: string; name: string; type: ShotType; durationSec: number;
    camera: ShotCamera; overrides: Record<string, ObjectOverride>;
    thumb?: { blobKey: string; stateHash: string };
  };
  export type Scene = { id: string; name: string; notes: string; set: { objects: StageObject[] }; shots: Shot[] };
  export type Project = {
    id: string; name: string; schemaVersion: 1;
    createdAt: string; updatedAt: string; lastExportedAt?: string;
    scenes: Scene[]; props: PropAsset[];
  };

  // src/domain/ids.ts
  export function newId(): string;

  // src/domain/factories.ts
  export function createProject(name: string): Project;
  export function createScene(name: string): Scene;
  export function createShot(name: string): Shot;
  export function createPrimitive(shape: PrimitiveShape): PrimitiveObject;
  export function createDoll(): DollObject;

  // src/domain/lookup.ts
  export function findScene(project: Project, sceneId: string): Scene | null;
  export function findShot(project: Project, shotId: string): { scene: Scene; shot: Shot } | null;
  ```

  Two defaults used by `createPrimitive` and `createDoll` are not specified anywhere in the spec or the plan contract (an object color, and a shot's default `type`): `createPrimitive` and `createDoll` pick a plain neutral hex color, and `createShot` defaults `type` to `"WIDE"`. Tests below do not assert on these exact values, only on the ones Global Constraints actually states.

- [ ] **Write `src/domain/types.ts`.** Pure type declarations, so there is nothing to unit test; every later domain, storage and (eventually) state file imports from here.

  ```ts
  export type Vec3 = [number, number, number];
  export type Transform = { position: Vec3; rotationY: number; scale: number };
  export type Keyframe = { t: number; value: Vec3 };
  export type Framing = { position: Vec3; aim: Vec3 };
  export type PoseName = "stand" | "walk" | "run" | "sit" | "crouch" | "point";
  export type PrimitiveShape = "box" | "cylinder" | "sphere" | "plane" | "wall";

  export type StageObjectBase = {
    id: string;
    name: string;
    transform: Transform;
    visible: boolean;
  };

  export type PrimitiveObject = StageObjectBase & {
    kind: "primitive";
    shape: PrimitiveShape;
    size: Vec3;
    color: string;
  };

  export type DollObject = StageObjectBase & {
    kind: "doll";
    pose: PoseName;
    color: string;
  };

  export type PropObject = StageObjectBase & {
    kind: "prop";
    assetId: string;
    tint?: string;
  };

  export type StageObject = PrimitiveObject | DollObject | PropObject;

  export type PropAsset = {
    id: string;
    name: string;
    tags: string[];
    source: "import" | "kit";
    blobKey?: string;
    kitId?: string;
    bounds: Vec3;
    unitScale: number;
    thumbKey?: string;
  };

  export type ObjectOverride = {
    transform?: Transform;
    pose?: PoseName;
    visible?: boolean;
  };

  export type ShotCamera = {
    lensMm: number;
    position: Keyframe[];
    aim: Keyframe[];
  };

  export type ShotType = "WIDE" | "MED" | "CU" | "POV";

  export type Shot = {
    id: string;
    name: string;
    type: ShotType;
    durationSec: number;
    camera: ShotCamera;
    overrides: Record<string, ObjectOverride>;
    thumb?: { blobKey: string; stateHash: string };
  };

  export type Scene = {
    id: string;
    name: string;
    notes: string;
    set: { objects: StageObject[] };
    shots: Shot[];
  };

  export type Project = {
    id: string;
    name: string;
    schemaVersion: 1;
    createdAt: string;
    updatedAt: string;
    lastExportedAt?: string;
    scenes: Scene[];
    props: PropAsset[];
  };
  ```

- [ ] **Write the failing test for `newId`.**

  `src/domain/ids.test.ts`:

  ```ts
  // @vitest-environment node
  import { describe, expect, it } from "vitest";
  import { newId } from "@/domain/ids";

  describe("newId", () => {
    it("returns a non-empty string", () => {
      expect(typeof newId()).toBe("string");
      expect(newId().length).toBeGreaterThan(0);
    });

    it("returns a different value on every call", () => {
      const ids = new Set(Array.from({ length: 50 }, () => newId()));
      expect(ids.size).toBe(50);
    });
  });
  ```

  The `@vitest-environment node` docblock overrides Task 1's jsdom default for this file. `newId` calls `crypto.randomUUID()`, which Node's own global `crypto` provides directly; running domain and storage tests under `node` instead of `jsdom` avoids depending on how completely jsdom's Web Crypto and IndexedDB shims match the real browser APIs. This docblock is repeated at the top of every domain and storage test file from here on.

- [ ] **Run it and confirm it fails.**

  ```
  npx vitest run src/domain/ids.test.ts
  ```

  Expected: fails to resolve. Vitest reports it cannot resolve the import `@/domain/ids` from `src/domain/ids.test.ts`, because `src/domain/ids.ts` does not exist yet.

- [ ] **Write `src/domain/ids.ts`.**

  ```ts
  /** Generates a fresh random id for a project, scene, shot, object or asset. */
  export function newId(): string {
    return crypto.randomUUID();
  }
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npx vitest run src/domain/ids.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 2 passed (2)`, exit code 0.

- [ ] **Commit types and ids.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/domain/types.ts src/domain/ids.ts src/domain/ids.test.ts
  git commit -m "$(cat <<'EOF'
  feat(domain): add core document types and id generation

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Write the failing test for the factories.**

  `src/domain/factories.test.ts`:

  ```ts
  // @vitest-environment node
  import { describe, expect, it } from "vitest";
  import { createDoll, createPrimitive, createProject, createScene, createShot } from "@/domain/factories";

  describe("createProject", () => {
    it("creates a project with schemaVersion 1, empty scenes and props, and matching createdAt/updatedAt", () => {
      const project = createProject("Heist");
      expect(project.name).toBe("Heist");
      expect(project.schemaVersion).toBe(1);
      expect(project.scenes).toEqual([]);
      expect(project.props).toEqual([]);
      expect(project.createdAt).toBe(project.updatedAt);
      expect(project.lastExportedAt).toBeUndefined();
    });

    it("gives every project a unique id", () => {
      const a = createProject("A");
      const b = createProject("B");
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("createScene", () => {
    it("creates a scene with empty notes, an empty set and no shots", () => {
      const scene = createScene("Warehouse");
      expect(scene.name).toBe("Warehouse");
      expect(scene.notes).toBe("");
      expect(scene.set).toEqual({ objects: [] });
      expect(scene.shots).toEqual([]);
    });
  });

  describe("createShot", () => {
    it("defaults lensMm 35, a single camera keyframe at [0, 1.6, 6] aimed at [0, 1, 0], and durationSec 4", () => {
      const shot = createShot("Shot 01");
      expect(shot.name).toBe("Shot 01");
      expect(shot.camera.lensMm).toBe(35);
      expect(shot.camera.position).toEqual([{ t: 0, value: [0, 1.6, 6] }]);
      expect(shot.camera.aim).toEqual([{ t: 0, value: [0, 1, 0] }]);
      expect(shot.durationSec).toBe(4);
      expect(shot.overrides).toEqual({});
    });

    it("gives every shot a unique id", () => {
      const a = createShot("Shot 01");
      const b = createShot("Shot 02");
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("createPrimitive", () => {
    it("defaults a box to a 1 m cube", () => {
      const box = createPrimitive("box");
      expect(box.kind).toBe("primitive");
      expect(box.shape).toBe("box");
      expect(box.size).toEqual([1, 1, 1]);
      expect(box.visible).toBe(true);
      expect(box.transform).toEqual({ position: [0, 0, 0], rotationY: 0, scale: 1 });
    });

    it("defaults a cylinder and a sphere to a 1 m cube's size as well", () => {
      expect(createPrimitive("cylinder").size).toEqual([1, 1, 1]);
      expect(createPrimitive("sphere").size).toEqual([1, 1, 1]);
    });

    it("defaults a wall to [4, 2.5, 0.2]", () => {
      expect(createPrimitive("wall").size).toEqual([4, 2.5, 0.2]);
    });

    it("defaults a plane to [4, 0.02, 4]", () => {
      expect(createPrimitive("plane").size).toEqual([4, 0.02, 4]);
    });

    it("gives every primitive a unique id", () => {
      const a = createPrimitive("box");
      const b = createPrimitive("box");
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("createDoll", () => {
    it("defaults to the stand pose, is visible, and sits at the origin", () => {
      const doll = createDoll();
      expect(doll.kind).toBe("doll");
      expect(doll.pose).toBe("stand");
      expect(doll.visible).toBe(true);
      expect(doll.transform).toEqual({ position: [0, 0, 0], rotationY: 0, scale: 1 });
    });
  });
  ```

- [ ] **Run it and confirm it fails.**

  ```
  npx vitest run src/domain/factories.test.ts
  ```

  Expected: fails to resolve `@/domain/factories`, because `src/domain/factories.ts` does not exist yet.

- [ ] **Write `src/domain/factories.ts`.**

  ```ts
  import { newId } from "@/domain/ids";
  import type { DollObject, PrimitiveObject, PrimitiveShape, Project, Scene, Shot, Transform, Vec3 } from "@/domain/types";

  function defaultTransform(): Transform {
    return { position: [0, 0, 0], rotationY: 0, scale: 1 };
  }

  const PRIMITIVE_SIZE: Record<PrimitiveShape, Vec3> = {
    box: [1, 1, 1],
    cylinder: [1, 1, 1],
    sphere: [1, 1, 1],
    plane: [4, 0.02, 4],
    wall: [4, 2.5, 0.2],
  };

  const PRIMITIVE_NAME: Record<PrimitiveShape, string> = {
    box: "Box",
    cylinder: "Cylinder",
    sphere: "Sphere",
    plane: "Plane",
    wall: "Wall",
  };

  // Neither the spec nor the plan contract states a default object color, so
  // these are a plain neutral pick, not a value any test in this repo
  // asserts on.
  const PRIMITIVE_DEFAULT_COLOR = "#8a8f98";
  const DOLL_DEFAULT_COLOR = "#c97b4a";

  export function createProject(name: string): Project {
    const now = new Date().toISOString();
    return {
      id: newId(),
      name,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      scenes: [],
      props: [],
    };
  }

  export function createScene(name: string): Scene {
    return {
      id: newId(),
      name,
      notes: "",
      set: { objects: [] },
      shots: [],
    };
  }

  export function createShot(name: string): Shot {
    return {
      id: newId(),
      name,
      // Not specified by the spec or the plan contract; WIDE is the first of
      // the four ShotType values and the least presumptive default.
      type: "WIDE",
      durationSec: 4,
      camera: {
        lensMm: 35,
        position: [{ t: 0, value: [0, 1.6, 6] }],
        aim: [{ t: 0, value: [0, 1, 0] }],
      },
      overrides: {},
    };
  }

  export function createPrimitive(shape: PrimitiveShape): PrimitiveObject {
    return {
      id: newId(),
      name: PRIMITIVE_NAME[shape],
      kind: "primitive",
      shape,
      size: [...PRIMITIVE_SIZE[shape]],
      color: PRIMITIVE_DEFAULT_COLOR,
      transform: defaultTransform(),
      visible: true,
    };
  }

  export function createDoll(): DollObject {
    return {
      id: newId(),
      name: "Doll",
      kind: "doll",
      pose: "stand",
      color: DOLL_DEFAULT_COLOR,
      transform: defaultTransform(),
      visible: true,
    };
  }
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npx vitest run src/domain/factories.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 9 passed (9)`, exit code 0.

- [ ] **Commit the factories.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/domain/factories.ts src/domain/factories.test.ts
  git commit -m "$(cat <<'EOF'
  feat(domain): add document factories with Global Constraints defaults

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Write the failing test for lookup.**

  `src/domain/lookup.test.ts`:

  ```ts
  // @vitest-environment node
  import { describe, expect, it } from "vitest";
  import { createProject, createScene, createShot } from "@/domain/factories";
  import { findScene, findShot } from "@/domain/lookup";

  describe("findScene", () => {
    it("finds a scene by id", () => {
      const project = createProject("P");
      const scene = createScene("Scene 1");
      project.scenes.push(scene);

      expect(findScene(project, scene.id)).toBe(scene);
    });

    it("returns null for an id that matches no scene", () => {
      const project = createProject("P");
      expect(findScene(project, "missing")).toBeNull();
    });
  });

  describe("findShot", () => {
    it("finds a shot and its owning scene", () => {
      const project = createProject("P");
      const scene = createScene("Scene 1");
      const shot = createShot("Shot 01");
      scene.shots.push(shot);
      project.scenes.push(scene);

      const result = findShot(project, shot.id);
      expect(result).not.toBeNull();
      expect(result!.scene).toBe(scene);
      expect(result!.shot).toBe(shot);
    });

    it("returns null for an id that matches no shot in any scene", () => {
      const project = createProject("P");
      const scene = createScene("Scene 1");
      scene.shots.push(createShot("Shot 01"));
      project.scenes.push(scene);

      expect(findShot(project, "missing")).toBeNull();
    });
  });
  ```

- [ ] **Run it and confirm it fails.**

  ```
  npx vitest run src/domain/lookup.test.ts
  ```

  Expected: fails to resolve `@/domain/lookup`, because `src/domain/lookup.ts` does not exist yet.

- [ ] **Write `src/domain/lookup.ts`.**

  ```ts
  import type { Project, Scene, Shot } from "@/domain/types";

  export function findScene(project: Project, sceneId: string): Scene | null {
    return project.scenes.find((scene) => scene.id === sceneId) ?? null;
  }

  export function findShot(project: Project, shotId: string): { scene: Scene; shot: Shot } | null {
    for (const scene of project.scenes) {
      const shot = scene.shots.find((candidate) => candidate.id === shotId);
      if (shot) {
        return { scene, shot };
      }
    }
    return null;
  }
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npx vitest run src/domain/lookup.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 4 passed (4)`, exit code 0.

- [ ] **Commit lookup.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/domain/lookup.ts src/domain/lookup.test.ts
  git commit -m "$(cat <<'EOF'
  feat(domain): add findScene and findShot lookups

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 5: Port lens and poses

**Files:**
- Create: `src/domain/lens.ts`, `src/domain/poses.ts`
- Test: `src/domain/lens.test.ts`, `src/domain/poses.test.ts`

**Interfaces:**
- Consumes: `PoseName`, `Vec3` from `src/domain/types.ts` (Task 4).
- Produces:

  ```ts
  // src/domain/lens.ts
  export function lensToVFovDeg(lensMm: number): number;
  export function vFovToLensMm(vFovDeg: number): number;

  // src/domain/poses.ts
  export type Joint =
    | "neck" | "shoulderL" | "shoulderR" | "elbowL" | "elbowR"
    | "hipL" | "hipR" | "kneeL" | "kneeR";
  export const POSES: Record<PoseName, Record<Joint, Vec3>>;
  export const DOLL: {
    headRadius: number;
    torso: { height: number; radius: number };
    upperArm: { length: number; radius: number };
    foreArm: { length: number; radius: number };
    thigh: { length: number; radius: number };
    shin: { length: number; radius: number };
    hipHeight: number;
  };
  ```

  Both files exist verbatim at `film-planner/src/stage/lens.ts` and `film-planner/src/stage/poses.ts`, each with a test file that already exists too (`lens.test.ts` was checked before writing this task: it is present, so no fallback round-trip test needs to be written from scratch). `lens.ts` itself has zero imports, so only its test file's import path needs fixing. `poses.ts` imports `PoseName` and `Vec3` from `@/stage/types`, which become `@/domain/types`; the new `types.ts` from Task 4 defines both with the exact same values, so no other change is needed.

- [ ] **Copy `lens.ts` and its test.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  cp "/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/stage/lens.ts" src/domain/lens.ts
  cp "/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/stage/lens.test.ts" src/domain/lens.test.ts
  ```

- [ ] **Fix the import path in the copied test.** `src/domain/lens.test.ts`, line 2, change:

  ```ts
  import { lensToVFovDeg, vFovToLensMm } from "@/stage/lens";
  ```

  to:

  ```ts
  import { lensToVFovDeg, vFovToLensMm } from "@/domain/lens";
  ```

  Add the environment docblock as the new first line of the file:

  ```ts
  // @vitest-environment node
  ```

  `lens.ts` itself needs no edit: it has no imports at all, only `Math.atan`, `Math.tan` and a local constant.

- [ ] **Run the copied test and confirm it passes unchanged.**

  ```
  npx vitest run src/domain/lens.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 6 passed (6)`, exit code 0. The six are `lensToVFovDeg`'s two assertions plus `vFovToLensMm`'s `it.each` over four focal lengths (24, 35, 50, 85mm), none of which needed any logic change, only the import path.

- [ ] **Commit lens.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/domain/lens.ts src/domain/lens.test.ts
  git commit -m "$(cat <<'EOF'
  feat(domain): port lens math from Film Planner

  Ported from film-planner/src/stage/lens.ts and lens.test.ts unchanged
  apart from the @/stage/lens -> @/domain/lens import path; lens.ts itself
  has no imports to fix.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Copy `poses.ts` and its test.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  cp "/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/stage/poses.ts" src/domain/poses.ts
  cp "/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/stage/poses.test.ts" src/domain/poses.test.ts
  ```

- [ ] **Fix the import paths in both copied files.** `src/domain/poses.ts`, line 1, change:

  ```ts
  import type { PoseName, Vec3 } from "@/stage/types";
  ```

  to:

  ```ts
  import type { PoseName, Vec3 } from "@/domain/types";
  ```

  `src/domain/poses.test.ts`, lines 2 to 3, change:

  ```ts
  import { DOLL, POSES } from "@/stage/poses";
  import type { PoseName } from "@/stage/types";
  ```

  to:

  ```ts
  import { DOLL, POSES } from "@/domain/poses";
  import type { PoseName } from "@/domain/types";
  ```

  Add the environment docblock as the new first line of the test file:

  ```ts
  // @vitest-environment node
  ```

  No other line in either file changes: the new `types.ts`'s `PoseName` is the same six-value union and `Vec3` is the same three-number tuple as `film-planner`'s, so `POSES` and `DOLL`'s bodies port with zero logic changes.

- [ ] **Run the copied test and confirm it passes unchanged.**

  ```
  npx vitest run src/domain/poses.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 10 passed (10)`, exit code 0 (eight in the `POSES` describe block, two in `DOLL`).

- [ ] **Commit poses.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/domain/poses.ts src/domain/poses.test.ts
  git commit -m "$(cat <<'EOF'
  feat(domain): port doll poses from Film Planner

  Ported from film-planner/src/stage/poses.ts and poses.test.ts unchanged
  apart from the @/stage/types -> @/domain/types import path.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 6: Resolve

**Files:**
- Create: `src/domain/resolve.ts`
- Test: `src/domain/resolve.test.ts`

**Interfaces:**
- Consumes: `Framing`, `Keyframe`, `Scene`, `Shot`, `ShotCamera`, `StageObject`, `Vec3` from `src/domain/types.ts` (Task 4); `createDoll`, `createPrimitive`, `createScene`, `createShot` from `src/domain/factories.ts` (Task 4) in the test only.
- Produces:

  ```ts
  export function resolveSceneAll(scene: Scene, shot: Shot | null, t: number): StageObject[];
  export function resolveScene(scene: Scene, shot: Shot | null, t: number): StageObject[];
  export function cameraAt(camera: ShotCamera, t: number): Framing;
  ```

  Film Planner's `stage/resolve.ts` and `resolve.test.ts` were read in full before writing this task (both are quoted in the research above). `resolveSceneAll` ports `resolveObjects`'s merge order (set default, then override, clone every transform so no returned object shares a reference with its input) but adapts it to the new shape: overrides live on `Shot.overrides` (a `Record<string, ObjectOverride>`) rather than a separate `ShotOverrides` document, a `null` shot means "no overrides, just the set", and every `StageObjectBase` now carries its own default `visible` rather than visibility being purely an override concern. Unlike Film Planner's `resolveObjects`, `resolveSceneAll` never drops an object for being invisible: it keeps one entry per object in `scene.set.objects`, each carrying its resolved `visible` value (true or false). This is what the thumbnail worker needs (added in Task 21): it renders a shot's own framing while the user may be looking at a different shot, so every object in the set has to be mounted, including ones hidden in the shot being thumbnailed, or that shot's render would be missing geometry the live view never asked it to hide. `resolveScene` is `resolveSceneAll` filtered down to `visible: true`; this is what the viewport renders for whichever page is on screen. The new `cameraAt` ports the linear interpolation and clamping idea from Film Planner's `cameraAt`, but Film Planner's camera had exactly two fixed keys (`start`/`end`); the new `ShotCamera` carries a `Keyframe[]` per track (`position`, `aim`), so the new implementation samples an arbitrary-length sorted track instead of lerping between two fixed fields.

- [ ] **Write the failing test.**

  `src/domain/resolve.test.ts`:

  ```ts
  // @vitest-environment node
  import { describe, expect, it } from "vitest";
  import { createDoll, createPrimitive, createScene, createShot } from "@/domain/factories";
  import { cameraAt, resolveScene, resolveSceneAll } from "@/domain/resolve";
  import type { Scene, ShotCamera } from "@/domain/types";

  function withObjects(scene: Scene, objects: Scene["set"]["objects"]): Scene {
    return { ...scene, set: { objects } };
  }

  describe("resolveScene", () => {
    it("keeps set order and returns the bare visible set when shot is null", () => {
      const box = createPrimitive("box");
      const doll = createDoll();
      const scene = withObjects(createScene("Set"), [box, doll]);

      const result = resolveScene(scene, null, 0);
      expect(result.map((o) => o.id)).toEqual([box.id, doll.id]);
    });

    it("a set-default-invisible object stays out of the bare set and out of a shot with no override for it", () => {
      const hidden = createPrimitive("box");
      hidden.visible = false;
      const scene = withObjects(createScene("Set"), [hidden]);
      const shot = createShot("Shot 01");

      expect(resolveScene(scene, null, 0)).toEqual([]);
      expect(resolveScene(scene, shot, 0)).toEqual([]);
    });

    it("a set-default-invisible object appears only in the shot whose override sets visible: true", () => {
      const hidden = createPrimitive("box");
      hidden.visible = false;
      const scene = withObjects(createScene("Set"), [hidden]);
      const shotWithOverride = createShot("Shot 01");
      shotWithOverride.overrides[hidden.id] = { visible: true };
      const otherShot = createShot("Shot 02");

      expect(resolveScene(scene, shotWithOverride, 0).map((o) => o.id)).toEqual([hidden.id]);
      expect(resolveScene(scene, otherShot, 0)).toEqual([]);
      expect(resolveScene(scene, null, 0)).toEqual([]);
    });

    it("an override with visible: false drops a default-visible object from just that shot", () => {
      const box = createPrimitive("box");
      const scene = withObjects(createScene("Set"), [box]);
      const shot = createShot("Shot 01");
      shot.overrides[box.id] = { visible: false };

      expect(resolveScene(scene, shot, 0)).toEqual([]);
      expect(resolveScene(scene, null, 0).map((o) => o.id)).toEqual([box.id]);
    });

    it("an override replaces transform for just that shot, leaving the set default and other shots untouched", () => {
      const box = createPrimitive("box");
      const scene = withObjects(createScene("Set"), [box]);
      const shot = createShot("Shot 01");
      const otherShot = createShot("Shot 02");
      shot.overrides[box.id] = { transform: { position: [5, 0, 5], rotationY: 90, scale: 2 } };

      expect(resolveScene(scene, shot, 0)[0].transform).toEqual({ position: [5, 0, 5], rotationY: 90, scale: 2 });
      expect(resolveScene(scene, otherShot, 0)[0].transform).toEqual(box.transform);
      expect(resolveScene(scene, null, 0)[0].transform).toEqual(box.transform);
    });

    it("an override replaces pose for a doll in just that shot", () => {
      const doll = createDoll();
      const scene = withObjects(createScene("Set"), [doll]);
      const shot = createShot("Shot 01");
      shot.overrides[doll.id] = { pose: "run" };

      const inShot = resolveScene(scene, shot, 0)[0];
      expect(inShot.kind).toBe("doll");
      if (inShot.kind === "doll") {
        expect(inShot.pose).toBe("run");
      }

      const inSet = resolveScene(scene, null, 0)[0];
      expect(inSet.kind).toBe("doll");
      if (inSet.kind === "doll") {
        expect(inSet.pose).toBe("stand");
      }
    });

    it("does not mutate the scene or shot inputs, and returns independently-owned transforms", () => {
      const box = createPrimitive("box");
      const scene = withObjects(createScene("Set"), [box]);
      const shot = createShot("Shot 01");
      shot.overrides[box.id] = { transform: { position: [9, 9, 9], rotationY: 0, scale: 1 } };
      const sceneBefore = JSON.parse(JSON.stringify(scene));
      const shotBefore = JSON.parse(JSON.stringify(shot));

      const result = resolveScene(scene, shot, 0);
      result[0].transform.position[0] = 999;

      expect(scene).toEqual(sceneBefore);
      expect(shot).toEqual(shotBefore);
    });
  });

  describe("resolveSceneAll", () => {
    it("keeps a default-visible object hidden by a visible: false override, marked visible: false", () => {
      const box = createPrimitive("box");
      const scene = withObjects(createScene("Set"), [box]);
      const shot = createShot("Shot 01");
      shot.overrides[box.id] = { visible: false };

      const result = resolveSceneAll(scene, shot, 0);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(box.id);
      expect(result[0].visible).toBe(false);
    });

    it("a default-invisible object with a visible: true override is visible only for that shot", () => {
      const hidden = createPrimitive("box");
      hidden.visible = false;
      const scene = withObjects(createScene("Set"), [hidden]);
      const shotA = createShot("Shot A");
      shotA.overrides[hidden.id] = { visible: true };
      const shotB = createShot("Shot B");

      expect(resolveSceneAll(scene, shotA, 0)[0].visible).toBe(true);
      expect(resolveSceneAll(scene, shotB, 0)[0].visible).toBe(false);
      expect(resolveSceneAll(scene, null, 0)[0].visible).toBe(false);
    });

    it("applies a transform override to a hidden object too", () => {
      const box = createPrimitive("box");
      const scene = withObjects(createScene("Set"), [box]);
      const shot = createShot("Shot 01");
      shot.overrides[box.id] = {
        visible: false,
        transform: { position: [5, 0, 5], rotationY: 90, scale: 2 },
      };

      const result = resolveSceneAll(scene, shot, 0);
      expect(result[0].visible).toBe(false);
      expect(result[0].transform).toEqual({ position: [5, 0, 5], rotationY: 90, scale: 2 });
    });

    it("returns exactly one entry per object in the set, regardless of visibility", () => {
      const visible = createPrimitive("box");
      const hidden = createPrimitive("wall");
      hidden.visible = false;
      const scene = withObjects(createScene("Set"), [visible, hidden]);
      const shot = createShot("Shot 01");

      expect(resolveSceneAll(scene, shot, 0)).toHaveLength(scene.set.objects.length);
      expect(resolveSceneAll(scene, null, 0)).toHaveLength(scene.set.objects.length);
    });

    it("resolveScene's output equals resolveSceneAll's output filtered to visible: true", () => {
      const visible = createPrimitive("box");
      const hidden = createPrimitive("wall");
      hidden.visible = false;
      const scene = withObjects(createScene("Set"), [visible, hidden]);
      const shot = createShot("Shot 01");
      shot.overrides[visible.id] = { visible: false };
      shot.overrides[hidden.id] = { visible: true };

      const all = resolveSceneAll(scene, shot, 0);
      const filtered = all.filter((o) => o.visible);
      expect(resolveScene(scene, shot, 0)).toEqual(filtered);
    });
  });

  describe("cameraAt", () => {
    function makeCamera(): ShotCamera {
      return {
        lensMm: 35,
        position: [
          { t: 0, value: [0, 0, 0] },
          { t: 2, value: [10, 20, 30] },
        ],
        aim: [
          { t: 0, value: [0, 0, -1] },
          { t: 2, value: [10, 0, -1] },
        ],
      };
    }

    it("returns a constant framing for a single key, regardless of t", () => {
      const camera: ShotCamera = {
        lensMm: 35,
        position: [{ t: 0, value: [1, 2, 3] }],
        aim: [{ t: 0, value: [0, 1, 0] }],
      };
      expect(cameraAt(camera, 0)).toEqual({ position: [1, 2, 3], aim: [0, 1, 0] });
      expect(cameraAt(camera, 5)).toEqual({ position: [1, 2, 3], aim: [0, 1, 0] });
    });

    it("linearly interpolates position and aim at the midpoint between two keys", () => {
      const camera = makeCamera();
      const result = cameraAt(camera, 1);
      expect(result.position).toEqual([5, 10, 15]);
      expect(result.aim).toEqual([5, 0, -1]);
    });

    it("clamps to the first key before its t", () => {
      const camera = makeCamera();
      expect(cameraAt(camera, -1)).toEqual({ position: [0, 0, 0], aim: [0, 0, -1] });
    });

    it("clamps to the last key after its t", () => {
      const camera = makeCamera();
      expect(cameraAt(camera, 10)).toEqual({ position: [10, 20, 30], aim: [10, 0, -1] });
    });
  });
  ```

- [ ] **Run it and confirm it fails.**

  ```
  npx vitest run src/domain/resolve.test.ts
  ```

  Expected: fails to resolve `@/domain/resolve`, because `src/domain/resolve.ts` does not exist yet.

- [ ] **Write `src/domain/resolve.ts`.**

  ```ts
  import type { Framing, Keyframe, Scene, Shot, ShotCamera, StageObject, Vec3 } from "@/domain/types";

  function cloneTransform(transform: StageObject["transform"]): StageObject["transform"] {
    return { ...transform, position: [...transform.position] as Vec3 };
  }

  /**
   * Merges a shot's overrides on top of the set's defaults, per object id,
   * keeping the set's array order, without dropping anything: every object
   * in scene.set.objects appears exactly once in the result, each with an
   * independent copy of its transform, so gizmo drags never mutate the
   * document directly. Ported from Film Planner's stage/resolve.ts
   * resolveObjects, except Film Planner's version dropped an object
   * entirely once its override said visible: false; this version keeps it
   * and sets its own visible field to false instead, because the thumbnail
   * worker (Task 21) needs to mount a shot's hidden objects too while
   * rendering that shot's framing from a different page. A null shot
   * applies no overrides, so the result mirrors the set's own defaults
   * exactly.
   *
   * t is accepted for forward compatibility with S3's per-object keyframe
   * tracks; no StageObject carries a track of its own yet, so t has no
   * effect in S1 or S2.
   */
  export function resolveSceneAll(scene: Scene, shot: Shot | null, t: number): StageObject[] {
    return scene.set.objects.map((object) => {
      const override = shot ? shot.overrides[object.id] : undefined;
      const visible = override?.visible ?? object.visible;

      const merged: StageObject = { ...object, transform: cloneTransform(object.transform), visible };
      if (override?.transform !== undefined) {
        merged.transform = cloneTransform(override.transform);
      }
      if (merged.kind === "doll" && override?.pose !== undefined) {
        merged.pose = override.pose;
      }
      return merged;
    });
  }

  /**
   * resolveSceneAll filtered down to the objects that are actually visible.
   * This is what the viewport renders for whichever page is on screen;
   * resolveSceneAll itself exists for the thumbnail worker, which needs
   * every object mounted, hidden ones included.
   */
  export function resolveScene(scene: Scene, shot: Shot | null, t: number): StageObject[] {
    return resolveSceneAll(scene, shot, t).filter((object) => object.visible);
  }

  function lerp(a: number, b: number, ratio: number): number {
    return a + (b - a) * ratio;
  }

  function lerpVec3(a: Vec3, b: Vec3, ratio: number): Vec3 {
    return [lerp(a[0], b[0], ratio), lerp(a[1], b[1], ratio), lerp(a[2], b[2], ratio)];
  }

  /** Samples a sorted keyframe track at time t. One key is constant; t before the first key or after the last clamps. */
  function sampleTrack(track: Keyframe[], t: number): Vec3 {
    if (track.length === 1) {
      return track[0].value;
    }

    const first = track[0];
    if (t <= first.t) {
      return first.value;
    }
    const last = track[track.length - 1];
    if (t >= last.t) {
      return last.value;
    }

    for (let i = 0; i < track.length - 1; i += 1) {
      const from = track[i];
      const to = track[i + 1];
      if (t >= from.t && t <= to.t) {
        const ratio = to.t === from.t ? 0 : (t - from.t) / (to.t - from.t);
        return lerpVec3(from.value, to.value, ratio);
      }
    }

    return last.value;
  }

  /**
   * Samples the shot camera at time t (seconds), sampling the position and
   * aim tracks independently. Ported from Film Planner's stage/resolve.ts
   * cameraAt: linear interpolation with clamping at both ends. Film
   * Planner's camera had exactly two fixed keys (start/end); ShotCamera's
   * position and aim are each an arbitrary-length Keyframe[], so this
   * samples a general track instead of lerping two fixed fields. In S1 and
   * S2 every track holds exactly one key, so cameraAt always returns that
   * key's value regardless of t.
   */
  export function cameraAt(camera: ShotCamera, t: number): Framing {
    return {
      position: sampleTrack(camera.position, t),
      aim: sampleTrack(camera.aim, t),
    };
  }
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npx vitest run src/domain/resolve.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 16 passed (16)`, exit code 0 (7 `resolveScene`, 5 `resolveSceneAll`, 4 `cameraAt`).

- [ ] **Commit resolve.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/domain/resolve.ts src/domain/resolve.test.ts
  git commit -m "$(cat <<'EOF'
  feat(domain): add resolveSceneAll, resolveScene and cameraAt

  Adapts Film Planner's stage/resolve.ts merge order and clamped lerp to
  the new Shot.overrides shape and keyframed ShotCamera tracks.
  resolveSceneAll keeps every object, hidden ones included with
  visible: false, for the thumbnail worker; resolveScene filters that
  down to what the current page actually shows.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 7: Hash

**Files:**
- Create: `src/domain/hash.ts`
- Test: `src/domain/hash.test.ts`

**Interfaces:**
- Consumes: `resolveScene` from `src/domain/resolve.ts` (Task 6); `PropAsset`, `PropObject`, `Scene`, `Shot` from `src/domain/types.ts` (Task 4); `createPrimitive`, `createScene`, `createShot` from `src/domain/factories.ts` (Task 4) in the test only.
- Produces:

  ```ts
  export function stableStringify(value: unknown): string;
  export function hashShotState(scene: Scene, shot: Shot, assets?: PropAsset[]): Promise<string>;
  ```

  `stableStringify` is copied from Film Planner's `stage/hash.ts` with no logic change at all (it only depends on plain JS values, not on any Film Planner type), including its two dedicated tests (`sorts object keys recursively but preserves array order`, `preserves array element order`), copied unchanged apart from the import path. Film Planner's second function, `stageStateHash`, is not ported: it hashed `{ stage, overrides, camera, durationSec }` directly, whereas the new `hashShotState` must hash `resolveScene`'s already-merged output (per Global Constraints: "hex SHA-256 over stableStringify of `{ objects: resolveScene(scene, shot, 0)` with `name` removed and, for props, the matching asset's `unitScale` added `}`; camera; durationSec"), so it is new code built on top of the ported `stableStringify` and Task 6's `resolveScene`. Film Planner's `stageStateHash` tests are not ported for the same reason; the tests below are written fresh against the new function's contract.

- [ ] **Copy `hash.ts` and its test.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  cp "/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/stage/hash.ts" src/domain/hash.ts
  cp "/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/stage/hash.test.ts" src/domain/hash.test.ts
  ```

- [ ] **Edit `src/domain/hash.ts`: keep `stableStringify`, replace `stageStateHash` with `hashShotState`.** Replace the whole file with:

  ```ts
  import { resolveScene } from "@/domain/resolve";
  import type { PropAsset, Scene, Shot } from "@/domain/types";

  /**
   * Deterministically stringifies a value: object keys are sorted
   * recursively; array order is preserved as-is. Ported unchanged from Film
   * Planner's stage/hash.ts: it only touches plain JS values, so nothing
   * about the new document shape affects it.
   */
  export function stableStringify(value: unknown): string {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }

    const keys = Object.keys(value as Record<string, unknown>).sort();
    const entries = keys.map(
      (key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
    );
    return `{${entries.join(",")}}`;
  }

  /**
   * Hex SHA-256 digest of the render-relevant slice of a shot's state: the
   * resolved objects at t=0 with their name removed (and, for a prop, the
   * matching asset's unitScale added), the shot's camera, and its duration.
   * Scene notes, object names and the shot's own thumb are excluded on
   * purpose, so renaming or annotating never invalidates a rendered
   * thumbnail. assets defaults to an empty list for scenes with no props.
   */
  export async function hashShotState(scene: Scene, shot: Shot, assets: PropAsset[] = []): Promise<string> {
    const objects = resolveScene(scene, shot, 0).map((object) => {
      const { name, ...rest } = object;
      if (rest.kind === "prop") {
        const asset = assets.find((candidate) => candidate.id === rest.assetId);
        return { ...rest, unitScale: asset?.unitScale };
      }
      return rest;
    });

    const value = { objects, camera: shot.camera, durationSec: shot.durationSec };
    const text = stableStringify(value);
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  ```

- [ ] **Replace `src/domain/hash.test.ts`.** Keep the two `stableStringify` tests as ported (only the import path and the environment docblock change), and replace the old `stageStateHash` describe block with fresh `hashShotState` tests against the new contract.

  ```ts
  // @vitest-environment node
  import { describe, expect, it } from "vitest";
  import { createPrimitive, createScene, createShot } from "@/domain/factories";
  import { hashShotState, stableStringify } from "@/domain/hash";
  import type { PropAsset, PropObject, Scene } from "@/domain/types";

  describe("stableStringify", () => {
    it("sorts object keys recursively but preserves array order", () => {
      const a = { b: 1, a: 2, c: { z: 1, y: 2 } };
      const b = { c: { y: 2, z: 1 }, a: 2, b: 1 };
      expect(stableStringify(a)).toBe(stableStringify(b));
    });

    it("preserves array element order", () => {
      const value = { list: [3, 1, 2] };
      expect(stableStringify(value)).toContain("[3,1,2]");
    });
  });

  function withObjects(scene: Scene, objects: Scene["set"]["objects"]): Scene {
    return { ...scene, set: { objects } };
  }

  describe("hashShotState", () => {
    it("is stable across key order in the inputs", async () => {
      const box = createPrimitive("box");
      const sceneA: Scene = { id: "s1", name: "Set", notes: "", set: { objects: [box] }, shots: [] };
      const sceneB: Scene = { notes: "", id: "s1", set: { objects: [box] }, name: "Set", shots: [] };
      const shot = createShot("Shot 01");

      const hashA = await hashShotState(sceneA, shot);
      const hashB = await hashShotState(sceneB, shot);
      expect(hashA).toBe(hashB);
    });

    it("returns a 64-character hex sha-256 digest", async () => {
      const scene = withObjects(createScene("Set"), [createPrimitive("box")]);
      const shot = createShot("Shot 01");
      const hash = await hashShotState(scene, shot);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("changes when an object's transform changes", async () => {
      const box = createPrimitive("box");
      const scene = withObjects(createScene("Set"), [box]);
      const shot = createShot("Shot 01");
      const before = await hashShotState(scene, shot);

      const movedBox = { ...box, transform: { ...box.transform, position: [1, 0, 0] } };
      const after = await hashShotState(withObjects(scene, [movedBox]), shot);
      expect(after).not.toBe(before);
    });

    it("changes when the camera changes", async () => {
      const scene = withObjects(createScene("Set"), [createPrimitive("box")]);
      const shot = createShot("Shot 01");
      const before = await hashShotState(scene, shot);

      const changedShot = { ...shot, camera: { ...shot.camera, lensMm: 50 } };
      const after = await hashShotState(scene, changedShot);
      expect(after).not.toBe(before);
    });

    it("changes when durationSec changes", async () => {
      const scene = withObjects(createScene("Set"), [createPrimitive("box")]);
      const shot = createShot("Shot 01");
      const before = await hashShotState(scene, shot);

      const changedShot = { ...shot, durationSec: 8 };
      const after = await hashShotState(scene, changedShot);
      expect(after).not.toBe(before);
    });

    it("does not change when an object is renamed", async () => {
      const box = createPrimitive("box");
      const scene = withObjects(createScene("Set"), [box]);
      const shot = createShot("Shot 01");
      const before = await hashShotState(scene, shot);

      const renamedBox = { ...box, name: "Renamed box" };
      const after = await hashShotState(withObjects(scene, [renamedBox]), shot);
      expect(after).toBe(before);
    });

    it("does not change when the shot is renamed or scene notes change", async () => {
      const scene = withObjects(createScene("Set"), [createPrimitive("box")]);
      const shot = createShot("Shot 01");
      const before = await hashShotState(scene, shot);

      const renamedShot = { ...shot, name: "Renamed shot" };
      const notedScene = { ...scene, notes: "Remember the getaway car." };
      const after = await hashShotState(notedScene, renamedShot);
      expect(after).toBe(before);
    });

    it("changes when a prop's assetId changes", async () => {
      const propA: PropObject = {
        id: "obj_1",
        name: "Prop",
        kind: "prop",
        assetId: "asset_a",
        transform: { position: [0, 0, 0], rotationY: 0, scale: 1 },
        visible: true,
      };
      const propB: PropObject = { ...propA, assetId: "asset_b" };
      const shot = createShot("Shot 01");
      const assets: PropAsset[] = [
        { id: "asset_a", name: "Chair", tags: [], source: "kit", bounds: [1, 1, 1], unitScale: 1 },
        { id: "asset_b", name: "Table", tags: [], source: "kit", bounds: [1, 1, 1], unitScale: 1 },
      ];

      const hashA = await hashShotState(withObjects(createScene("Set"), [propA]), shot, assets);
      const hashB = await hashShotState(withObjects(createScene("Set"), [propB]), shot, assets);
      expect(hashA).not.toBe(hashB);
    });

    it("changes when the matching asset's unitScale changes", async () => {
      const prop: PropObject = {
        id: "obj_1",
        name: "Prop",
        kind: "prop",
        assetId: "asset_a",
        transform: { position: [0, 0, 0], rotationY: 0, scale: 1 },
        visible: true,
      };
      const scene = withObjects(createScene("Set"), [prop]);
      const shot = createShot("Shot 01");
      const assetsBefore: PropAsset[] = [
        { id: "asset_a", name: "Chair", tags: [], source: "kit", bounds: [1, 1, 1], unitScale: 1 },
      ];
      const assetsAfter: PropAsset[] = [
        { id: "asset_a", name: "Chair", tags: [], source: "kit", bounds: [1, 1, 1], unitScale: 1.5 },
      ];

      const before = await hashShotState(scene, shot, assetsBefore);
      const after = await hashShotState(scene, shot, assetsAfter);
      expect(before).not.toBe(after);
    });
  });
  ```

- [ ] **Run it and confirm it fails, then passes.** First, before editing `hash.ts` and `hash.test.ts` (i.e. right after the two `cp` commands above), running the copied files unmodified fails because they still import `@/stage/hash` and `@/stage/types`, neither of which exists in this repo:

  ```
  npx vitest run src/domain/hash.test.ts
  ```

  Expected (before the edits): fails to resolve `@/stage/hash`. After making the two edits above:

  ```
  npx vitest run src/domain/hash.test.ts
  ```

  Expected (after the edits): `Test Files 1 passed (1)`, `Tests 11 passed (11)`, exit code 0 (2 `stableStringify` tests, 9 `hashShotState` tests).

- [ ] **Commit hash.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/domain/hash.ts src/domain/hash.test.ts
  git commit -m "$(cat <<'EOF'
  feat(domain): port stableStringify, add hashShotState

  stableStringify is ported unchanged from Film Planner's stage/hash.ts.
  hashShotState replaces Film Planner's stageStateHash: it hashes
  resolveScene's merged output (names stripped, prop unitScale mixed in)
  plus the shot's camera and duration.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 8: Schema and migrations

**Files:**
- Create: `src/domain/schema.ts`, `src/domain/migrations.ts`
- Test: `src/domain/schema.test.ts`, `src/domain/migrations.test.ts`

**Interfaces:**
- Consumes: `Project` (and every type it is built from) from `src/domain/types.ts` (Task 4); `createDoll`, `createPrimitive`, `createProject`, `createScene`, `createShot` from `src/domain/factories.ts` (Task 4) in tests only.
- Produces:

  ```ts
  // src/domain/schema.ts
  export const CURRENT_SCHEMA_VERSION = 1;
  export const projectSchema: z.ZodType<Project>;

  // src/domain/migrations.ts
  export class ProjectVersionError extends Error {}
  export class ProjectInvalidError extends Error {}
  export function migrateProject(raw: unknown): Project;
  ```

  Neither file is a port: schema validation and migration are new to this repo. `zod` is not yet a dependency (nothing in Tasks 1 to 7 needed it), so it is installed as the first step.

- [ ] **Install zod.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  npm install zod
  ```

  Expected: exits 0, `package.json`'s `dependencies` gains `"zod": "^4.6.5"` (or whatever the current zod 4 release is at install time), `0 vulnerabilities`.

- [ ] **Write the failing test for the schema.**

  `src/domain/schema.test.ts`:

  ```ts
  // @vitest-environment node
  import { describe, expect, it } from "vitest";
  import { createPrimitive, createProject, createScene, createShot } from "@/domain/factories";
  import { CURRENT_SCHEMA_VERSION, projectSchema } from "@/domain/schema";

  describe("CURRENT_SCHEMA_VERSION", () => {
    it("is 1", () => {
      expect(CURRENT_SCHEMA_VERSION).toBe(1);
    });
  });

  describe("projectSchema", () => {
    it("accepts a valid v1 project built from the factories", () => {
      const project = createProject("Heist");
      const scene = createScene("Warehouse");
      scene.set.objects.push(createPrimitive("box"));
      scene.shots.push(createShot("Shot 01"));
      project.scenes.push(scene);

      const result = projectSchema.safeParse(project);
      expect(result.success).toBe(true);
    });

    it("rejects a project with an unknown primitive shape", () => {
      const project = createProject("Heist");
      const scene = createScene("Warehouse");
      const box = createPrimitive("box");
      scene.set.objects.push({ ...box, shape: "cone" } as unknown as typeof box);
      project.scenes.push(scene);

      const result = projectSchema.safeParse(project);
      expect(result.success).toBe(false);
    });
  });
  ```

- [ ] **Run it and confirm it fails.**

  ```
  npx vitest run src/domain/schema.test.ts
  ```

  Expected: fails to resolve `@/domain/schema`, because `src/domain/schema.ts` does not exist yet.

- [ ] **Write `src/domain/schema.ts`.**

  ```ts
  import { z } from "zod";
  import type { Project } from "@/domain/types";

  const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

  const transformSchema = z.object({
    position: vec3Schema,
    rotationY: z.number(),
    scale: z.number(),
  });

  const keyframeSchema = z.object({
    t: z.number(),
    value: vec3Schema,
  });

  const poseNameSchema = z.enum(["stand", "walk", "run", "sit", "crouch", "point"]);
  const primitiveShapeSchema = z.enum(["box", "cylinder", "sphere", "plane", "wall"]);

  const stageObjectBase = {
    id: z.string(),
    name: z.string(),
    transform: transformSchema,
    visible: z.boolean(),
  };

  const primitiveObjectSchema = z.object({
    ...stageObjectBase,
    kind: z.literal("primitive"),
    shape: primitiveShapeSchema,
    size: vec3Schema,
    color: z.string(),
  });

  const dollObjectSchema = z.object({
    ...stageObjectBase,
    kind: z.literal("doll"),
    pose: poseNameSchema,
    color: z.string(),
  });

  const propObjectSchema = z.object({
    ...stageObjectBase,
    kind: z.literal("prop"),
    assetId: z.string(),
    tint: z.string().optional(),
  });

  const stageObjectSchema = z.discriminatedUnion("kind", [
    primitiveObjectSchema,
    dollObjectSchema,
    propObjectSchema,
  ]);

  const propAssetSchema = z.object({
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()),
    source: z.enum(["import", "kit"]),
    blobKey: z.string().optional(),
    kitId: z.string().optional(),
    bounds: vec3Schema,
    unitScale: z.number(),
    thumbKey: z.string().optional(),
  });

  const objectOverrideSchema = z.object({
    transform: transformSchema.optional(),
    pose: poseNameSchema.optional(),
    visible: z.boolean().optional(),
  });

  const shotCameraSchema = z.object({
    lensMm: z.number(),
    position: z.array(keyframeSchema),
    aim: z.array(keyframeSchema),
  });

  const shotTypeSchema = z.enum(["WIDE", "MED", "CU", "POV"]);

  const shotThumbSchema = z.object({
    blobKey: z.string(),
    stateHash: z.string(),
  });

  const shotSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: shotTypeSchema,
    durationSec: z.number(),
    camera: shotCameraSchema,
    overrides: z.record(z.string(), objectOverrideSchema),
    thumb: shotThumbSchema.optional(),
  });

  const sceneSchema = z.object({
    id: z.string(),
    name: z.string(),
    notes: z.string(),
    set: z.object({ objects: z.array(stageObjectSchema) }),
    shots: z.array(shotSchema),
  });

  export const CURRENT_SCHEMA_VERSION = 1;

  export const projectSchema: z.ZodType<Project> = z.object({
    id: z.string(),
    name: z.string(),
    schemaVersion: z.literal(1),
    createdAt: z.string(),
    updatedAt: z.string(),
    lastExportedAt: z.string().optional(),
    scenes: z.array(sceneSchema),
    props: z.array(propAssetSchema),
  });
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npx vitest run src/domain/schema.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 3 passed (3)`, exit code 0.

- [ ] **Commit the schema.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add package.json package-lock.json src/domain/schema.ts src/domain/schema.test.ts
  git commit -m "$(cat <<'EOF'
  feat(domain): add the v1 project Zod schema

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Write the failing test for migrations.**

  `src/domain/migrations.test.ts`:

  ```ts
  // @vitest-environment node
  import { describe, expect, it } from "vitest";
  import { createPrimitive, createProject, createScene, createShot } from "@/domain/factories";
  import { migrateProject, ProjectInvalidError, ProjectVersionError } from "@/domain/migrations";

  describe("migrateProject", () => {
    it("passes a valid v1 document through, fully parsed", () => {
      const project = createProject("Heist");
      const scene = createScene("Warehouse");
      scene.set.objects.push(createPrimitive("box"));
      scene.shots.push(createShot("Shot 01"));
      project.scenes.push(scene);

      const result = migrateProject(project);
      expect(result).toEqual(project);
    });

    it("throws ProjectVersionError for a document newer than this app", () => {
      const project = createProject("Heist");
      const newerProject = { ...project, schemaVersion: 2 };
      expect(() => migrateProject(newerProject)).toThrow(ProjectVersionError);
    });

    it("throws ProjectInvalidError for a document missing scenes", () => {
      const project = createProject("Heist");
      const { scenes, ...withoutScenes } = project;
      expect(() => migrateProject(withoutScenes)).toThrow(ProjectInvalidError);
    });

    it("throws ProjectInvalidError for a non-object", () => {
      expect(() => migrateProject("not a project")).toThrow(ProjectInvalidError);
      expect(() => migrateProject(null)).toThrow(ProjectInvalidError);
      expect(() => migrateProject(42)).toThrow(ProjectInvalidError);
    });
  });
  ```

- [ ] **Run it and confirm it fails.**

  ```
  npx vitest run src/domain/migrations.test.ts
  ```

  Expected: fails to resolve `@/domain/migrations`, because `src/domain/migrations.ts` does not exist yet.

- [ ] **Write `src/domain/migrations.ts`.**

  ```ts
  import { CURRENT_SCHEMA_VERSION, projectSchema } from "@/domain/schema";
  import type { Project } from "@/domain/types";

  /** Thrown when a document's schemaVersion is newer than this app understands. */
  export class ProjectVersionError extends Error {}

  /** Thrown when a document fails schema validation, at any schemaVersion. */
  export class ProjectInvalidError extends Error {}

  /**
   * Reads a raw, untrusted value's schemaVersion, runs any migrations up to
   * CURRENT_SCHEMA_VERSION, then validates the result. There are no
   * migrations yet: schemaVersion 1 is the only version that has ever
   * shipped, so this function's migration step is currently a no-op, and
   * exists so a future schemaVersion 2 has a place to plug in without
   * touching every caller.
   */
  export function migrateProject(raw: unknown): Project {
    if (typeof raw !== "object" || raw === null) {
      throw new ProjectInvalidError("Project document is not an object.");
    }

    const schemaVersion = (raw as { schemaVersion?: unknown }).schemaVersion;
    if (typeof schemaVersion === "number" && schemaVersion > CURRENT_SCHEMA_VERSION) {
      throw new ProjectVersionError(
        `This project was saved by a newer version of the app (schema ${schemaVersion}, this app supports up to ${CURRENT_SCHEMA_VERSION}).`,
      );
    }

    const result = projectSchema.safeParse(raw);
    if (!result.success) {
      throw new ProjectInvalidError(`Project document failed validation: ${result.error.message}`);
    }
    return result.data;
  }
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npx vitest run src/domain/migrations.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 4 passed (4)`, exit code 0.

- [ ] **Commit migrations.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/domain/migrations.ts src/domain/migrations.test.ts
  git commit -m "$(cat <<'EOF'
  feat(domain): add migrateProject with version and validity errors

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 9: Database, project repository, blob store

**Files:**
- Create: `src/storage/db.ts`, `src/storage/blob-store.ts`, `src/storage/project-repo.ts`
- Test: `src/storage/db.test.ts`, `src/storage/blob-store.test.ts`, `src/storage/project-repo.test.ts`

**Interfaces:**
- Consumes: `Project` from `src/domain/types.ts` (Task 4); `migrateProject` from `src/domain/migrations.ts` (Task 8); `createProject`, `createScene` from `src/domain/factories.ts` (Task 4) in tests only.
- Produces:

  ```ts
  // src/storage/db.ts
  export type BlobKind = "glb" | "thumb" | "clip";
  export type BlobRecord = { key: string; projectId: string; kind: BlobKind; bytes: number; blob: Blob };
  export const DB_NAME = "sb3d";
  export function openDb(): Promise<IDBPDatabase<Sb3dSchema>>;
  export function resetDbForTests(): Promise<void>;

  // src/storage/blob-store.ts
  export function putBlob(rec: { key: string; projectId: string; kind: BlobKind; blob: Blob }): Promise<void>;
  export function getBlob(key: string): Promise<Blob | null>;
  export function deleteBlob(key: string): Promise<void>;
  export function deleteProjectBlobs(projectId: string): Promise<void>;

  // src/storage/project-repo.ts
  export type ProjectSummary = { id: string; name: string; updatedAt: string; sceneCount: number };
  export function listProjects(): Promise<ProjectSummary[]>;
  export function loadProject(id: string): Promise<Project | null>;
  export function saveProject(project: Project): Promise<void>;
  export function deleteProject(id: string): Promise<void>;
  ```

  `idb` and `fake-indexeddb` are new dependencies, installed as the first step. `idb`'s `openDB<DBTypes extends DBSchema>` and `IDBPDatabase<DBTypes>` types were checked directly against an installed copy of the package (7.1.1, in another local project; 8.0.3 is the current release on the npm registry, confirmed with `npm view idb version`) rather than guessed: `DBSchema` stores are declared as `{ key, value, indexes? }` per store name, `openDB(name, version, { upgrade(db) { ... } })` creates object stores and indexes inside the `upgrade` callback, and a store's key type comes from `keyPath` at creation time, not from the schema declaration. That shape is stable across the 7.x install checked here and the 8.x release being installed, so the code below is written directly against it. Blobs round-trip through `fake-indexeddb` in this plan by asserting on `size`, `type` and `await blob.text()`, not on `toEqual`/reference equality of the `Blob` object itself: `fake-indexeddb`'s structured-clone implementation is not guaranteed to hand back the exact same `Blob` subclass or an object that passes strict deep-equality, only one with the same bytes and metadata, so the tests below only ever assert on those.

- [ ] **Install idb and fake-indexeddb.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  npm install idb
  npm install -D fake-indexeddb
  ```

  Expected: both exit 0. `package.json` gains `"idb": "^8.0.3"` under `dependencies` and `"fake-indexeddb": "^6.2.5"` under `devDependencies` (or whatever the current releases are at install time), `0 vulnerabilities`.

- [ ] **Write the failing test for the database.**

  `src/storage/db.test.ts`:

  ```ts
  // @vitest-environment node
  import "fake-indexeddb/auto";
  import { beforeEach, describe, expect, it } from "vitest";
  import { DB_NAME, openDb, resetDbForTests } from "@/storage/db";

  beforeEach(async () => {
    await resetDbForTests();
  });

  describe("openDb", () => {
    it("opens a database named sb3d with the projects, blobs and meta stores", async () => {
      const db = await openDb();
      expect(db.name).toBe(DB_NAME);
      expect(Array.from(db.objectStoreNames).sort()).toEqual(["blobs", "meta", "projects"]);
    });

    it("the blobs store has a byProject index", async () => {
      const db = await openDb();
      const tx = db.transaction("blobs", "readonly");
      expect(Array.from(tx.store.indexNames)).toEqual(["byProject"]);
    });
  });
  ```

  `fake-indexeddb/auto` is a side-effect-only import that patches `globalThis.indexedDB` before any test body runs; it is imported once per test file that touches the database, since Vitest gives each test file its own module scope.

- [ ] **Run it and confirm it fails.**

  ```
  npx vitest run src/storage/db.test.ts
  ```

  Expected: fails to resolve `@/storage/db`, because `src/storage/db.ts` does not exist yet.

- [ ] **Write `src/storage/db.ts`.**

  ```ts
  import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
  import type { Project } from "@/domain/types";

  export type BlobKind = "glb" | "thumb" | "clip";
  export type BlobRecord = { key: string; projectId: string; kind: BlobKind; bytes: number; blob: Blob };

  export interface Sb3dSchema extends DBSchema {
    projects: { key: string; value: Project };
    blobs: { key: string; value: BlobRecord; indexes: { byProject: string } };
    meta: { key: string; value: unknown };
  }

  export const DB_NAME = "sb3d";
  const DB_VERSION = 1;

  let dbPromise: Promise<IDBPDatabase<Sb3dSchema>> | null = null;

  /** Opens (and lazily creates) the app's single IndexedDB database. Safe to call repeatedly: the same connection is reused. */
  export function openDb(): Promise<IDBPDatabase<Sb3dSchema>> {
    if (!dbPromise) {
      dbPromise = openDB<Sb3dSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          db.createObjectStore("projects", { keyPath: "id" });
          const blobs = db.createObjectStore("blobs", { keyPath: "key" });
          blobs.createIndex("byProject", "projectId");
          db.createObjectStore("meta");
        },
      });
    }
    return dbPromise;
  }

  /** Closes and deletes the database. Test-only: gives each test a clean database. */
  export async function resetDbForTests(): Promise<void> {
    if (dbPromise) {
      const db = await dbPromise;
      db.close();
      dbPromise = null;
    }
    await deleteDB(DB_NAME);
  }
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npx vitest run src/storage/db.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 2 passed (2)`, exit code 0.

- [ ] **Commit the database.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add package.json package-lock.json src/storage/db.ts src/storage/db.test.ts
  git commit -m "$(cat <<'EOF'
  feat(storage): add openDb with the projects, blobs and meta stores

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Write the failing test for the blob store.**

  `src/storage/blob-store.test.ts`:

  ```ts
  // @vitest-environment node
  import "fake-indexeddb/auto";
  import { beforeEach, describe, expect, it } from "vitest";
  import { deleteBlob, deleteProjectBlobs, getBlob, putBlob } from "@/storage/blob-store";
  import { resetDbForTests } from "@/storage/db";

  beforeEach(async () => {
    await resetDbForTests();
  });

  function makeBlob(text: string, type: string): Blob {
    return new Blob([text], { type });
  }

  describe("putBlob and getBlob", () => {
    it("round trips a blob's bytes and type", async () => {
      const blob = makeBlob("hello world", "text/plain");
      await putBlob({ key: "thumb:shot_1:abc", projectId: "proj_1", kind: "thumb", blob });

      const loaded = await getBlob("thumb:shot_1:abc");
      expect(loaded).not.toBeNull();
      expect(loaded!.type).toBe("text/plain");
      expect(loaded!.size).toBe(blob.size);
      await expect(loaded!.text()).resolves.toBe("hello world");
    });

    it("returns null for a missing key", async () => {
      expect(await getBlob("does-not-exist")).toBeNull();
    });
  });

  describe("deleteBlob", () => {
    it("removes a stored blob", async () => {
      await putBlob({ key: "clip:1", projectId: "proj_1", kind: "clip", blob: makeBlob("x", "video/mp4") });
      await deleteBlob("clip:1");
      expect(await getBlob("clip:1")).toBeNull();
    });
  });

  describe("deleteProjectBlobs", () => {
    it("removes every blob for a project but leaves another project's blobs", async () => {
      await putBlob({ key: "thumb:a", projectId: "proj_1", kind: "thumb", blob: makeBlob("a", "image/png") });
      await putBlob({ key: "thumb:b", projectId: "proj_1", kind: "thumb", blob: makeBlob("b", "image/png") });
      await putBlob({ key: "thumb:c", projectId: "proj_2", kind: "thumb", blob: makeBlob("c", "image/png") });

      await deleteProjectBlobs("proj_1");

      expect(await getBlob("thumb:a")).toBeNull();
      expect(await getBlob("thumb:b")).toBeNull();
      expect(await getBlob("thumb:c")).not.toBeNull();
    });
  });
  ```

- [ ] **Run it and confirm it fails.**

  ```
  npx vitest run src/storage/blob-store.test.ts
  ```

  Expected: fails to resolve `@/storage/blob-store`, because `src/storage/blob-store.ts` does not exist yet.

- [ ] **Write `src/storage/blob-store.ts`.**

  ```ts
  import { openDb } from "@/storage/db";
  import type { BlobKind } from "@/storage/db";

  export async function putBlob(rec: { key: string; projectId: string; kind: BlobKind; blob: Blob }): Promise<void> {
    const db = await openDb();
    await db.put("blobs", { key: rec.key, projectId: rec.projectId, kind: rec.kind, bytes: rec.blob.size, blob: rec.blob });
  }

  export async function getBlob(key: string): Promise<Blob | null> {
    const db = await openDb();
    const record = await db.get("blobs", key);
    return record ? record.blob : null;
  }

  export async function deleteBlob(key: string): Promise<void> {
    const db = await openDb();
    await db.delete("blobs", key);
  }

  export async function deleteProjectBlobs(projectId: string): Promise<void> {
    const db = await openDb();
    const keys = await db.getAllKeysFromIndex("blobs", "byProject", projectId);
    await Promise.all(keys.map((key) => db.delete("blobs", key)));
  }
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npx vitest run src/storage/blob-store.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 4 passed (4)`, exit code 0.

- [ ] **Commit the blob store.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/storage/blob-store.ts src/storage/blob-store.test.ts
  git commit -m "$(cat <<'EOF'
  feat(storage): add the blob store

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Write the failing test for the project repository.**

  `src/storage/project-repo.test.ts`:

  ```ts
  // @vitest-environment node
  import "fake-indexeddb/auto";
  import { beforeEach, describe, expect, it } from "vitest";
  import { createProject, createScene } from "@/domain/factories";
  import { getBlob, putBlob } from "@/storage/blob-store";
  import { resetDbForTests } from "@/storage/db";
  import { deleteProject, listProjects, loadProject, saveProject } from "@/storage/project-repo";

  beforeEach(async () => {
    await resetDbForTests();
  });

  describe("saveProject and loadProject", () => {
    it("round trips a project", async () => {
      const project = createProject("Heist");
      await saveProject(project);
      const loaded = await loadProject(project.id);
      expect(loaded).toEqual(project);
    });

    it("returns null for a missing id", async () => {
      expect(await loadProject("does-not-exist")).toBeNull();
    });
  });

  describe("listProjects", () => {
    it("lists projects newest first, with sceneCount", async () => {
      const older = { ...createProject("Older"), updatedAt: "2026-01-01T00:00:00.000Z" };
      const newer = { ...createProject("Newer"), updatedAt: "2026-02-01T00:00:00.000Z" };
      newer.scenes.push(createScene("Scene A"), createScene("Scene B"));
      await saveProject(older);
      await saveProject(newer);

      const summaries = await listProjects();
      expect(summaries).toEqual([
        { id: newer.id, name: "Newer", updatedAt: newer.updatedAt, sceneCount: 2 },
        { id: older.id, name: "Older", updatedAt: older.updatedAt, sceneCount: 0 },
      ]);
    });
  });

  describe("deleteProject", () => {
    it("removes the project document and its blobs, but not another project's blobs", async () => {
      const projectA = createProject("A");
      const projectB = createProject("B");
      await saveProject(projectA);
      await saveProject(projectB);
      await putBlob({ key: "thumb:a", projectId: projectA.id, kind: "thumb", blob: new Blob(["a"], { type: "image/png" }) });
      await putBlob({ key: "thumb:b", projectId: projectB.id, kind: "thumb", blob: new Blob(["b"], { type: "image/png" }) });

      await deleteProject(projectA.id);

      expect(await loadProject(projectA.id)).toBeNull();
      expect(await loadProject(projectB.id)).not.toBeNull();
      expect(await getBlob("thumb:a")).toBeNull();
      expect(await getBlob("thumb:b")).not.toBeNull();
    });
  });
  ```

- [ ] **Run it and confirm it fails.**

  ```
  npx vitest run src/storage/project-repo.test.ts
  ```

  Expected: fails to resolve `@/storage/project-repo`, because `src/storage/project-repo.ts` does not exist yet.

- [ ] **Write `src/storage/project-repo.ts`.**

  ```ts
  import { migrateProject } from "@/domain/migrations";
  import type { Project } from "@/domain/types";
  import { deleteProjectBlobs } from "@/storage/blob-store";
  import { openDb } from "@/storage/db";

  export type ProjectSummary = { id: string; name: string; updatedAt: string; sceneCount: number };

  export async function listProjects(): Promise<ProjectSummary[]> {
    const db = await openDb();
    const all = await db.getAll("projects");
    return all
      .map((project) => ({
        id: project.id,
        name: project.name,
        updatedAt: project.updatedAt,
        sceneCount: project.scenes.length,
      }))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  }

  export async function loadProject(id: string): Promise<Project | null> {
    const db = await openDb();
    const raw = await db.get("projects", id);
    if (raw === undefined) {
      return null;
    }
    return migrateProject(raw);
  }

  export async function saveProject(project: Project): Promise<void> {
    const db = await openDb();
    await db.put("projects", project);
  }

  export async function deleteProject(id: string): Promise<void> {
    const db = await openDb();
    await db.delete("projects", id);
    await deleteProjectBlobs(id);
  }
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npx vitest run src/storage/project-repo.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 4 passed (4)`, exit code 0.

- [ ] **Commit the project repository.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/storage/project-repo.ts src/storage/project-repo.test.ts
  git commit -m "$(cat <<'EOF'
  feat(storage): add the project repository

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 10: JSON export and import

**Files:**
- Create: `src/storage/export-import.ts`
- Test: `src/storage/export-import.test.ts`

**Interfaces:**
- Consumes: `migrateProject`, `ProjectInvalidError`, `ProjectVersionError` from `src/domain/migrations.ts` (Task 8); `newId` from `src/domain/ids.ts` (Task 4); `Project`, `Scene` from `src/domain/types.ts` (Task 4); `createPrimitive`, `createProject`, `createScene`, `createShot` from `src/domain/factories.ts` (Task 4) in the test only.
- Produces:

  ```ts
  export function exportProjectJson(project: Project): Blob;
  export function exportFileName(project: Project): string;
  export function importProjectJson(file: Blob): Promise<Project>;
  ```

  No new dependency is needed: this file only uses `Blob`, `JSON` and the domain layer already built. Per the plan contract's requirements, `importProjectJson` parses the file's JSON (a parse failure raises `ProjectInvalidError`), runs it through `migrateProject`, strips every `shot.thumb`, assigns a fresh id with `newId()`, and sets `createdAt`/`updatedAt` to now; it never calls `saveProject`. The Task List's shorthand ("export then import yields a document equal to the original apart from id") is read together with that more detailed requirement and with the design spec's own S1 "Done when" item 5 ("the copy equals the original apart from its project id, blob keys and timestamps"): the round-trip test below asserts equality apart from `id`, `createdAt` and `updatedAt`, not `id` alone.

- [ ] **Write the failing test.**

  `src/storage/export-import.test.ts`:

  ```ts
  // @vitest-environment node
  import { describe, expect, it } from "vitest";
  import { createPrimitive, createProject, createScene, createShot } from "@/domain/factories";
  import { ProjectInvalidError, ProjectVersionError } from "@/domain/migrations";
  import type { Project } from "@/domain/types";
  import { exportFileName, exportProjectJson, importProjectJson } from "@/storage/export-import";

  function buildProject(): Project {
    const project = createProject("Heist Night");
    const scene = createScene("Warehouse");
    scene.set.objects.push(createPrimitive("box"));
    scene.shots.push(createShot("Shot 01"));
    project.scenes.push(scene);
    return project;
  }

  describe("exportProjectJson", () => {
    it("produces an application/json blob with every shot.thumb stripped", async () => {
      const project = buildProject();
      project.scenes[0].shots[0].thumb = { blobKey: "thumb:1", stateHash: "abc" };

      const blob = exportProjectJson(project);
      expect(blob.type).toBe("application/json");

      const text = await blob.text();
      const parsed = JSON.parse(text);
      expect(parsed.scenes[0].shots[0].thumb).toBeUndefined();
    });
  });

  describe("exportFileName", () => {
    it("slugs the project name", () => {
      const project = createProject("My Film: Take 2");
      expect(exportFileName(project)).toBe("my-film-take-2.sb3d.json");
    });
  });

  describe("importProjectJson", () => {
    it("round trips a project, equal to the original apart from id, createdAt and updatedAt", async () => {
      const project = buildProject();
      const exported = exportProjectJson(project);

      const imported = await importProjectJson(exported);

      expect(imported.id).not.toBe(project.id);
      const { id, createdAt, updatedAt, ...rest } = imported;
      const { id: originalId, createdAt: originalCreatedAt, updatedAt: originalUpdatedAt, ...originalRest } = project;
      expect(rest).toEqual(originalRest);
    });

    it("strips thumb fields on import even if present in the file", async () => {
      const project = buildProject();
      project.scenes[0].shots[0].thumb = { blobKey: "thumb:1", stateHash: "abc" };
      const fileWithThumb = new Blob([JSON.stringify(project)], { type: "application/json" });

      const imported = await importProjectJson(fileWithThumb);
      expect(imported.scenes[0].shots[0].thumb).toBeUndefined();
    });

    it("rejects a newer schemaVersion with ProjectVersionError", async () => {
      const project = buildProject();
      const newer = { ...project, schemaVersion: 2 };
      const file = new Blob([JSON.stringify(newer)], { type: "application/json" });

      await expect(importProjectJson(file)).rejects.toThrow(ProjectVersionError);
    });

    it("rejects malformed JSON with ProjectInvalidError", async () => {
      const file = new Blob(["{not valid json"], { type: "application/json" });
      await expect(importProjectJson(file)).rejects.toThrow(ProjectInvalidError);
    });
  });
  ```

- [ ] **Run it and confirm it fails.**

  ```
  npx vitest run src/storage/export-import.test.ts
  ```

  Expected: fails to resolve `@/storage/export-import`, because `src/storage/export-import.ts` does not exist yet.

- [ ] **Write `src/storage/export-import.ts`.**

  ```ts
  import { migrateProject, ProjectInvalidError } from "@/domain/migrations";
  import { newId } from "@/domain/ids";
  import type { Project, Scene } from "@/domain/types";

  function stripThumbs(scenes: Scene[]): Scene[] {
    return scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((shot) => {
        const { thumb, ...rest } = shot;
        return rest;
      }),
    }));
  }

  /** Serializes a project to a downloadable JSON blob, with every shot.thumb stripped (thumbnails are regenerated, not portable). */
  export function exportProjectJson(project: Project): Blob {
    const stripped: Project = { ...project, scenes: stripThumbs(project.scenes) };
    return new Blob([JSON.stringify(stripped, null, 2)], { type: "application/json" });
  }

  function slugify(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "project";
  }

  export function exportFileName(project: Project): string {
    return `${slugify(project.name)}.sb3d.json`;
  }

  /**
   * Reads a project file: parses its JSON, migrates and validates it, strips
   * every shot.thumb, and assigns a fresh project id and fresh
   * createdAt/updatedAt timestamps, so an import always creates a copy
   * rather than colliding with the original. Never saves; the caller decides
   * when to persist the result.
   */
  export async function importProjectJson(file: Blob): Promise<Project> {
    const text = await file.text();
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new ProjectInvalidError("The file is not valid JSON.");
    }

    const migrated = migrateProject(raw);
    const now = new Date().toISOString();
    return {
      ...migrated,
      id: newId(),
      scenes: stripThumbs(migrated.scenes),
      createdAt: now,
      updatedAt: now,
    };
  }
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npx vitest run src/storage/export-import.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 6 passed (6)`, exit code 0.

- [ ] **Commit export-import.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/storage/export-import.ts src/storage/export-import.test.ts
  git commit -m "$(cat <<'EOF'
  feat(storage): add JSON export and import

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 11: Autosaver and project lock

**Files:**
- Create: `src/storage/autosave.ts`, `src/storage/project-lock.ts`
- Test: `src/storage/autosave.test.ts`, `src/storage/project-lock.test.ts`

**Interfaces:**
- Consumes: `Project` from `src/domain/types.ts` (Task 4); `createProject` from `src/domain/factories.ts` (Task 4) in the autosave test only.
- Produces:

  ```ts
  // src/storage/autosave.ts
  export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
  export function createAutosaver(opts: {
    save: (project: Project) => Promise<void>;
    delayMs?: number;
    onStatus: (status: SaveStatus, failures: number) => void;
  }): { schedule(project: Project): void; flush(): Promise<void>; dispose(): void };

  // src/storage/project-lock.ts
  export function acquireProjectLock(projectId: string): Promise<{ readOnly: boolean; release: () => void }>;
  ```

  Neither file is a port. `createAutosaver`'s debounce follows the same `setTimeout`/`clearTimeout` shape as Film Planner's `createStageEditorStore` (`film-planner/src/stage/store.ts`, read during research), whose own test (`store.test.ts`) is the source for this plan's `vi.useFakeTimers()` / `vi.advanceTimersByTimeAsync()` pattern; the backoff-retry logic on top of that debounce is new. On "retry with backoff 1 s, 2 s, 4 s; status error after 3 consecutive failures": the implementation below schedules a retry after `1000ms` following the first failure and after `2000ms` following the second, and on the third consecutive failure it reports `"error"` and stops scheduling further automatic retries (per "keeps retrying on the next schedule", read as the caller's next `schedule()` call, not an unbounded background retry loop). This exercises exactly the delays needed to reach `failures: 3`; the `4000ms` entry is kept in the backoff table for a possible future change that raises the failure cap, but the current 3-failure cap means it is not reached in normal operation. This is flagged as an interpretation, not a literal reading, since a reading that used all three delays before reporting `failures: 3` is not self-consistent (see the note below the code).

- [ ] **Write the failing test for the autosaver.**

  `src/storage/autosave.test.ts`:

  ```ts
  // @vitest-environment node
  import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
  import { createProject } from "@/domain/factories";
  import { createAutosaver } from "@/storage/autosave";

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createAutosaver", () => {
    it("debounces: three quick schedule calls produce one save with the last project after 500 ms", async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const onStatus = vi.fn();
      const autosaver = createAutosaver({ save, onStatus });

      const projectA = createProject("A");
      const projectB = createProject("B");
      const projectC = createProject("C");

      autosaver.schedule(projectA);
      await vi.advanceTimersByTimeAsync(100);
      autosaver.schedule(projectB);
      await vi.advanceTimersByTimeAsync(100);
      autosaver.schedule(projectC);
      await vi.advanceTimersByTimeAsync(500);

      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(projectC);
    });

    it("flush saves immediately without waiting for the debounce", async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const onStatus = vi.fn();
      const autosaver = createAutosaver({ save, onStatus });
      const project = createProject("Flush me");

      autosaver.schedule(project);
      await autosaver.flush();

      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(project);
      expect(onStatus).toHaveBeenCalledWith("saved", 0);
    });

    it("retries a failing save at 1 s then 2 s, and reports error with failures: 3", async () => {
      const save = vi.fn().mockRejectedValue(new Error("disk full"));
      const onStatus = vi.fn();
      const autosaver = createAutosaver({ save, onStatus });
      const project = createProject("Doomed");

      autosaver.schedule(project);
      await vi.advanceTimersByTimeAsync(500); // debounce elapses, attempt 1 fails
      expect(save).toHaveBeenCalledTimes(1);
      expect(onStatus).toHaveBeenLastCalledWith("pending", 1);

      await vi.advanceTimersByTimeAsync(1000); // backoff 1 s, attempt 2 fails
      expect(save).toHaveBeenCalledTimes(2);
      expect(onStatus).toHaveBeenLastCalledWith("pending", 2);

      await vi.advanceTimersByTimeAsync(2000); // backoff 2 s, attempt 3 fails
      expect(save).toHaveBeenCalledTimes(3);
      expect(onStatus).toHaveBeenLastCalledWith("error", 3);
    });

    it("a later successful schedule resets failures to 0 and reports saved", async () => {
      const save = vi.fn().mockRejectedValue(new Error("disk full"));
      const onStatus = vi.fn();
      const autosaver = createAutosaver({ save, onStatus });
      const project = createProject("Recovers");

      autosaver.schedule(project);
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      expect(onStatus).toHaveBeenLastCalledWith("error", 3);

      save.mockResolvedValue(undefined);
      autosaver.schedule(project);
      await vi.advanceTimersByTimeAsync(500);

      expect(onStatus).toHaveBeenLastCalledWith("saved", 0);
    });
  });
  ```

- [ ] **Run it and confirm it fails.**

  ```
  npx vitest run src/storage/autosave.test.ts
  ```

  Expected: fails to resolve `@/storage/autosave`, because `src/storage/autosave.ts` does not exist yet.

- [ ] **Write `src/storage/autosave.ts`.**

  ```ts
  import type { Project } from "@/domain/types";

  export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

  // Delay before a retry, indexed by the consecutive-failure count that just
  // occurred (RETRY_DELAYS_MS[0] follows the 1st failure). The autosaver
  // stops scheduling automatic retries once MAX_CONSECUTIVE_FAILURES is
  // reached, reporting "error" instead and waiting for the caller's next
  // schedule() call; reaching that cap only ever consumes the first two
  // entries. The third entry is kept for a possible future higher cap.
  const RETRY_DELAYS_MS = [1000, 2000, 4000];
  const MAX_CONSECUTIVE_FAILURES = 3;

  export function createAutosaver(opts: {
    save: (project: Project) => Promise<void>;
    delayMs?: number;
    onStatus: (status: SaveStatus, failures: number) => void;
  }): { schedule(project: Project): void; flush(): Promise<void>; dispose(): void } {
    const delayMs = opts.delayMs ?? 500;
    let pending: Project | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;
    let disposed = false;

    function clearDebounce() {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    }

    function clearRetry() {
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    }

    async function attempt(project: Project): Promise<void> {
      opts.onStatus("saving", failures);
      try {
        await opts.save(project);
        failures = 0;
        pending = null;
        if (!disposed) {
          opts.onStatus("saved", 0);
        }
      } catch {
        failures += 1;
        if (disposed) {
          return;
        }
        if (failures >= MAX_CONSECUTIVE_FAILURES) {
          opts.onStatus("error", failures);
          return;
        }
        opts.onStatus("pending", failures);
        const delay = RETRY_DELAYS_MS[failures - 1];
        retryTimer = setTimeout(() => {
          retryTimer = null;
          if (pending !== null) {
            void attempt(pending);
          }
        }, delay);
      }
    }

    return {
      schedule(project: Project) {
        if (disposed) {
          return;
        }
        pending = project;
        failures = 0;
        opts.onStatus("pending", 0);
        clearDebounce();
        clearRetry();
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          if (pending !== null) {
            void attempt(pending);
          }
        }, delayMs);
      },
      async flush() {
        if (disposed) {
          return;
        }
        clearDebounce();
        clearRetry();
        if (pending !== null) {
          await attempt(pending);
        }
      },
      dispose() {
        disposed = true;
        clearDebounce();
        clearRetry();
      },
    };
  }
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npx vitest run src/storage/autosave.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 4 passed (4)`, exit code 0.

- [ ] **Commit the autosaver.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/storage/autosave.ts src/storage/autosave.test.ts
  git commit -m "$(cat <<'EOF'
  feat(storage): add createAutosaver with debounce and backoff retry

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Write the failing test for the project lock.**

  `src/storage/project-lock.test.ts`:

  ```ts
  // @vitest-environment node
  import { afterEach, describe, expect, it, vi } from "vitest";
  import { acquireProjectLock } from "@/storage/project-lock";

  type FakeLock = { name: string };
  type FakeLockCallback = (lock: FakeLock | null) => Promise<void>;

  /** A minimal single-holder navigator.locks stand-in: real APIs to touch it do not exist under Node or jsdom, so this stub implements just the ifAvailable semantics acquireProjectLock relies on. */
  function makeFakeLockManager() {
    const held = new Set<string>();
    return {
      async request(name: string, options: { ifAvailable?: boolean }, callback: FakeLockCallback): Promise<void> {
        if (held.has(name) && options.ifAvailable) {
          await callback(null);
          return;
        }
        held.add(name);
        try {
          await callback({ name });
        } finally {
          held.delete(name);
        }
      },
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("acquireProjectLock", () => {
    it("the first caller gets readOnly: false", async () => {
      vi.stubGlobal("navigator", { locks: makeFakeLockManager() });
      const lock = await acquireProjectLock("proj_1");
      expect(lock.readOnly).toBe(false);
      lock.release();
    });

    it("a second caller while the lock is held gets readOnly: true", async () => {
      vi.stubGlobal("navigator", { locks: makeFakeLockManager() });
      const first = await acquireProjectLock("proj_1");
      const second = await acquireProjectLock("proj_1");
      expect(first.readOnly).toBe(false);
      expect(second.readOnly).toBe(true);
      first.release();
    });

    it("with no Web Locks support, readOnly is false", async () => {
      vi.stubGlobal("navigator", {});
      const lock = await acquireProjectLock("proj_1");
      expect(lock.readOnly).toBe(false);
    });
  });
  ```

  `vi.stubGlobal` is used instead of assigning `globalThis.navigator` directly: Node 22's own `navigator` global is defined as a getter with no setter, so a plain assignment throws under the strict mode every ES module runs in. `vi.stubGlobal` redefines the property instead, and `vi.unstubAllGlobals()` in `afterEach` restores it.

- [ ] **Run it and confirm it fails.**

  ```
  npx vitest run src/storage/project-lock.test.ts
  ```

  Expected: fails to resolve `@/storage/project-lock`, because `src/storage/project-lock.ts` does not exist yet.

- [ ] **Write `src/storage/project-lock.ts`.**

  ```ts
  /**
   * Requests a Web Lock scoped to one project id. The first caller in any
   * tab gets readOnly: false and holds the lock until release() is called.
   * A second concurrent caller for the same project id gets readOnly: true,
   * since ifAvailable makes the browser hand back null immediately instead
   * of queuing. Without Web Locks support at all, every caller gets
   * readOnly: false: there is no way to detect a second tab.
   */
  export function acquireProjectLock(
    projectId: string,
  ): Promise<{ readOnly: boolean; release: () => void }> {
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    if (!locks) {
      return Promise.resolve({ readOnly: false, release: () => {} });
    }

    return new Promise((resolve) => {
      let release: () => void = () => {};
      const held = new Promise<void>((resolveHeld) => {
        release = resolveHeld;
      });

      void locks.request(`sb3d-project:${projectId}`, { ifAvailable: true }, (lock) => {
        if (lock === null) {
          resolve({ readOnly: true, release: () => {} });
          return Promise.resolve();
        }
        resolve({ readOnly: false, release });
        return held;
      });
    });
  }
  ```

- [ ] **Run it and confirm it passes.**

  ```
  npx vitest run src/storage/project-lock.test.ts
  ```

  Expected: `Test Files 1 passed (1)`, `Tests 3 passed (3)`, exit code 0.

- [ ] **Commit the project lock.**

  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d"
  git add src/storage/project-lock.ts src/storage/project-lock.test.ts
  git commit -m "$(cat <<'EOF'
  feat(storage): add acquireProjectLock for single-writer tabs

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 12: Document store

**Files:**
- Create: `src/state/document-store.ts`
- Create: `src/state/document-store.test.ts`

**Interfaces:**
- Consumes: `Project` from `src/domain/types.ts` (Task 4), `SaveStatus` from `src/storage/autosave.ts` (Task 11), `createProject` from `src/domain/factories.ts` (Task 4, tests only).
- Produces:
  ```ts
  export type DocumentState = {
    project: Project | null; readOnly: boolean;
    saveStatus: SaveStatus; saveFailures: number;
    canUndo: boolean; canRedo: boolean;
    load(project: Project, opts?: { readOnly?: boolean }): void;
    close(): void;
    apply(recipe: (draft: Project) => void): void;
    applyTransient(recipe: (draft: Project) => void): void;
    undo(): void; redo(): void;
  };
  export const useDocumentStore: UseBoundStore<StoreApi<DocumentState>>;
  export function setAutosaver(a: { schedule(p: Project): void } | null): void;
  ```

History is two stacks of `{ patches, inversePatches }` (Immer patch pairs from `produceWithPatches`), capped at 100 entries, held in two module-level arrays outside the Zustand state (never persisted, never serialized). `apply` and `undo`/`redo` are the only things that touch them. `saveStatus`/`saveFailures` have no setter method here: `useDocumentStore` is a full Zustand store, so `ProjectLayout` (Task 19) updates them directly with `useDocumentStore.setState({ saveStatus, saveFailures })` from the autosaver's `onStatus` callback. This task does not need to call that itself.

- [ ] **Install the state libraries.** These packages are imported by this task and by later ones, and no earlier task installs them.

  ```bash
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npm install zustand immer
  ```

  Expected: `zustand` and `immer` appear under `dependencies` in `package.json`, and `npm run typecheck` still passes.

- [ ] Write the failing test file `src/state/document-store.test.ts`:
  ```ts
  import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

  import { createProject } from "@/domain/factories";
  import { setAutosaver, useDocumentStore } from "@/state/document-store";

  // The store's project/canUndo/canRedo live in Zustand state, but the undo
  // and redo stacks are module-level arrays outside it (so they never end up
  // in a persisted snapshot). close() clears both; every test starts from
  // close() plus a fresh autosaver so no test can see another test's history,
  // pending saves, or read-only flag.
  function resetStore() {
    setAutosaver(null);
    useDocumentStore.getState().close();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("useDocumentStore", () => {
    it("apply changes the project and sets canUndo", () => {
      useDocumentStore.getState().load(createProject("Test"));
      useDocumentStore.getState().apply((draft) => {
        draft.name = "Renamed";
      });
      const state = useDocumentStore.getState();
      expect(state.project?.name).toBe("Renamed");
      expect(state.canUndo).toBe(true);
    });

    it("undo then redo restore exact documents, including updatedAt", () => {
      useDocumentStore.getState().load(createProject("Test"));
      const beforeApply = useDocumentStore.getState().project!;

      vi.setSystemTime(new Date("2026-01-01T00:00:01.000Z"));
      useDocumentStore.getState().apply((draft) => {
        draft.name = "Renamed";
      });
      const afterApply = useDocumentStore.getState().project!;
      expect(afterApply.updatedAt).not.toBe(beforeApply.updatedAt);

      useDocumentStore.getState().undo();
      expect(useDocumentStore.getState().project).toEqual(beforeApply);

      useDocumentStore.getState().redo();
      expect(useDocumentStore.getState().project).toEqual(afterApply);
    });

    it("20 applies, 20 undos and 20 redos return to the same document", () => {
      useDocumentStore.getState().load(createProject("Test"));
      const original = useDocumentStore.getState().project!;

      for (let i = 1; i <= 20; i += 1) {
        vi.setSystemTime(new Date(2026, 0, 1, 0, 0, i));
        useDocumentStore.getState().apply((draft) => {
          draft.name = `v${i}`;
        });
      }
      const final = useDocumentStore.getState().project!;

      for (let i = 0; i < 20; i += 1) useDocumentStore.getState().undo();
      expect(useDocumentStore.getState().project).toEqual(original);

      for (let i = 0; i < 20; i += 1) useDocumentStore.getState().redo();
      expect(useDocumentStore.getState().project).toEqual(final);
    });

    it("caps history at 100 entries", () => {
      useDocumentStore.getState().load(createProject("Test"));
      for (let i = 1; i <= 105; i += 1) {
        vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0, i));
        useDocumentStore.getState().apply((draft) => {
          draft.name = `v${i}`;
        });
      }
      for (let i = 0; i < 100; i += 1) useDocumentStore.getState().undo();
      const state = useDocumentStore.getState();
      // 105 applies, capped at 100: the oldest 5 (v1..v5) fell off the
      // stack, so undoing all 100 remaining entries lands on v5, not v0.
      expect(state.project?.name).toBe("v5");
      expect(state.canUndo).toBe(false);

      useDocumentStore.getState().undo();
      expect(useDocumentStore.getState().project?.name).toBe("v5");
    });

    it("apply after undo clears redo", () => {
      useDocumentStore.getState().load(createProject("Test"));
      useDocumentStore.getState().apply((draft) => {
        draft.name = "A";
      });
      useDocumentStore.getState().undo();
      useDocumentStore.getState().apply((draft) => {
        draft.name = "B";
      });
      expect(useDocumentStore.getState().canRedo).toBe(false);
      useDocumentStore.getState().redo();
      expect(useDocumentStore.getState().project?.name).toBe("B");
    });

    it("applyTransient changes the document without adding history and without touching updatedAt", () => {
      useDocumentStore.getState().load(createProject("Test"));
      const before = useDocumentStore.getState().project!;
      useDocumentStore.getState().applyTransient((draft) => {
        draft.name = "Transient";
      });
      const after = useDocumentStore.getState().project!;
      expect(after.name).toBe("Transient");
      expect(after.updatedAt).toBe(before.updatedAt);
      expect(useDocumentStore.getState().canUndo).toBe(false);
      useDocumentStore.getState().undo();
      expect(useDocumentStore.getState().project?.name).toBe("Transient");
    });

    it("readOnly makes apply a no-op", () => {
      useDocumentStore.getState().load(createProject("Test"), { readOnly: true });
      useDocumentStore.getState().apply((draft) => {
        draft.name = "Renamed";
      });
      expect(useDocumentStore.getState().project?.name).toBe("Test");
      expect(useDocumentStore.getState().canUndo).toBe(false);
    });

    it("apply calls the autosaver's schedule", () => {
      const schedule = vi.fn();
      setAutosaver({ schedule });
      useDocumentStore.getState().load(createProject("Test"));
      useDocumentStore.getState().apply((draft) => {
        draft.name = "Renamed";
      });
      expect(schedule).toHaveBeenCalledTimes(1);
      expect(schedule.mock.calls[0][0].name).toBe("Renamed");
    });

    it("load clears history", () => {
      useDocumentStore.getState().load(createProject("Test"));
      useDocumentStore.getState().apply((draft) => {
        draft.name = "Renamed";
      });
      expect(useDocumentStore.getState().canUndo).toBe(true);
      useDocumentStore.getState().load(createProject("Fresh"));
      expect(useDocumentStore.getState().canUndo).toBe(false);
      useDocumentStore.getState().undo();
      expect(useDocumentStore.getState().project?.name).toBe("Fresh");
    });

    it("apply is a no-op when the recipe produces no patches", () => {
      useDocumentStore.getState().load(createProject("Test"));
      const before = useDocumentStore.getState().project;
      useDocumentStore.getState().apply(() => {
        // intentionally does nothing
      });
      expect(useDocumentStore.getState().project).toBe(before);
      expect(useDocumentStore.getState().canUndo).toBe(false);
    });
  });
  ```
- [ ] Run the test and confirm it fails because the module does not exist yet:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/document-store.test.ts
  ```
  Expected: fails with `Cannot find module '@/state/document-store'` (or equivalent resolution error), zero tests run.
- [ ] Write the minimal implementation `src/state/document-store.ts`:
  ```ts
  import { create } from "zustand";
  import { applyPatches, enablePatches, produce, produceWithPatches, type Patch } from "immer";

  import type { Project } from "@/domain/types";
  import type { SaveStatus } from "@/storage/autosave";

  enablePatches();

  const HISTORY_LIMIT = 100;

  type HistoryEntry = { patches: Patch[]; inversePatches: Patch[] };

  export type DocumentState = {
    project: Project | null;
    readOnly: boolean;
    saveStatus: SaveStatus;
    saveFailures: number;
    canUndo: boolean;
    canRedo: boolean;
    load(project: Project, opts?: { readOnly?: boolean }): void;
    close(): void;
    apply(recipe: (draft: Project) => void): void;
    applyTransient(recipe: (draft: Project) => void): void;
    undo(): void;
    redo(): void;
  };

  // Undo and redo live outside the Zustand state on purpose: they hold
  // Immer patches, not document data, and must never be persisted or show up
  // in a state snapshot. load() and close() are the only things that reset
  // them, which is also how tests get a clean slate between cases (see the
  // resetStore() helper in document-store.test.ts).
  let undoStack: HistoryEntry[] = [];
  let redoStack: HistoryEntry[] = [];
  let autosaver: { schedule(p: Project): void } | null = null;

  /** Wires apply/applyTransient/undo/redo to a real autosaver. Tests pass
   * null to silence saving, or a stub to assert on schedule() calls. */
  export function setAutosaver(a: { schedule(p: Project): void } | null): void {
    autosaver = a;
  }

  /** True when the only thing that changed is the updatedAt bump apply()
   * adds itself, meaning the caller's recipe made no real change. */
  function isUpdatedAtOnly(patches: Patch[]): boolean {
    return patches.length === 1 && patches[0].path.length === 1 && patches[0].path[0] === "updatedAt";
  }

  export const useDocumentStore = create<DocumentState>()((set, get) => ({
    project: null,
    readOnly: false,
    saveStatus: "idle",
    saveFailures: 0,
    canUndo: false,
    canRedo: false,

    load(project, opts) {
      undoStack = [];
      redoStack = [];
      set({
        project,
        readOnly: opts?.readOnly ?? false,
        saveStatus: "idle",
        saveFailures: 0,
        canUndo: false,
        canRedo: false,
      });
    },

    close() {
      undoStack = [];
      redoStack = [];
      set({
        project: null,
        readOnly: false,
        saveStatus: "idle",
        saveFailures: 0,
        canUndo: false,
        canRedo: false,
      });
    },

    apply(recipe) {
      const { project, readOnly } = get();
      if (readOnly || !project) return;
      // updatedAt is bumped inside this same produce call, not after it, so
      // the bump is part of the patch set and undo restores it too.
      const [next, patches, inversePatches] = produceWithPatches(project, (draft) => {
        recipe(draft);
        draft.updatedAt = new Date().toISOString();
      });
      if (patches.length === 0 || isUpdatedAtOnly(patches)) return;
      undoStack.push({ patches, inversePatches });
      if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
      redoStack = [];
      set({ project: next, canUndo: true, canRedo: false });
      autosaver?.schedule(next);
    },

    applyTransient(recipe) {
      const { project, readOnly } = get();
      if (readOnly || !project) return;
      const next = produce(project, recipe);
      set({ project: next });
      autosaver?.schedule(next);
    },

    undo() {
      const { project } = get();
      if (!project || undoStack.length === 0) return;
      const entry = undoStack.pop()!;
      const next = applyPatches(project, entry.inversePatches);
      redoStack.push(entry);
      set({ project: next, canUndo: undoStack.length > 0, canRedo: true });
      autosaver?.schedule(next);
    },

    redo() {
      const { project } = get();
      if (!project || redoStack.length === 0) return;
      const entry = redoStack.pop()!;
      const next = applyPatches(project, entry.patches);
      undoStack.push(entry);
      set({ project: next, canUndo: true, canRedo: redoStack.length > 0 });
      autosaver?.schedule(next);
    },
  }));
  ```
- [ ] Run the test again and confirm it passes:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/document-store.test.ts
  ```
  Expected: 10 passed, 0 failed.
- [ ] Commit:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/state/document-store.ts src/state/document-store.test.ts
  ```
  ```
  git commit -m "$(cat <<'EOF'
  feat: add the document store with undo and redo

  Zustand store holding the open Project, backed by Immer patches for
  undo/redo (capped at 100, held outside persisted state) and wired to an
  injectable autosaver.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 13: Object actions and the write target

**Files:**
- Create: `src/state/object-actions.ts`
- Create: `src/state/object-actions.test.ts`

**Interfaces:**
- Consumes: `Project`, `StageObject`, `ObjectOverride`, `PoseName` from `src/domain/types.ts` (Task 4); `createProject`, `createScene`, `createShot`, `createPrimitive` from `src/domain/factories.ts` (Task 4); `resolveScene` from `src/domain/resolve.ts` (Task 6, one test only); `useDocumentStore`, `setAutosaver` from `src/state/document-store.ts` (Task 12, one test only).
- Produces:
  ```ts
  export type EditTarget = { kind: "set" } | { kind: "shot"; shotId: string };
  export function addObject(draft: Project, sceneId: string, object: StageObject, opts?: { onlyInShotId?: string }): void;
  export function updateObject(draft: Project, sceneId: string, objectId: string, patch: ObjectOverride, target: EditTarget): void;
  export function renameObject(draft: Project, sceneId: string, objectId: string, name: string): void;
  export function deleteObject(draft: Project, sceneId: string, objectId: string): void;
  export function reconcileOnlyInShot(draft: Project, sceneId: string, objectId: string): void;
  ```

These are recipes: plain functions that mutate their `draft: Project` argument in place. They are designed to run inside `useDocumentStore`'s `apply`/`applyTransient` (which pass a real Immer draft), but for unit testing they can just as well mutate an ordinary object built with the domain factories, since they only ever do direct field assignment, never anything Immer-specific. Only the one test that needs undo (deleteObject) goes through `useDocumentStore`.

- [ ] Write the failing test file `src/state/object-actions.test.ts`, covering `addObject` and the plain-mutation half of `updateObject`:
  ```ts
  import { beforeEach, describe, expect, it } from "vitest";

  import { createPrimitive, createProject, createScene, createShot } from "@/domain/factories";
  import type { Project } from "@/domain/types";
  import { addObject, type EditTarget, updateObject } from "@/state/object-actions";

  let project: Project;
  let sceneId: string;

  beforeEach(() => {
    project = createProject("Test");
    const scene = createScene("Scene 1");
    project.scenes.push(scene);
    sceneId = scene.id;
  });

  describe("addObject", () => {
    it("adds the object to the set as given, with no options", () => {
      const obj = createPrimitive("box");
      addObject(project, sceneId, obj);
      expect(project.scenes[0].set.objects).toEqual([obj]);
    });

    it("with onlyInShotId stores default visible false plus a visible true override in that shot only", () => {
      const scene = project.scenes[0];
      const shot1 = createShot("Shot 01");
      const shot2 = createShot("Shot 02");
      scene.shots.push(shot1, shot2);
      const obj = createPrimitive("box");

      addObject(project, sceneId, obj, { onlyInShotId: shot1.id });

      const stored = scene.set.objects.find((o) => o.id === obj.id)!;
      expect(stored.visible).toBe(false);
      expect(shot1.overrides[obj.id]).toEqual({ visible: true });
      expect(shot2.overrides[obj.id]).toBeUndefined();
    });
  });

  describe("updateObject", () => {
    it("with the set target edits defaults seen by a shot without an override", () => {
      const scene = project.scenes[0];
      const obj = createPrimitive("box");
      scene.set.objects.push(obj);
      const shot = createShot("Shot 01");
      scene.shots.push(shot);
      const newTransform = { position: [2, 0, 0] as const, rotationY: 0.5, scale: 1 };

      updateObject(project, sceneId, obj.id, { transform: { ...newTransform, position: [2, 0, 0] } }, { kind: "set" });

      expect(scene.set.objects[0].transform.position).toEqual([2, 0, 0]);
      expect(scene.shots[0].overrides[obj.id]).toBeUndefined();
    });

    it("with a shot target writes overrides[objectId] and leaves the set and other shots unchanged", () => {
      const scene = project.scenes[0];
      const obj = createPrimitive("box");
      const originalTransform = obj.transform;
      scene.set.objects.push(obj);
      const shot1 = createShot("Shot 01");
      const shot2 = createShot("Shot 02");
      scene.shots.push(shot1, shot2);
      const target: EditTarget = { kind: "shot", shotId: shot1.id };

      updateObject(project, sceneId, obj.id, { transform: { position: [5, 0, 0], rotationY: 0, scale: 1 } }, target);

      expect(scene.set.objects[0].transform).toEqual(originalTransform);
      expect(shot1.overrides[obj.id]).toEqual({ transform: { position: [5, 0, 0], rotationY: 0, scale: 1 } });
      expect(shot2.overrides[obj.id]).toBeUndefined();
    });

    it("merges patches into an existing override", () => {
      const scene = project.scenes[0];
      const obj = createPrimitive("box");
      scene.set.objects.push(obj);
      const shot = createShot("Shot 01");
      shot.overrides[obj.id] = { visible: false };
      scene.shots.push(shot);

      updateObject(project, sceneId, obj.id, { transform: { position: [1, 0, 0], rotationY: 0, scale: 1 } }, { kind: "shot", shotId: shot.id });

      expect(shot.overrides[obj.id]).toEqual({
        visible: false,
        transform: { position: [1, 0, 0], rotationY: 0, scale: 1 },
      });
    });
  });
  ```
- [ ] Run the test and confirm it fails because the module does not exist yet:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/object-actions.test.ts
  ```
  Expected: fails with a module resolution error, zero tests run.
- [ ] Write the minimal implementation `src/state/object-actions.ts`, without `renameObject`, `deleteObject` or `reconcileOnlyInShot` yet, and with `updateObject`'s set branch not calling `reconcileOnlyInShot` yet (that wiring is added after the Reserved for Nick step below):
  ```ts
  import type { ObjectOverride, Project, StageObject } from "@/domain/types";

  export type EditTarget = { kind: "set" } | { kind: "shot"; shotId: string };

  export function addObject(
    draft: Project,
    sceneId: string,
    object: StageObject,
    opts?: { onlyInShotId?: string }
  ): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    if (opts?.onlyInShotId) {
      scene.set.objects.push({ ...object, visible: false });
      const shot = scene.shots.find((sh) => sh.id === opts.onlyInShotId);
      if (shot) {
        shot.overrides[object.id] = { ...shot.overrides[object.id], visible: true };
      }
      return;
    }
    scene.set.objects.push(object);
  }

  export function updateObject(
    draft: Project,
    sceneId: string,
    objectId: string,
    patch: ObjectOverride,
    target: EditTarget
  ): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    if (target.kind === "shot") {
      const shot = scene.shots.find((sh) => sh.id === target.shotId);
      if (!shot) return;
      shot.overrides[objectId] = { ...shot.overrides[objectId], ...patch };
      return;
    }

    const object = scene.set.objects.find((o) => o.id === objectId);
    if (!object) return;
    if (patch.transform) object.transform = patch.transform;
    if (patch.visible !== undefined) object.visible = patch.visible;
    if (patch.pose !== undefined && object.kind === "doll") object.pose = patch.pose;
  }
  ```
- [ ] Run the test again and confirm it passes:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/object-actions.test.ts
  ```
  Expected: 4 passed, 0 failed.
- [ ] Add failing tests for `renameObject` and `deleteObject` (the second goes through `useDocumentStore` so one `undo` can be asserted), appending to the same test file:
  ```ts
  import { createDoll } from "@/domain/factories";
  import { setAutosaver, useDocumentStore } from "@/state/document-store";
  import { deleteObject, renameObject } from "@/state/object-actions";

  describe("renameObject", () => {
    it("renames the object in the set", () => {
      const scene = project.scenes[0];
      const obj = createDoll();
      scene.set.objects.push(obj);
      renameObject(project, sceneId, obj.id, "Extra 1");
      expect(scene.set.objects[0].name).toBe("Extra 1");
    });
  });

  describe("deleteObject", () => {
    it("removes the object and its overrides in every shot, and one undo restores all of it", () => {
      const scene = project.scenes[0];
      const obj = createPrimitive("box");
      scene.set.objects.push(obj);
      const shot1 = createShot("Shot 01");
      shot1.overrides[obj.id] = { visible: false };
      const shot2 = createShot("Shot 02");
      shot2.overrides[obj.id] = { transform: { position: [1, 0, 0], rotationY: 0, scale: 1 } };
      scene.shots.push(shot1, shot2);

      setAutosaver(null);
      useDocumentStore.getState().load(project);
      useDocumentStore.getState().apply((draft) => {
        deleteObject(draft, sceneId, obj.id);
      });

      const afterDelete = useDocumentStore.getState().project!;
      const sceneAfter = afterDelete.scenes.find((s) => s.id === sceneId)!;
      expect(sceneAfter.set.objects.find((o) => o.id === obj.id)).toBeUndefined();
      expect(sceneAfter.shots[0].overrides[obj.id]).toBeUndefined();
      expect(sceneAfter.shots[1].overrides[obj.id]).toBeUndefined();

      useDocumentStore.getState().undo();
      const restored = useDocumentStore.getState().project!;
      const sceneRestored = restored.scenes.find((s) => s.id === sceneId)!;
      expect(sceneRestored.set.objects.find((o) => o.id === obj.id)).toEqual(obj);
      expect(sceneRestored.shots[0].overrides[obj.id]).toEqual({ visible: false });
      expect(sceneRestored.shots[1].overrides[obj.id]).toEqual({
        transform: { position: [1, 0, 0], rotationY: 0, scale: 1 },
      });
    });
  });
  ```
- [ ] Run and confirm the two new tests fail (`renameObject`/`deleteObject` are not exported yet):
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/object-actions.test.ts
  ```
  Expected: fails with `renameObject is not a function` / `deleteObject is not a function` (or a TypeScript error on import), the 4 earlier tests still pass.
- [ ] Add `renameObject` and `deleteObject` to `src/state/object-actions.ts` (append below `updateObject`):
  ```ts
  export function renameObject(draft: Project, sceneId: string, objectId: string, name: string): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const object = scene.set.objects.find((o) => o.id === objectId);
    if (!object) return;
    object.name = name;
  }

  export function deleteObject(draft: Project, sceneId: string, objectId: string): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    scene.set.objects = scene.set.objects.filter((o) => o.id !== objectId);
    for (const shot of scene.shots) {
      delete shot.overrides[objectId];
    }
  }
  ```
- [ ] Run again and confirm all 6 tests pass:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/object-actions.test.ts
  ```
  Expected: 6 passed, 0 failed.
- [ ] Commit this part on its own, since the Reserved for Nick step below pauses the task:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/state/object-actions.ts src/state/object-actions.test.ts
  ```
  ```
  git commit -m "$(cat <<'EOF'
  feat: add object actions for the set and the write target

  addObject, updateObject (set vs. shot target), renameObject and
  deleteObject as Immer recipes. deleteObject cleans up overrides in every
  shot in the same undoable step.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

**Reserved for Nick.**

- [ ] Add failing tests for the two unambiguous cases of `reconcileOnlyInShot`, appending to the test file:
  ```ts
  import { reconcileOnlyInShot } from "@/state/object-actions";

  describe("reconcileOnlyInShot", () => {
    it("leaves an ordinary object untouched", () => {
      const scene = project.scenes[0];
      const obj = createPrimitive("box"); // visible: true by default, no overrides anywhere
      scene.set.objects.push(obj);
      const shot = createShot("Shot 01");
      scene.shots.push(shot);

      reconcileOnlyInShot(project, sceneId, obj.id);

      expect(scene.set.objects[0].visible).toBe(true);
      expect(shot.overrides).toEqual({});
    });

    it("leaves an object untouched when it is not only in one shot", () => {
      const scene = project.scenes[0];
      const obj = createPrimitive("box");
      obj.visible = false;
      scene.set.objects.push(obj);
      // visible true in two shots, not one, so this is not the "only in
      // this shot" pattern reconcileOnlyInShot reacts to.
      const shot1 = createShot("Shot 01");
      shot1.overrides[obj.id] = { visible: true };
      const shot2 = createShot("Shot 02");
      shot2.overrides[obj.id] = { visible: true };
      scene.shots.push(shot1, shot2);

      reconcileOnlyInShot(project, sceneId, obj.id);

      expect(scene.set.objects[0].visible).toBe(false);
      expect(shot1.overrides[obj.id]).toEqual({ visible: true });
      expect(shot2.overrides[obj.id]).toEqual({ visible: true });
    });
  });
  ```
- [ ] Run and confirm it fails because `reconcileOnlyInShot` is not exported yet:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/object-actions.test.ts
  ```
  Expected: fails with `reconcileOnlyInShot is not a function` (or a TypeScript error on import), the 6 earlier tests still pass.
- [ ] Add the reserved stub to `src/state/object-actions.ts` (append at the end of the file), with its doc comment copied from the spec exactly and an empty body, the minimal implementation that satisfies both tests above:
  ```ts
  /**
   * An object added with "only in this shot" has default visible false and a
   * visible true override in one shot. Later, on the scene page, the user edits
   * it with the set target. This decides what that edit does to visibility.
   * Options: (a) leave visibility alone, so the object stays a one-shot object
   * that can be moved from the scene page only while "show hidden" is on;
   * (b) promote it, setting default visible true and removing the now redundant
   * override, because editing it from the scene page signals it belongs to the set.
   */
  export function reconcileOnlyInShot(draft: Project, sceneId: string, objectId: string): void {
    // Reserved for Nick. Empty until he picks (a) or (b) below and writes
    // the 5 to 10 line body. Both required tests pass against this no-op
    // because they cover the two cases where the answer does not depend on
    // which option he picks: an ordinary object, and an object that is not
    // in the single-shot "only in this shot" pattern at all.
  }
  ```
- [ ] Run again and confirm all 8 tests pass:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/object-actions.test.ts
  ```
  Expected: 8 passed, 0 failed.
- [ ] **STOP. Do not continue this task until Nick has written the body.** Ask him directly: "`reconcileOnlyInShot` in `src/state/object-actions.ts` needs its 5 to 10 line body. Option (a): leave visibility alone. The object keeps behaving as a one-shot object; editing its position from the scene page moves an object that is still invisible everywhere else, which can look like nothing happened until you check the shot it belongs to. Nothing about scope changes silently, but the set can end up with default-invisible objects that only make sense in light of one shot's override, which may or may not be surprising to find later. Option (b): promote it. Set the object's default `visible` to `true` and delete the now-redundant override in that shot. Editing from the scene page reads naturally as 'this is part of the set now,' and there is no leftover override to explain. The cost is a side effect the user did not ask for: nudging the object's position from the scene page also silently changes what every other shot renders, since the object switches from invisible-by-default to visible-by-default everywhere. Which one?" Once he answers, write the body he wants (still 5 to 10 lines, still passing the two tests above) before moving to the next step. Do not guess and do not pick one yourself.
- [ ] With Nick's body in place, wire `updateObject`'s set-target branch to call `reconcileOnlyInShot`. Show the complete, final `src/state/object-actions.ts` (the reserved function's body below is a placeholder for whichever 5 to 10 lines Nick wrote; do not replace it with your own guess):
  ```ts
  import type { ObjectOverride, Project, StageObject } from "@/domain/types";

  export type EditTarget = { kind: "set" } | { kind: "shot"; shotId: string };

  export function addObject(
    draft: Project,
    sceneId: string,
    object: StageObject,
    opts?: { onlyInShotId?: string }
  ): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    if (opts?.onlyInShotId) {
      scene.set.objects.push({ ...object, visible: false });
      const shot = scene.shots.find((sh) => sh.id === opts.onlyInShotId);
      if (shot) {
        shot.overrides[object.id] = { ...shot.overrides[object.id], visible: true };
      }
      return;
    }
    scene.set.objects.push(object);
  }

  export function updateObject(
    draft: Project,
    sceneId: string,
    objectId: string,
    patch: ObjectOverride,
    target: EditTarget
  ): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    if (target.kind === "shot") {
      const shot = scene.shots.find((sh) => sh.id === target.shotId);
      if (!shot) return;
      shot.overrides[objectId] = { ...shot.overrides[objectId], ...patch };
      return;
    }

    const object = scene.set.objects.find((o) => o.id === objectId);
    if (!object) return;
    if (patch.transform) object.transform = patch.transform;
    if (patch.visible !== undefined) object.visible = patch.visible;
    if (patch.pose !== undefined && object.kind === "doll") object.pose = patch.pose;
    reconcileOnlyInShot(draft, sceneId, objectId);
  }

  export function renameObject(draft: Project, sceneId: string, objectId: string, name: string): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const object = scene.set.objects.find((o) => o.id === objectId);
    if (!object) return;
    object.name = name;
  }

  export function deleteObject(draft: Project, sceneId: string, objectId: string): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    scene.set.objects = scene.set.objects.filter((o) => o.id !== objectId);
    for (const shot of scene.shots) {
      delete shot.overrides[objectId];
    }
  }

  /**
   * An object added with "only in this shot" has default visible false and a
   * visible true override in one shot. Later, on the scene page, the user edits
   * it with the set target. This decides what that edit does to visibility.
   * Options: (a) leave visibility alone, so the object stays a one-shot object
   * that can be moved from the scene page only while "show hidden" is on;
   * (b) promote it, setting default visible true and removing the now redundant
   * override, because editing it from the scene page signals it belongs to the set.
   */
  export function reconcileOnlyInShot(draft: Project, sceneId: string, objectId: string): void {
    // Nick's 5 to 10 lines go here, per the answer he gave in the STOP step
    // above. Do not fill this in yourself.
  }
  ```
- [ ] Run the full test file and confirm nothing regressed (the wiring only changed `updateObject`'s set branch, and `reconcileOnlyInShot` still no-ops for every fixture used in the earlier tests, so the existing assertions are unaffected by Nick's new body as long as it still satisfies the two required tests):
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/object-actions.test.ts
  ```
  Expected: 8 passed, 0 failed.
- [ ] Commit:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/state/object-actions.ts
  ```
  ```
  git commit -m "$(cat <<'EOF'
  feat: reconcile only-in-shot visibility on set-target edits

  Nick's call: reconcileOnlyInShot now runs at the end of updateObject's
  set-target branch.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 14: Scene and shot actions

**Files:**
- Create: `src/state/shot-actions.ts`
- Create: `src/state/shot-actions.test.ts`

**Interfaces:**
- Consumes: `Project`, `Shot`, `Framing`, `Vec3` from `src/domain/types.ts` (Task 4); `createScene`, `createShot` from `src/domain/factories.ts` (Task 4); `newId` from `src/domain/ids.ts` (Task 4).
- Produces:
  ```ts
  export function addScene(draft: Project, name: string): string;
  export function renameScene(draft: Project, sceneId: string, name: string): void;
  export function deleteScene(draft: Project, sceneId: string): void;
  export function setSceneNotes(draft: Project, sceneId: string, notes: string): void;
  export function addShot(draft: Project, sceneId: string): string;
  export function duplicateShot(draft: Project, sceneId: string, shotId: string): string;
  export function deleteShot(draft: Project, sceneId: string, shotId: string): void;
  export function moveShot(draft: Project, sceneId: string, shotId: string, toIndex: number): void;
  export function updateShot(draft: Project, sceneId: string, shotId: string, patch: Partial<Pick<Shot, "name" | "type" | "durationSec">>): void;
  export function setShotFraming(draft: Project, sceneId: string, shotId: string, framing: Framing): void;
  export function setShotLens(draft: Project, sceneId: string, shotId: string, lensMm: number): void;
  export function setShotThumb(draft: Project, sceneId: string, shotId: string, thumb: { blobKey: string; stateHash: string }): void;
  ```

Like Task 13, these are plain recipes that mutate their `draft: Project` argument, tested directly against domain-factory fixtures without going through `useDocumentStore`. `addShot` numbers shots by the scene's current shot count (`Shot 01`, `Shot 02`, ...), not by parsing existing names, so renaming a shot never confuses later numbering.

- [ ] Write the failing test file `src/state/shot-actions.test.ts`, covering scene actions and shot creation, duplication, deletion, and reordering:
  ```ts
  import { beforeEach, describe, expect, it } from "vitest";

  import { createProject } from "@/domain/factories";
  import type { Project } from "@/domain/types";
  import {
    addScene,
    addShot,
    deleteScene,
    deleteShot,
    duplicateShot,
    moveShot,
    renameScene,
    setSceneNotes,
  } from "@/state/shot-actions";

  let project: Project;

  beforeEach(() => {
    project = createProject("Test");
  });

  describe("scene actions", () => {
    it("adds, renames, deletes a scene and sets its notes", () => {
      const sceneId = addScene(project, "Scene 1");
      expect(project.scenes).toHaveLength(1);
      expect(project.scenes[0].id).toBe(sceneId);
      expect(project.scenes[0].name).toBe("Scene 1");

      renameScene(project, sceneId, "Scene One");
      expect(project.scenes[0].name).toBe("Scene One");

      setSceneNotes(project, sceneId, "Opens on the porch.");
      expect(project.scenes[0].notes).toBe("Opens on the porch.");

      deleteScene(project, sceneId);
      expect(project.scenes).toHaveLength(0);
    });
  });

  describe("shot actions: create, duplicate, delete, move", () => {
    it("addShot appends with defaults and returns the id, names run Shot 01, Shot 02", () => {
      const sceneId = addScene(project, "Scene 1");
      const firstId = addShot(project, sceneId);
      const secondId = addShot(project, sceneId);
      const scene = project.scenes[0];

      expect(scene.shots.map((s) => s.id)).toEqual([firstId, secondId]);
      expect(scene.shots.map((s) => s.name)).toEqual(["Shot 01", "Shot 02"]);
      expect(scene.shots[0].camera.lensMm).toBe(35);
      expect(scene.shots[0].durationSec).toBe(4);
    });

    it("duplicateShot inserts right after the source with a new id, equal camera and overrides, and no thumb", () => {
      const sceneId = addScene(project, "Scene 1");
      const shotId = addShot(project, sceneId);
      const scene = project.scenes[0];
      const source = scene.shots[0];
      source.overrides["obj-1"] = { visible: false };
      source.thumb = { blobKey: "thumb:1", stateHash: "abc" };

      const copyId = duplicateShot(project, sceneId, shotId);

      expect(scene.shots.map((s) => s.id)).toEqual([shotId, copyId]);
      const copy = scene.shots[1];
      expect(copy.id).not.toBe(shotId);
      expect(copy.camera).toEqual(source.camera);
      expect(copy.camera).not.toBe(source.camera);
      expect(copy.overrides).toEqual(source.overrides);
      expect(copy.overrides).not.toBe(source.overrides);
      expect(copy.thumb).toBeUndefined();
    });

    it("deleteShot removes it", () => {
      const sceneId = addScene(project, "Scene 1");
      const shotId = addShot(project, sceneId);
      deleteShot(project, sceneId, shotId);
      expect(project.scenes[0].shots).toHaveLength(0);
    });

    it("moveShot reorders and clamps toIndex", () => {
      const sceneId = addScene(project, "Scene 1");
      const a = addShot(project, sceneId);
      const b = addShot(project, sceneId);
      const c = addShot(project, sceneId);

      moveShot(project, sceneId, a, 2);
      expect(project.scenes[0].shots.map((s) => s.id)).toEqual([b, c, a]);

      moveShot(project, sceneId, a, 99);
      expect(project.scenes[0].shots.map((s) => s.id)).toEqual([b, c, a]);

      moveShot(project, sceneId, c, -5);
      expect(project.scenes[0].shots.map((s) => s.id)).toEqual([c, b, a]);
    });
  });
  ```
- [ ] Run the test and confirm it fails because the module does not exist yet:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/shot-actions.test.ts
  ```
  Expected: fails with a module resolution error, zero tests run.
- [ ] Write the minimal implementation `src/state/shot-actions.ts`, covering scene actions and shot create/duplicate/delete/move only:
  ```ts
  import { newId } from "@/domain/ids";
  import { createScene, createShot } from "@/domain/factories";
  import type { Project, Shot } from "@/domain/types";

  export function addScene(draft: Project, name: string): string {
    const scene = createScene(name);
    draft.scenes.push(scene);
    return scene.id;
  }

  export function renameScene(draft: Project, sceneId: string, name: string): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    scene.name = name;
  }

  export function deleteScene(draft: Project, sceneId: string): void {
    draft.scenes = draft.scenes.filter((s) => s.id !== sceneId);
  }

  export function setSceneNotes(draft: Project, sceneId: string, notes: string): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    scene.notes = notes;
  }

  export function addShot(draft: Project, sceneId: string): string {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return "";
    const shot = createShot(`Shot ${String(scene.shots.length + 1).padStart(2, "0")}`);
    scene.shots.push(shot);
    return shot.id;
  }

  export function duplicateShot(draft: Project, sceneId: string, shotId: string): string {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return "";
    const index = scene.shots.findIndex((s) => s.id === shotId);
    if (index === -1) return "";
    const source = scene.shots[index];
    const copy: Shot = {
      id: newId(),
      name: `${source.name} copy`,
      type: source.type,
      durationSec: source.durationSec,
      camera: {
        lensMm: source.camera.lensMm,
        position: source.camera.position.map((k) => ({ t: k.t, value: [...k.value] as [number, number, number] })),
        aim: source.camera.aim.map((k) => ({ t: k.t, value: [...k.value] as [number, number, number] })),
      },
      overrides: structuredClone(source.overrides),
    };
    scene.shots.splice(index + 1, 0, copy);
    return copy.id;
  }

  export function deleteShot(draft: Project, sceneId: string, shotId: string): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    scene.shots = scene.shots.filter((s) => s.id !== shotId);
  }

  export function moveShot(draft: Project, sceneId: string, shotId: string, toIndex: number): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const fromIndex = scene.shots.findIndex((s) => s.id === shotId);
    if (fromIndex === -1) return;
    const clamped = Math.max(0, Math.min(toIndex, scene.shots.length - 1));
    const [shot] = scene.shots.splice(fromIndex, 1);
    scene.shots.splice(clamped, 0, shot);
  }
  ```
- [ ] Run again and confirm all 5 tests pass:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/shot-actions.test.ts
  ```
  Expected: 5 passed, 0 failed.
- [ ] Add failing tests for `updateShot`, `setShotFraming`, `setShotLens` and `setShotThumb`, appending to the test file:
  ```ts
  import { setShotFraming, setShotLens, setShotThumb, updateShot } from "@/state/shot-actions";

  describe("shot actions: fields, framing, lens, thumb", () => {
    it("updateShot patches name, type and durationSec", () => {
      const sceneId = addScene(project, "Scene 1");
      const shotId = addShot(project, sceneId);
      updateShot(project, sceneId, shotId, { name: "Wide open", type: "WIDE", durationSec: 6 });
      const shot = project.scenes[0].shots[0];
      expect(shot.name).toBe("Wide open");
      expect(shot.type).toBe("WIDE");
      expect(shot.durationSec).toBe(6);
    });

    it("setShotFraming writes key 0 of both position and aim", () => {
      const sceneId = addScene(project, "Scene 1");
      const shotId = addShot(project, sceneId);
      setShotFraming(project, sceneId, shotId, { position: [1, 2, 3], aim: [0, 1, 0] });
      const shot = project.scenes[0].shots[0];
      expect(shot.camera.position[0]).toEqual({ t: 0, value: [1, 2, 3] });
      expect(shot.camera.aim[0]).toEqual({ t: 0, value: [0, 1, 0] });
      expect(shot.camera.position).toHaveLength(1);
      expect(shot.camera.aim).toHaveLength(1);
    });

    it("setShotLens clamps to 12 and 200", () => {
      const sceneId = addScene(project, "Scene 1");
      const shotId = addShot(project, sceneId);
      setShotLens(project, sceneId, shotId, 5);
      expect(project.scenes[0].shots[0].camera.lensMm).toBe(12);
      setShotLens(project, sceneId, shotId, 400);
      expect(project.scenes[0].shots[0].camera.lensMm).toBe(200);
      setShotLens(project, sceneId, shotId, 50);
      expect(project.scenes[0].shots[0].camera.lensMm).toBe(50);
    });

    it("setShotThumb records the blob key and state hash", () => {
      const sceneId = addScene(project, "Scene 1");
      const shotId = addShot(project, sceneId);
      setShotThumb(project, sceneId, shotId, { blobKey: "thumb:1:abc", stateHash: "abc" });
      expect(project.scenes[0].shots[0].thumb).toEqual({ blobKey: "thumb:1:abc", stateHash: "abc" });
    });
  });
  ```
- [ ] Run and confirm the 4 new tests fail (the functions are not exported yet), the earlier 5 still pass:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/shot-actions.test.ts
  ```
  Expected: 5 passed, 4 failed (or a TypeScript error on import if the test runner type-checks first).
- [ ] Add `updateShot`, `setShotFraming`, `setShotLens` and `setShotThumb` to `src/state/shot-actions.ts` (append at the end, after `moveShot`), and add the `Framing` import:
  ```ts
  import type { Framing, Project, Shot } from "@/domain/types";
  ```
  (replace the existing `import type { Project, Shot } from "@/domain/types";` line with the line above), then append:
  ```ts
  export function updateShot(
    draft: Project,
    sceneId: string,
    shotId: string,
    patch: Partial<Pick<Shot, "name" | "type" | "durationSec">>
  ): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const shot = scene.shots.find((s) => s.id === shotId);
    if (!shot) return;
    if (patch.name !== undefined) shot.name = patch.name;
    if (patch.type !== undefined) shot.type = patch.type;
    if (patch.durationSec !== undefined) shot.durationSec = patch.durationSec;
  }

  export function setShotFraming(draft: Project, sceneId: string, shotId: string, framing: Framing): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const shot = scene.shots.find((s) => s.id === shotId);
    if (!shot) return;
    if (shot.camera.position[0]) {
      shot.camera.position[0].value = framing.position;
    } else {
      shot.camera.position[0] = { t: 0, value: framing.position };
    }
    if (shot.camera.aim[0]) {
      shot.camera.aim[0].value = framing.aim;
    } else {
      shot.camera.aim[0] = { t: 0, value: framing.aim };
    }
  }

  export function setShotLens(draft: Project, sceneId: string, shotId: string, lensMm: number): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const shot = scene.shots.find((s) => s.id === shotId);
    if (!shot) return;
    shot.camera.lensMm = Math.max(12, Math.min(200, lensMm));
  }

  export function setShotThumb(
    draft: Project,
    sceneId: string,
    shotId: string,
    thumb: { blobKey: string; stateHash: string }
  ): void {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const shot = scene.shots.find((s) => s.id === shotId);
    if (!shot) return;
    shot.thumb = thumb;
  }
  ```
- [ ] Run again and confirm all 9 tests pass:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/shot-actions.test.ts
  ```
  Expected: 9 passed, 0 failed.
- [ ] Commit:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/state/shot-actions.ts src/state/shot-actions.test.ts
  ```
  ```
  git commit -m "$(cat <<'EOF'
  feat: add scene and shot actions

  Scene CRUD plus shot create, duplicate, delete, move, field updates,
  framing, lens clamping and thumbnail recording, all as Immer recipes.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 15: Editor and playback stores

**Files:**
- Create: `src/state/editor-store.ts`
- Create: `src/state/playback-store.ts`
- Create: `src/state/editor-store.test.ts`

**Interfaces:**
- Consumes: nothing outside `zustand`.
- Produces:
  ```ts
  export type WriteTarget = "set" | "shot";
  export type CameraMode = "shot" | "orbit" | "plan";
  export type GizmoMode = "translate" | "rotate" | "scale";
  export type EditorState = {
    selectedObjectId: string | null; gizmoMode: GizmoMode; writeTarget: WriteTarget; cameraMode: CameraMode;
    select(id: string | null): void; setGizmoMode(m: GizmoMode): void;
    setWriteTarget(t: WriteTarget): void; setCameraMode(m: CameraMode): void;
  };
  export const useEditorStore: UseBoundStore<StoreApi<EditorState>>;
  export const usePlaybackStore: UseBoundStore<StoreApi<{ time: number; playing: boolean; setTime(t: number): void; setPlaying(p: boolean): void }>>;
  ```

Both stores are plain Zustand, no Immer, no persistence, no undo. The test file for this task lives at `src/state/editor-store.test.ts` and covers both stores plus the import-isolation check, so there is one file for two small modules.

- [ ] Write the failing test file `src/state/editor-store.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { fileURLToPath } from "node:url";
  import { beforeEach, describe, expect, it } from "vitest";

  import { useEditorStore } from "@/state/editor-store";
  import { usePlaybackStore } from "@/state/playback-store";

  beforeEach(() => {
    useEditorStore.setState({
      selectedObjectId: null,
      gizmoMode: "translate",
      writeTarget: "shot",
      cameraMode: "orbit",
    });
    usePlaybackStore.setState({ time: 0, playing: false });
  });

  describe("useEditorStore", () => {
    it("defaults to translate, shot, orbit and nothing selected", () => {
      const state = useEditorStore.getState();
      expect(state.selectedObjectId).toBeNull();
      expect(state.gizmoMode).toBe("translate");
      expect(state.writeTarget).toBe("shot");
      expect(state.cameraMode).toBe("orbit");
    });

    it("select, setGizmoMode, setWriteTarget and setCameraMode update state", () => {
      useEditorStore.getState().select("obj-1");
      expect(useEditorStore.getState().selectedObjectId).toBe("obj-1");

      useEditorStore.getState().setGizmoMode("rotate");
      expect(useEditorStore.getState().gizmoMode).toBe("rotate");

      useEditorStore.getState().setWriteTarget("set");
      expect(useEditorStore.getState().writeTarget).toBe("set");

      useEditorStore.getState().setCameraMode("plan");
      expect(useEditorStore.getState().cameraMode).toBe("plan");
    });
  });

  describe("usePlaybackStore", () => {
    it("defaults to time 0 and not playing", () => {
      const state = usePlaybackStore.getState();
      expect(state.time).toBe(0);
      expect(state.playing).toBe(false);
    });

    it("setTime and setPlaying update state", () => {
      usePlaybackStore.getState().setTime(2.5);
      expect(usePlaybackStore.getState().time).toBe(2.5);
      usePlaybackStore.getState().setPlaying(true);
      expect(usePlaybackStore.getState().playing).toBe(true);
    });
  });

  describe("store isolation", () => {
    it("neither editor-store nor playback-store imports document-store", () => {
      const here = fileURLToPath(import.meta.url);
      const dir = here.slice(0, here.lastIndexOf("/"));
      const editorSource = readFileSync(`${dir}/editor-store.ts`, "utf-8");
      const playbackSource = readFileSync(`${dir}/playback-store.ts`, "utf-8");
      expect(editorSource).not.toMatch(/document-store/);
      expect(playbackSource).not.toMatch(/document-store/);
    });
  });
  ```
- [ ] Run the test and confirm it fails because neither module exists yet:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/editor-store.test.ts
  ```
  Expected: fails with a module resolution error, zero tests run.
- [ ] Write `src/state/editor-store.ts`:
  ```ts
  import { create } from "zustand";

  export type WriteTarget = "set" | "shot";
  export type CameraMode = "shot" | "orbit" | "plan";
  export type GizmoMode = "translate" | "rotate" | "scale";

  export type EditorState = {
    selectedObjectId: string | null;
    gizmoMode: GizmoMode;
    writeTarget: WriteTarget;
    cameraMode: CameraMode;
    select(id: string | null): void;
    setGizmoMode(m: GizmoMode): void;
    setWriteTarget(t: WriteTarget): void;
    setCameraMode(m: CameraMode): void;
  };

  export const useEditorStore = create<EditorState>()((set) => ({
    selectedObjectId: null,
    gizmoMode: "translate",
    writeTarget: "shot",
    cameraMode: "orbit",
    select(id) {
      set({ selectedObjectId: id });
    },
    setGizmoMode(m) {
      set({ gizmoMode: m });
    },
    setWriteTarget(t) {
      set({ writeTarget: t });
    },
    setCameraMode(m) {
      set({ cameraMode: m });
    },
  }));
  ```
- [ ] Write `src/state/playback-store.ts`:
  ```ts
  import { create } from "zustand";

  export type PlaybackState = {
    time: number;
    playing: boolean;
    setTime(t: number): void;
    setPlaying(p: boolean): void;
  };

  export const usePlaybackStore = create<PlaybackState>()((set) => ({
    time: 0,
    playing: false,
    setTime(t) {
      set({ time: t });
    },
    setPlaying(p) {
      set({ playing: p });
    },
  }));
  ```
- [ ] Run again and confirm all 6 tests pass:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/state/editor-store.test.ts
  ```
  Expected: 6 passed, 0 failed.
- [ ] Commit:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/state/editor-store.ts src/state/playback-store.ts src/state/editor-store.test.ts
  ```
  ```
  git commit -m "$(cat <<'EOF'
  feat: add editor and playback stores

  Selection, gizmo mode, write target and camera mode in one small store;
  playhead time and playing flag in another. Neither persists, neither
  touches undo, neither imports the document store.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 16: Canvas, scene contents, meshes, rigs

**Files:**
- Create: `src/viewport/PrimitiveMesh.tsx` (ported from Film Planner's `primitive-mesh.tsx`)
- Create: `src/viewport/DollMesh.tsx` (ported from Film Planner's `doll-mesh.tsx`)
- Create: `src/viewport/rigs/ShotCameraRig.tsx`, `src/viewport/rigs/OrbitRig.tsx` (both ported from Film Planner's `camera-rigs.tsx`)
- Create: `src/viewport/rigs/PlanRig.tsx` (new, rebuilt from Scene Builder v2's ideas)
- Create: `src/viewport/Ground.tsx` (new)
- Create: `src/viewport/SceneContents.tsx` (new)
- Create: `src/viewport/StageCanvas.tsx` (new)
- Create: `src/viewport/SceneContents.test.tsx`

**Interfaces:**
- Consumes: `PrimitiveObject`, `DollObject`, `StageObject`, `ShotCamera`, `Scene`, `Shot` from `src/domain/types.ts` (Task 4); `POSES`, `DOLL` from `src/domain/poses.ts` (Task 5); `lensToVFovDeg` from `src/domain/lens.ts` (Task 5); `cameraAt`, `resolveSceneAll` from `src/domain/resolve.ts` (Task 6); `findScene`, `findShot` from `src/domain/lookup.ts` (Task 4); `useDocumentStore` from `src/state/document-store.ts` (Task 12); `useEditorStore`, `CameraMode` from `src/state/editor-store.ts` (Task 15); `usePlaybackStore` from `src/state/playback-store.ts` (Task 15); `createPrimitive`, `createScene`, `createShot` from `src/domain/factories.ts` (Task 4, test only).

  Domain now exports two siblings from `resolve.ts`: `resolveScene(scene, shot, t)` is the visible-only filter (kept for anything outside the viewport that only wants what is actually on screen), and `resolveSceneAll(scene, shot, t): StageObject[]` keeps every one of `scene.set.objects` in the result, overrides applied, set order kept, invisible ones included with `visible: false` (so the result's length always equals `scene.set.objects.length`). The viewport uses `resolveSceneAll` throughout this task and the two after it, because Task 21's offscreen thumbnail render needs every set object mounted as a node, not just the ones visible in the shot currently on screen.
- Produces:
  ```ts
  export function StageCanvas(props: { sceneId: string; shotId: string | null }): JSX.Element;
  ```
  Plus `PrimitiveMesh`, `DollMesh`, `Ground`, `SceneContents`, `ShotCameraRig`, `OrbitRig`, `PlanRig`, none of which are in the Shared Interfaces block (no other task imports them by name), so their prop shapes are this task's own decision. Every non-scene helper is named with the prefix `helper:`, so an offscreen render can hide it by name; this task names `Ground`'s root `helper:ground` (Task 17 adds `Gizmo`'s `helper:gizmo`). Task 18 later adds `framingFromControls(cameraPosition: Vec3, target: Vec3): Framing` to `src/viewport/transform-commit.ts` (created in Task 17), which this task's `ShotCameraRig.tsx` depends on once Task 18 extends it.

Film Planner keeps `primitive-mesh.tsx`, `doll-mesh.tsx` and `camera-rigs.tsx` next to `stage-viewport.test.tsx` and `stage-inspector.test.tsx`, but neither of those test files covers the three mesh and rig files themselves:

- [ ] **Install the 3D libraries.** These packages are imported by this task and by later ones, and no earlier task installs them.

  ```bash
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npm install three @react-three/fiber @react-three/drei three-stdlib && npm install -D @types/three @react-three/test-renderer
  ```

  Expected: the four runtime packages appear under `dependencies` and the two others under `devDependencies`. `npm ls three` shows exactly one copy of `three`. If it shows two, stop and align the versions before continuing, because two copies break `instanceof` checks inside react-three-fiber.

- [ ] Confirm there is nothing to copy alongside the port:
  ```
  ls "/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/components/stage/"
  ```
  Expected: `block-panel.test.tsx block-panel.tsx camera-rigs.tsx doll-mesh.tsx primitive-mesh.tsx stage-inspector.test.tsx stage-inspector.tsx stage-viewport.stories.tsx stage-viewport.test.tsx stage-viewport.tsx`. No `primitive-mesh.test.tsx`, `doll-mesh.test.tsx` or `camera-rigs.test.tsx`. Skip the "run copied tests" sub-step for this port and go straight to adapting each file.

- [ ] Port the three files verbatim first, so the adaptation diff is honest about where each line came from:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && mkdir -p src/viewport/rigs
  cp "/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/components/stage/primitive-mesh.tsx" src/viewport/PrimitiveMesh.tsx
  cp "/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/components/stage/doll-mesh.tsx" src/viewport/DollMesh.tsx
  cp "/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/components/stage/camera-rigs.tsx" src/viewport/rigs/ShotCameraRig.tsx
  cp "/Users/nickv/ClaudeCode Projects/Film Writer and Planner/film-planner/src/components/stage/camera-rigs.tsx" src/viewport/rigs/OrbitRig.tsx
  ```
  Expected: four new files under `src/viewport/`, each still containing Film Planner's original, unadapted source (the two rig copies are temporarily identical and both still contain both rigs; the next two steps cut each down to the one rig it is named for).

- [ ] Adapt `src/viewport/PrimitiveMesh.tsx`. Edits from the ported source: drop the `"use client"` directive (this is Vite, not Next.js); change the import from `@/stage/types` to `@/domain/types`; the object prop is now `PrimitiveObject`, not a generic `StageObject`, and `size: Vec3` replaces the old hardcoded per-shape dimensions; add the new `wall` shape, which is a box using the object's own `size` directly (walls are thin boxes, `[4, 2.5, 0.2]` by default, not a special geometry); name the root group `obj:<id>` so tests and the gizmo can find it in the scene graph; add a `visible` prop (default `true`) applied to that same root group, since `SceneContents` now keeps every set object mounted (Task 21's offscreen thumbnail render needs every object present as a node) and toggles visibility per object instead of omitting hidden ones from the tree. Write the complete adapted file:
  ```tsx
  import type { Ref } from "react";
  import type { ThreeEvent } from "@react-three/fiber";
  import { DoubleSide } from "three";
  import type { Group } from "three";

  import type { PrimitiveObject, PrimitiveShape, Vec3 } from "@/domain/types";

  type PrimitiveMeshProps = {
    object: PrimitiveObject;
    visible?: boolean;
    onSelect?: (event: ThreeEvent<MouseEvent>) => void;
    ref?: Ref<Group>;
  };

  function ShapeMesh({ shape, size, color }: { shape: PrimitiveShape; size: Vec3; color: string }) {
    const [width, height, depth] = size;
    switch (shape) {
      case "cylinder":
        return (
          <mesh position-y={height / 2}>
            <cylinderGeometry args={[width / 2, width / 2, height, 20]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      case "plane":
        // Lies flat on the floor; lifted a hair to avoid z-fighting the grid.
        return (
          <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[width, depth]} />
            <meshStandardMaterial color={color} side={DoubleSide} />
          </mesh>
        );
      case "sphere":
        return (
          <mesh position-y={width / 2}>
            <sphereGeometry args={[width / 2, 24, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      case "wall":
        return (
          <mesh position-y={height / 2}>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      case "box":
      default:
        return (
          <mesh position-y={height / 2}>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
    }
  }

  /** A PrimitiveObject, positioned per its transform. Shapes sit on the floor (y = 0). */
  export function PrimitiveMesh({ object, visible = true, onSelect, ref }: PrimitiveMeshProps) {
    const { position, rotationY, scale } = object.transform;
    return (
      <group
        ref={ref}
        name={`obj:${object.id}`}
        visible={visible}
        position={position}
        rotation-y={rotationY}
        scale={scale}
        onClick={onSelect}
      >
        <ShapeMesh shape={object.shape} size={object.size} color={object.color} />
      </group>
    );
  }
  ```

- [ ] Adapt `src/viewport/DollMesh.tsx`. Edits from the ported source: drop `"use client"`; change imports from `@/stage/poses` and `@/stage/types` to `@/domain/poses` and `@/domain/types`; the object prop is now `DollObject`; name the root group `obj:<id>`; add a `visible` prop (default `true`) applied to that same root group, for the same reason as `PrimitiveMesh.tsx`: `SceneContents` keeps every set object mounted and toggles visibility per object rather than omitting hidden ones. The rest (limb geometry, pose lookup, torso/head/limb layout) carries over unchanged, since `DOLL`, `POSES` and the `transform`/`pose`/`color` fields are identical in shape to what Film Planner already had. Write the complete adapted file:
  ```tsx
  import type { Ref } from "react";
  import type { ThreeEvent } from "@react-three/fiber";
  import type { Group } from "three";

  import { DOLL, POSES } from "@/domain/poses";
  import type { DollObject, Vec3 } from "@/domain/types";

  const SELECT_RING_GOLD = "#d4af37";
  const HIP_SPREAD_X = 0.09;
  const NECK_GAP = 0.05;

  type Segment = { length: number; radius: number };

  type LimbProps = {
    position: Vec3;
    rootRotation: Vec3;
    midRotation: Vec3;
    upper: Segment;
    lower: Segment;
    color: string;
  };

  /**
   * A two-segment limb (arm or leg) hanging down -Y from its root joint.
   * The mid joint (elbow/knee) is nested inside the root joint's group, so
   * rotating the shoulder/hip carries the forearm/shin with it.
   */
  function Limb({ position, rootRotation, midRotation, upper, lower, color }: LimbProps) {
    return (
      <group position={position} rotation={rootRotation}>
        <mesh position-y={-upper.length / 2}>
          <capsuleGeometry args={[upper.radius, upper.length - upper.radius * 2, 4, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <group position-y={-upper.length} rotation={midRotation}>
          <mesh position-y={-lower.length / 2}>
            <capsuleGeometry args={[lower.radius, lower.length - lower.radius * 2, 4, 10]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      </group>
    );
  }

  type DollMeshProps = {
    object: DollObject;
    selected: boolean;
    visible?: boolean;
    onSelect?: (event: ThreeEvent<MouseEvent>) => void;
    ref?: Ref<Group>;
  };

  /**
   * The mannequin: sphere head plus capsule torso/limbs sized per DOLL, with
   * joints rotated per POSES[pose]. The root group sits at floor level (feet
   * at local y = 0, pelvis lifted by hipHeight). When selected, a flat gold
   * ring lies at the doll's feet as a rotate affordance.
   */
  export function DollMesh({ object, selected, visible = true, onSelect, ref }: DollMeshProps) {
    const pose = POSES[object.pose];
    const color = object.color;
    const { position, rotationY, scale } = object.transform;
    const shoulderX = DOLL.torso.radius + DOLL.upperArm.radius;
    const shoulderY = DOLL.torso.height - 0.05;

    return (
      <group
        ref={ref}
        name={`obj:${object.id}`}
        visible={visible}
        position={position}
        rotation-y={rotationY}
        scale={scale}
        onClick={onSelect}
      >
        <group position-y={DOLL.hipHeight}>
          <mesh position-y={DOLL.torso.height / 2}>
            <capsuleGeometry args={[DOLL.torso.radius, DOLL.torso.height - DOLL.torso.radius * 2, 4, 12]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <group position-y={DOLL.torso.height} rotation={pose.neck}>
            <mesh position-y={DOLL.headRadius + NECK_GAP}>
              <sphereGeometry args={[DOLL.headRadius, 16, 12]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
          <Limb
            position={[-shoulderX, shoulderY, 0]}
            rootRotation={pose.shoulderL}
            midRotation={pose.elbowL}
            upper={DOLL.upperArm}
            lower={DOLL.foreArm}
            color={color}
          />
          <Limb
            position={[shoulderX, shoulderY, 0]}
            rootRotation={pose.shoulderR}
            midRotation={pose.elbowR}
            upper={DOLL.upperArm}
            lower={DOLL.foreArm}
            color={color}
          />
          <Limb
            position={[-HIP_SPREAD_X, 0, 0]}
            rootRotation={pose.hipL}
            midRotation={pose.kneeL}
            upper={DOLL.thigh}
            lower={DOLL.shin}
            color={color}
          />
          <Limb
            position={[HIP_SPREAD_X, 0, 0]}
            rootRotation={pose.hipR}
            midRotation={pose.kneeR}
            upper={DOLL.thigh}
            lower={DOLL.shin}
            color={color}
          />
        </group>
        {selected && (
          <mesh position-y={0.02} rotation-x={-Math.PI / 2}>
            <torusGeometry args={[0.45, 0.025, 8, 48]} />
            <meshBasicMaterial color={SELECT_RING_GOLD} />
          </mesh>
        )}
      </group>
    );
  }
  ```

- [ ] Write `src/viewport/SceneContents.test.tsx` first, against the two adapted mesh files above, using `@react-three/test-renderer` (documented API: `ReactThreeTestRenderer.create(<Comp />)` returns a renderer whose `.scene` is the root test instance; `.scene.findAll(predicate)` walks every node, and each node exposes `.props`, the JSX props it was given, so both `name` and `visible` are readable off it without touching the underlying three.js instance):
  ```tsx
  import { describe, expect, it } from "vitest";
  import ReactThreeTestRenderer from "@react-three/test-renderer";

  import { createPrimitive, createScene, createShot } from "@/domain/factories";
  import { resolveSceneAll } from "@/domain/resolve";
  import { SceneContents } from "@/viewport/SceneContents";

  async function objGroups(element: React.ReactElement) {
    const renderer = await ReactThreeTestRenderer.create(element);
    return renderer.scene.findAll(
      (node) => typeof node.props.name === "string" && (node.props.name as string).startsWith("obj:")
    );
  }

  describe("SceneContents", () => {
    it("renders three resolved objects as three obj: groups", async () => {
      const scene = createScene("Scene 1");
      scene.set.objects.push(createPrimitive("box"), createPrimitive("cylinder"), createPrimitive("sphere"));
      const objects = resolveSceneAll(scene, null, 0);

      const groups = await objGroups(<SceneContents objects={objects} />);

      expect(groups).toHaveLength(3);
    });

    it("keeps a shot-hidden object present but not visible, and visible on the scene page", async () => {
      const scene = createScene("Scene 1");
      const hidden = createPrimitive("box");
      scene.set.objects.push(hidden);
      const shot = createShot("Shot 01");
      shot.overrides[hidden.id] = { visible: false };
      scene.shots.push(shot);

      // resolveSceneAll never drops the object: the shot's copy stays
      // mounted with visible: false, and the scene page's copy is visible.
      const onShot = resolveSceneAll(scene, shot, 0);
      const onScenePage = resolveSceneAll(scene, null, 0);

      const shotGroups = await objGroups(<SceneContents objects={onShot} />);
      const sceneGroups = await objGroups(<SceneContents objects={onScenePage} />);

      const shotNode = shotGroups.find((node) => node.props.name === `obj:${hidden.id}`);
      const sceneNode = sceneGroups.find((node) => node.props.name === `obj:${hidden.id}`);

      expect(shotNode).toBeDefined();
      expect(shotNode?.props.visible).toBe(false);
      expect(sceneNode).toBeDefined();
      expect(sceneNode?.props.visible).toBe(true);
    });
  });
  ```
- [ ] Run the test and confirm it fails because `src/viewport/SceneContents.tsx` does not exist yet:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/viewport/SceneContents.test.tsx
  ```
  Expected: fails with a module resolution error, zero tests run.
- [ ] Write `src/viewport/SceneContents.tsx`:
  ```tsx
  import type { StageObject } from "@/domain/types";
  import { DollMesh } from "@/viewport/DollMesh";
  import { PrimitiveMesh } from "@/viewport/PrimitiveMesh";

  type SceneContentsProps = { objects: StageObject[] };

  /** Renders resolveSceneAll's output as meshes: every set object, always
   * mounted, hidden ones included. Each object's root group is named
   * "obj:<id>" and carries visible={object.visible}, so a hidden object
   * stays in the scene graph (for Task 21's offscreen thumbnail render of a
   * different shot) without being drawn or picked in this one. Props kind
   * is not rendered until S2; it is skipped here. */
  export function SceneContents({ objects }: SceneContentsProps) {
    return (
      <>
        {objects.map((object) => {
          if (object.kind === "doll") {
            return <DollMesh key={object.id} object={object} selected={false} visible={object.visible} />;
          }
          if (object.kind === "primitive") {
            return <PrimitiveMesh key={object.id} object={object} visible={object.visible} />;
          }
          return null;
        })}
      </>
    );
  }
  ```
- [ ] Run again and confirm both tests pass:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/viewport/SceneContents.test.tsx
  ```
  Expected: 2 passed, 0 failed.

- [ ] Write `src/viewport/Ground.tsx` (new; the 40 m grid dimensions and colors come from the `<Grid>` usage read in Film Planner's `stage-viewport.tsx`, scaled from that file's 20 m stage to this app's 40 m one). The root is named `helper:ground`, following this plan's `helper:` naming rule for every non-scene visual, so an offscreen thumbnail render (Task 21) can hide it by name:
  ```tsx
  import { Grid } from "@react-three/drei";

  /** A 40 m grid on the floor plane. Named helper:ground so an offscreen
   * render can hide it. Raycast is disabled so a click here falls through
   * to the canvas's onPointerMissed handler, which clears selection,
   * rather than the grid itself catching the click. */
  export function Ground() {
    return (
      <Grid
        name="helper:ground"
        args={[40, 40]}
        cellSize={1}
        sectionSize={5}
        cellColor="#3a4048"
        sectionColor="#5b6472"
        fadeDistance={60}
        raycast={() => undefined}
      />
    );
  }
  ```

- [ ] Adapt `src/viewport/rigs/ShotCameraRig.tsx` down to just the `ShotCameraRig` half of the ported `camera-rigs.tsx`. Edits: drop `"use client"` and the `FreeOrbitRig`/`ShotCameraMarker` code (that half becomes `OrbitRig.tsx` in the next step); change imports to `@/domain/lens`, `@/domain/resolve`, `@/domain/types`; rename the `scrubT` prop to `t` to match `cameraAt`'s own parameter name. This is the static version; Task 18 extends it with interactive framing. Write the complete file:
  ```tsx
  import { useLayoutEffect, useRef } from "react";
  import { PerspectiveCamera } from "@react-three/drei";
  import type { PerspectiveCamera as ThreePerspectiveCamera } from "three";

  import { lensToVFovDeg } from "@/domain/lens";
  import { cameraAt } from "@/domain/resolve";
  import type { ShotCamera } from "@/domain/types";

  type ShotCameraRigProps = { camera: ShotCamera; t: number };

  /**
   * The shot camera itself: a PerspectiveCamera made default, positioned at
   * cameraAt(camera, t) and looking at its aim, with the fov derived from
   * the lens focal length.
   */
  export function ShotCameraRig({ camera, t }: ShotCameraRigProps) {
    const ref = useRef<ThreePerspectiveCamera>(null);
    const { position, aim } = cameraAt(camera, t);
    const [px, py, pz] = position;
    const [ax, ay, az] = aim;

    useLayoutEffect(() => {
      const cam = ref.current;
      if (!cam) return;
      cam.position.set(px, py, pz);
      cam.lookAt(ax, ay, az);
    }, [px, py, pz, ax, ay, az]);

    return (
      <PerspectiveCamera
        ref={ref}
        makeDefault
        fov={lensToVFovDeg(camera.lensMm)}
        position={[px, py, pz]}
        near={0.1}
        far={200}
      />
    );
  }
  ```

- [ ] Adapt `src/viewport/rigs/OrbitRig.tsx` down to the `FreeOrbitRig` half of the ported `camera-rigs.tsx`, renamed `OrbitRig`. Edits: drop `"use client"`; drop `ShotCameraMarker` and its `camera`/`scrubT` props entirely (S1 has no coverage-diagram requirement for showing where the shot camera points while orbiting freely; that idea is out of scope here). Write the complete file:
  ```tsx
  import { useLayoutEffect, useRef } from "react";
  import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
  import type { PerspectiveCamera as ThreePerspectiveCamera } from "three";

  const ORBIT_TARGET: [number, number, number] = [0, 1, 0];

  /**
   * Free-orbit editor rig: a default camera with OrbitControls (makeDefault
   * so drei TransformControls can pause it while dragging).
   */
  export function OrbitRig() {
    const ref = useRef<ThreePerspectiveCamera>(null);
    // OrbitControls only orients the camera once the user interacts; without
    // this the first frame after mount looks down the camera's default -Z.
    useLayoutEffect(() => {
      ref.current?.lookAt(ORBIT_TARGET[0], ORBIT_TARGET[1], ORBIT_TARGET[2]);
    }, []);
    return (
      <>
        <PerspectiveCamera ref={ref} makeDefault fov={50} position={[9, 7, 9]} near={0.1} far={300} />
        <OrbitControls makeDefault target={ORBIT_TARGET} />
      </>
    );
  }
  ```

- [ ] Write `src/viewport/rigs/PlanRig.tsx`. This is new code, not a port: Scene Builder v2's top-down mode (read via `git -C "/Users/nickv/ClaudeCode Projects/Scene Builder V2 (3d editor)" show origin/v2/app:components/StageCanvas.tsx`) uses an `OrthographicCamera` positioned straight above the origin plus drei's `MapControls` (rotate disabled, left-drag pans). This plan does not add `MapControls` as a dependency since `OrbitControls` already covers it: rotate off, and the left mouse button remapped to pan via `mouseButtons`, both of which are documented `OrbitControls` props. Write the complete file:
  ```tsx
  import { useLayoutEffect, useRef } from "react";
  import { OrbitControls, OrthographicCamera } from "@react-three/drei";
  import { MOUSE } from "three";
  import type { OrthographicCamera as ThreeOrthographicCamera } from "three";

  const PLAN_TARGET: [number, number, number] = [0, 0, 0];
  const PLAN_HEIGHT = 40;

  /**
   * Top-down plan rig: an orthographic camera looking straight down the Y
   * axis, panned and zoomed with the left mouse button (rotate is off,
   * since a plan view has nothing to rotate to). The idea is Scene Builder
   * v2's top-down mode, rebuilt here without MapControls: OrbitControls
   * with rotate disabled and the left button remapped to pan does the same
   * job with a component this plan already depends on.
   */
  export function PlanRig() {
    const ref = useRef<ThreeOrthographicCamera>(null);
    useLayoutEffect(() => {
      ref.current?.lookAt(PLAN_TARGET[0], PLAN_TARGET[1], PLAN_TARGET[2]);
    }, []);
    return (
      <>
        <OrthographicCamera ref={ref} makeDefault position={[0, PLAN_HEIGHT, 0.01]} zoom={28} near={0.1} far={300} />
        <OrbitControls
          makeDefault
          target={PLAN_TARGET}
          enableRotate={false}
          screenSpacePanning
          mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
        />
      </>
    );
  }
  ```

- [ ] Write `src/viewport/StageCanvas.tsx`. This is the file the Shared Interfaces block pins: `StageCanvas(props: { sceneId: string; shotId: string | null })`. It reads the open project, resolves the current scene and shot through `resolveSceneAll` (every set object, hidden ones included, so Task 21's offscreen thumbnail render can find and hide any of them by node), never throws on an unknown scene id (an empty `objects` array renders an empty stage instead), and remounts the `Canvas` once on WebGL context loss via a `key` bump. Lighting is ambient plus directional plus a drei `Environment` built entirely from `Lightformer` children, so props and metal materials get a believable reflection with no HDRI fetched from a CDN:
  ```tsx
  import { useCallback, useMemo, useState } from "react";
  import { Canvas, type RootState } from "@react-three/fiber";
  import { Environment, Lightformer } from "@react-three/drei";

  import { findScene, findShot } from "@/domain/lookup";
  import { resolveSceneAll } from "@/domain/resolve";
  import type { Scene, Shot } from "@/domain/types";
  import { useDocumentStore } from "@/state/document-store";
  import { useEditorStore, type CameraMode } from "@/state/editor-store";
  import { usePlaybackStore } from "@/state/playback-store";
  import { Ground } from "@/viewport/Ground";
  import { SceneContents } from "@/viewport/SceneContents";
  import { OrbitRig } from "@/viewport/rigs/OrbitRig";
  import { PlanRig } from "@/viewport/rigs/PlanRig";
  import { ShotCameraRig } from "@/viewport/rigs/ShotCameraRig";

  type StageCanvasProps = { sceneId: string; shotId: string | null };

  /** Ambient + directional key light, plus a drei Environment built entirely
   * from Lightformer children so props and metal materials get a believable
   * reflection with no HDRI fetched from a CDN (the fix Film Planner's
   * viewer needed for metal materials rendering near black). */
  function Lighting() {
    return (
      <>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 4]} intensity={1.2} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation={[Math.PI / 2, 0, 0]} />
          <Lightformer form="rect" intensity={1} position={[-5, 2, 5]} scale={[5, 5, 1]} />
          <Lightformer form="rect" intensity={1} position={[5, 2, -5]} scale={[5, 5, 1]} rotation={[0, Math.PI, 0]} />
        </Environment>
      </>
    );
  }

  function pickRig(shotId: string | null, cameraMode: CameraMode, shot: Shot | null, t: number) {
    if (shotId !== null && shot !== null && cameraMode !== "orbit") {
      return <ShotCameraRig camera={shot.camera} t={t} />;
    }
    if (cameraMode === "plan") {
      return <PlanRig />;
    }
    return <OrbitRig />;
  }

  /** The one live canvas, mounted once by the stage layout. Reads the open
   * project, resolves the scene at the current shot and time through
   * resolveSceneAll (every set object stays mounted, hidden ones included),
   * and renders it. A WebGL context loss remounts the canvas once (a key
   * bump); an unknown scene id renders an empty stage rather than
   * throwing. */
  export function StageCanvas({ sceneId, shotId }: StageCanvasProps) {
    const project = useDocumentStore((s) => s.project);
    const cameraMode = useEditorStore((s) => s.cameraMode);
    const t = usePlaybackStore((s) => s.time);
    const [canvasKey, setCanvasKey] = useState(0);

    const scene: Scene | null = project ? findScene(project, sceneId) : null;
    const shot: Shot | null = project && shotId ? (findShot(project, shotId)?.shot ?? null) : null;

    const objects = useMemo(() => (scene ? resolveSceneAll(scene, shot, t) : []), [scene, shot, t]);

    const handleCreated = useCallback((state: RootState) => {
      state.gl.domElement.addEventListener(
        "webglcontextlost",
        (event) => {
          event.preventDefault();
          setCanvasKey((k) => k + 1);
        },
        { once: true }
      );
    }, []);

    return (
      <Canvas key={canvasKey} onCreated={handleCreated}>
        <Lighting />
        <Ground />
        <SceneContents objects={objects} />
        {pickRig(shotId, cameraMode, shot, t)}
      </Canvas>
    );
  }
  ```

- [ ] Run typecheck to confirm the new viewport files compile against the domain and state types from earlier tasks (no automated test exercises `StageCanvas` itself yet; see the manual check below):
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npm run typecheck
  ```
  Expected: no errors.
- [ ] Run the full viewport test suite once more to confirm nothing regressed:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/viewport
  ```
  Expected: 2 passed, 0 failed.
- [ ] Manual check in the browser (WebGL context loss and lighting are not practical to unit test): start the dev server, open a scene page with at least one primitive and one doll placed. Confirm neither mesh looks flat black (the `Environment`/`Lightformer` rig is providing reflection light, not just the ambient/directional pair). Open Chrome DevTools, go to the Rendering panel (or run `document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()` in the console), force a WebGL context loss, and confirm the canvas comes back (the `key` bump remounted it) rather than staying black or throwing a console error. Repeat in Safari. Note whether either browser handled the forced context loss differently (Safari's DevTools protected-content restrictions can make the manual `loseContext()` call unavailable; if so, note that context loss was checked in Chrome only, and file that gap rather than skip it silently).
- [ ] Commit:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/viewport/PrimitiveMesh.tsx src/viewport/DollMesh.tsx src/viewport/Ground.tsx src/viewport/SceneContents.tsx src/viewport/SceneContents.test.tsx src/viewport/StageCanvas.tsx src/viewport/rigs/ShotCameraRig.tsx src/viewport/rigs/OrbitRig.tsx src/viewport/rigs/PlanRig.tsx
  ```
  ```
  git commit -m "$(cat <<'EOF'
  feat: add the stage canvas, scene contents, meshes and rigs

  PrimitiveMesh and DollMesh ported from Film Planner and adapted to Vec3
  sizes, the wall shape, named obj: groups and a visible prop applied to
  that same group. ShotCameraRig and OrbitRig split out of Film Planner's
  camera-rigs.tsx. PlanRig rebuilt from Scene Builder v2's top-down mode
  using OrbitControls instead of MapControls. StageCanvas resolves the
  scene through resolveSceneAll, so every set object stays mounted with
  visible={object.visible} for Task 21's offscreen thumbnail render, never
  throws on an unknown scene id, and remounts once on WebGL context loss.
  Ground is named helper:ground so an offscreen render can hide it.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 17: Selection, gizmo, write-target routing

**Files:**
- Create: `src/viewport/transform-commit.ts`
- Create: `src/viewport/transform-commit.test.ts`
- Create: `src/viewport/Gizmo.tsx`
- Modify: `src/viewport/SceneContents.tsx` (full file shown again below)
- Modify: `src/viewport/StageCanvas.tsx` (full file shown again below)

**Interfaces:**
- Consumes: `EditTarget` from `src/state/object-actions.ts` (Task 13); `updateObject` from `src/state/object-actions.ts` (Task 13); `useDocumentStore` from `src/state/document-store.ts` (Task 12); `useEditorStore`, `WriteTarget`, `GizmoMode` from `src/state/editor-store.ts` (Task 15); `Vec3` from `src/domain/types.ts` (Task 4).
- Produces:
  ```ts
  export function editTargetFor(page: "scene" | "shot", writeTarget: WriteTarget, shotId: string | null): EditTarget;
  export function snapPosition(p: Vec3, step: number, enabled: boolean): Vec3;
  ```
  `Gizmo`, this task's other product, follows Task 16's `helper:` naming rule: it wraps its drei `TransformControls` in `<group name="helper:gizmo">`, so an offscreen thumbnail render (Task 21) can hide the gizmo by name the same way it hides `Ground`'s `helper:ground`. A hidden object is also never selectable and the gizmo never attaches to one; see the `SceneContents.tsx` and `StageCanvas.tsx` updates below.

Only `editTargetFor` and `snapPosition` are unit tested; both are pure. The click-to-select, drag-to-transform and commit-on-release behavior lives in `Gizmo.tsx` and the updated `SceneContents.tsx`/`StageCanvas.tsx`, and is verified by hand in the browser, per the manual check at the end of this task.

- [ ] Write the failing test file `src/viewport/transform-commit.test.ts`:
  ```ts
  import { describe, expect, it } from "vitest";

  import { editTargetFor, snapPosition } from "@/viewport/transform-commit";

  describe("editTargetFor", () => {
    it("is always the set on the scene page, regardless of the write-target switch", () => {
      expect(editTargetFor("scene", "set", null)).toEqual({ kind: "set" });
      expect(editTargetFor("scene", "shot", "shot-1")).toEqual({ kind: "set" });
    });

    it("follows the write-target switch on the shot page", () => {
      expect(editTargetFor("shot", "shot", "shot-1")).toEqual({ kind: "shot", shotId: "shot-1" });
      expect(editTargetFor("shot", "set", "shot-1")).toEqual({ kind: "set" });
    });

    it("falls back to the set on the shot page if no shot id is available", () => {
      expect(editTargetFor("shot", "shot", null)).toEqual({ kind: "set" });
    });
  });

  describe("snapPosition", () => {
    it("snaps to the nearest step when enabled", () => {
      const snapped = snapPosition([0.4, 0.9, -0.3], 0.25, true);
      expect(snapped[0]).toBeCloseTo(0.5, 5);
      expect(snapped[1]).toBeCloseTo(1, 5);
      expect(snapped[2]).toBeCloseTo(-0.25, 5);
    });

    it("returns the position unchanged when disabled", () => {
      expect(snapPosition([0.4, 0.9, -0.3], 0.25, false)).toEqual([0.4, 0.9, -0.3]);
    });

    it("returns the position unchanged for a non-positive step", () => {
      expect(snapPosition([0.4, 0.9, -0.3], 0, true)).toEqual([0.4, 0.9, -0.3]);
    });
  });
  ```
- [ ] Run the test and confirm it fails because the module does not exist yet:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/viewport/transform-commit.test.ts
  ```
  Expected: fails with a module resolution error, zero tests run.
- [ ] Write `src/viewport/transform-commit.ts`:
  ```ts
  import type { EditTarget } from "@/state/object-actions";
  import type { WriteTarget } from "@/state/editor-store";
  import type { Vec3 } from "@/domain/types";

  /** The scene page always writes to the set, regardless of the write-target
   * switch (that switch only exists on the shot page). On the shot page,
   * "set" writes the object's defaults and "shot" writes an override in the
   * current shot; if no shot id is available, fall back to the set rather
   * than writing to a shot that does not exist. */
  export function editTargetFor(page: "scene" | "shot", writeTarget: WriteTarget, shotId: string | null): EditTarget {
    if (page === "scene") return { kind: "set" };
    if (writeTarget === "shot" && shotId !== null) return { kind: "shot", shotId };
    return { kind: "set" };
  }

  /** Rounds each axis of p to the nearest multiple of step, unless disabled
   * (Alt held) or step is not a positive number, in which case p passes
   * through unchanged. */
  export function snapPosition(p: Vec3, step: number, enabled: boolean): Vec3 {
    if (!enabled || step <= 0) return p;
    const snap = (v: number) => Math.round(v / step) * step;
    return [snap(p[0]), snap(p[1]), snap(p[2])];
  }
  ```
- [ ] Run again and confirm all 6 tests pass:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/viewport/transform-commit.test.ts
  ```
  Expected: 6 passed, 0 failed.
- [ ] Commit the pure helpers on their own:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/viewport/transform-commit.ts src/viewport/transform-commit.test.ts
  ```
  ```
  git commit -m "$(cat <<'EOF'
  feat: add editTargetFor and snapPosition

  Pure helpers for the gizmo commit path: which EditTarget an edit goes to,
  and whether/how a translated position snaps to the 0.25 m grid.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] Write `src/viewport/Gizmo.tsx`. No automated test governs this file (drei's `TransformControls` needs a real WebGL drag to exercise; see the manual check below). It tracks whether Alt is held with its own window `keydown`/`keyup` listeners, since `TransformControls`' own mouse callbacks are three.js's internal drag events, not raw DOM events, and carry no modifier-key state. Its `TransformControls` is wrapped in `<group name="helper:gizmo">`, following the `helper:` naming rule from Task 16, so an offscreen thumbnail render (Task 21) can hide it by name:
  ```tsx
  import { useCallback, useEffect, useRef } from "react";
  import { TransformControls } from "@react-three/drei";
  import type { Group } from "three";

  import type { Vec3 } from "@/domain/types";
  import { useDocumentStore } from "@/state/document-store";
  import { useEditorStore, type GizmoMode } from "@/state/editor-store";
  import { updateObject } from "@/state/object-actions";
  import { editTargetFor, snapPosition } from "@/viewport/transform-commit";

  const TRANSLATE_SNAP_M = 0.25;

  type GizmoProps = {
    target: Group;
    objectId: string;
    sceneId: string;
    page: "scene" | "shot";
    shotId: string | null;
  };

  function axesFor(mode: GizmoMode): { showX: boolean; showY: boolean; showZ: boolean } {
    if (mode === "rotate") return { showX: false, showY: true, showZ: false }; // yaw only
    if (mode === "scale") return { showX: true, showY: false, showZ: false }; // single handle, read back as the uniform factor
    return { showX: true, showY: true, showZ: true };
  }

  /** Attaches drei TransformControls to the selected object's group. On drag
   * end it reads the group's local transform, snaps translation to 0.25 m
   * (off while Alt is held), and commits through updateObject with the
   * target picked by editTargetFor. Rotate shows only the Y handle (yaw
   * only); scale shows only the X handle, read back as transform.scale's
   * single uniform number. */
  export function Gizmo({ target, objectId, sceneId, page, shotId }: GizmoProps) {
    const gizmoMode = useEditorStore((s) => s.gizmoMode);
    const writeTarget = useEditorStore((s) => s.writeTarget);
    const altHeld = useRef(false);

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Alt") altHeld.current = true;
      };
      const onKeyUp = (event: KeyboardEvent) => {
        if (event.key === "Alt") altHeld.current = false;
      };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
      };
    }, []);

    const commit = useCallback(() => {
      const rawPosition: Vec3 = [target.position.x, target.position.y, target.position.z];
      const snapped =
        gizmoMode === "translate" ? snapPosition(rawPosition, TRANSLATE_SNAP_M, !altHeld.current) : rawPosition;
      target.position.set(snapped[0], snapped[1], snapped[2]);

      const editTarget = editTargetFor(page, writeTarget, shotId);
      useDocumentStore.getState().apply((draft) => {
        updateObject(
          draft,
          sceneId,
          objectId,
          {
            transform: {
              position: snapped,
              rotationY: target.rotation.y,
              scale: target.scale.x,
            },
          },
          editTarget
        );
      });
    }, [target, gizmoMode, page, writeTarget, shotId, sceneId, objectId]);

    const axes = axesFor(gizmoMode);

    return (
      <group name="helper:gizmo">
        <TransformControls
          object={target}
          mode={gizmoMode}
          showX={axes.showX}
          showY={axes.showY}
          showZ={axes.showZ}
          onMouseUp={commit}
        />
      </group>
    );
  }
  ```

- [ ] Update `src/viewport/SceneContents.tsx` to add click selection and node registration. A hidden object (`object.visible === false`, kept in the array by `resolveSceneAll`) must not be selectable, so its click handler returns before the click-slop check even runs. Write the complete file (replaces the Task 16 version):
  ```tsx
  import type { ThreeEvent } from "@react-three/fiber";
  import type { Group } from "three";

  import type { StageObject } from "@/domain/types";
  import { DollMesh } from "@/viewport/DollMesh";
  import { PrimitiveMesh } from "@/viewport/PrimitiveMesh";

  type SceneContentsProps = {
    objects: StageObject[];
    selectedId?: string | null;
    onSelect?: (id: string) => void;
    registerNode?: (id: string, node: Group | null) => void;
  };

  const CLICK_SLOP = 4;

  /** Renders resolveSceneAll's output as meshes: every set object, always
   * mounted, hidden ones included. Each object's root group is named
   * "obj:<id>" and carries visible={object.visible}, so both tests and the
   * gizmo can find it in the scene graph whether or not it is drawn right
   * now. Props kind is not rendered until S2; it is skipped here. A click
   * on a hidden object, or one that traveled more than CLICK_SLOP pixels
   * (an orbit or gizmo drag), does not change the selection. */
  export function SceneContents({ objects, selectedId = null, onSelect, registerNode }: SceneContentsProps) {
    const handleSelect = (id: string, visible: boolean) => (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (!visible) return;
      if (event.delta > CLICK_SLOP) return;
      onSelect?.(id);
    };

    return (
      <>
        {objects.map((object) => {
          if (object.kind === "doll") {
            return (
              <DollMesh
                key={object.id}
                object={object}
                selected={object.id === selectedId}
                visible={object.visible}
                onSelect={handleSelect(object.id, object.visible)}
                ref={(node) => registerNode?.(object.id, node)}
              />
            );
          }
          if (object.kind === "primitive") {
            return (
              <PrimitiveMesh
                key={object.id}
                object={object}
                visible={object.visible}
                onSelect={handleSelect(object.id, object.visible)}
                ref={(node) => registerNode?.(object.id, node)}
              />
            );
          }
          return null;
        })}
      </>
    );
  }
  ```
- [ ] Run the Task 16 `SceneContents` tests again to confirm the new optional props did not break the existing behavior (they default to no selection and no handlers, matching the old call sites):
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/viewport/SceneContents.test.tsx
  ```
  Expected: 2 passed, 0 failed.

- [ ] Update `src/viewport/StageCanvas.tsx` to track selection, register object nodes, clear selection on an empty click, and render the `Gizmo` when something is selected. The gizmo must never attach to a hidden object, so its render is gated on the selected object's own resolved `visible` flag, not just on there being a selection. Write the complete file (replaces the Task 16 version):
  ```tsx
  import { useCallback, useMemo, useRef, useState } from "react";
  import { Canvas, type RootState } from "@react-three/fiber";
  import { Environment, Lightformer } from "@react-three/drei";
  import type { Group } from "three";

  import { findScene, findShot } from "@/domain/lookup";
  import { resolveSceneAll } from "@/domain/resolve";
  import type { Scene, Shot } from "@/domain/types";
  import { useDocumentStore } from "@/state/document-store";
  import { useEditorStore, type CameraMode } from "@/state/editor-store";
  import { usePlaybackStore } from "@/state/playback-store";
  import { Ground } from "@/viewport/Ground";
  import { Gizmo } from "@/viewport/Gizmo";
  import { SceneContents } from "@/viewport/SceneContents";
  import { OrbitRig } from "@/viewport/rigs/OrbitRig";
  import { PlanRig } from "@/viewport/rigs/PlanRig";
  import { ShotCameraRig } from "@/viewport/rigs/ShotCameraRig";

  type StageCanvasProps = { sceneId: string; shotId: string | null };

  const CLICK_SLOP = 4;

  function Lighting() {
    return (
      <>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 4]} intensity={1.2} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation={[Math.PI / 2, 0, 0]} />
          <Lightformer form="rect" intensity={1} position={[-5, 2, 5]} scale={[5, 5, 1]} />
          <Lightformer form="rect" intensity={1} position={[5, 2, -5]} scale={[5, 5, 1]} rotation={[0, Math.PI, 0]} />
        </Environment>
      </>
    );
  }

  function pickRig(shotId: string | null, cameraMode: CameraMode, shot: Shot | null, t: number) {
    if (shotId !== null && shot !== null && cameraMode !== "orbit") {
      return <ShotCameraRig camera={shot.camera} t={t} />;
    }
    if (cameraMode === "plan") {
      return <PlanRig />;
    }
    return <OrbitRig />;
  }

  /** The one live canvas, mounted once by the stage layout. */
  export function StageCanvas({ sceneId, shotId }: StageCanvasProps) {
    const project = useDocumentStore((s) => s.project);
    const cameraMode = useEditorStore((s) => s.cameraMode);
    const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
    const select = useEditorStore((s) => s.select);
    const t = usePlaybackStore((s) => s.time);
    const [canvasKey, setCanvasKey] = useState(0);

    const scene: Scene | null = project ? findScene(project, sceneId) : null;
    const shot: Shot | null = project && shotId ? (findShot(project, shotId)?.shot ?? null) : null;

    const objects = useMemo(() => (scene ? resolveSceneAll(scene, shot, t) : []), [scene, shot, t]);
    const selectedObject = selectedObjectId ? (objects.find((o) => o.id === selectedObjectId) ?? null) : null;

    const nodesRef = useRef(new Map<string, Group>());
    const registerNode = useCallback((id: string, node: Group | null) => {
      if (node) nodesRef.current.set(id, node);
      else nodesRef.current.delete(id);
    }, []);
    const selectedNode = selectedObjectId ? (nodesRef.current.get(selectedObjectId) ?? null) : null;

    const pointerDownAt = useRef<{ x: number; y: number } | null>(null);
    const handlePointerDown = useCallback((event: { clientX: number; clientY: number }) => {
      pointerDownAt.current = { x: event.clientX, y: event.clientY };
    }, []);
    const handlePointerMissed = useCallback(
      (event: MouseEvent) => {
        const down = pointerDownAt.current;
        if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > CLICK_SLOP) return;
        select(null);
      },
      [select]
    );

    const handleCreated = useCallback((state: RootState) => {
      state.gl.domElement.addEventListener(
        "webglcontextlost",
        (event) => {
          event.preventDefault();
          setCanvasKey((k) => k + 1);
        },
        { once: true }
      );
    }, []);

    const page: "scene" | "shot" = shotId === null ? "scene" : "shot";

    return (
      <Canvas
        key={canvasKey}
        onCreated={handleCreated}
        onPointerDown={handlePointerDown}
        onPointerMissed={handlePointerMissed}
      >
        <Lighting />
        <Ground />
        <SceneContents objects={objects} selectedId={selectedObjectId} onSelect={select} registerNode={registerNode} />
        {scene && selectedNode && selectedObjectId && selectedObject?.visible && (
          <Gizmo target={selectedNode} objectId={selectedObjectId} sceneId={scene.id} page={page} shotId={shotId} />
        )}
        {pickRig(shotId, cameraMode, shot, t)}
      </Canvas>
    );
  }
  ```
- [ ] Run typecheck and the full viewport test suite to confirm nothing regressed:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npm run typecheck && npx vitest run src/viewport
  ```
  Expected: typecheck clean, 8 passed, 0 failed (the 2 `SceneContents` tests plus the 6 `transform-commit` tests).
- [ ] Manual check in the browser (click selection, drag, snap and axis locking need a real pointer and WebGL, so none of this is covered by the automated suite): on the scene page, click a placed box to select it; confirm a translate gizmo appears at its origin. Drag it and release; confirm the box's new position is a multiple of 0.25 m (reload the page and check the position in the inspector once Task 20 exists, or check IndexedDB directly via the browser's Application tab, sb3d database, projects store, in the meantime). Click empty ground; confirm the gizmo disappears and nothing is selected. Reselect the box, hold Alt, drag, release; confirm the new position is not snapped to the grid. Press `E` for rotate (once Task 22 wires the shortcut; until then, switch gizmo mode by hand if a control exists, or skip this half of the check and revisit it during Task 22's verification) and confirm only a single ring (yaw) shows, not three. Press `R` for scale (same caveat) and confirm only one handle shows, and that dragging it changes the box uniformly (width, height and depth all grow together), not just one axis. On the shot page, switch the write-target switch to "This shot" (once Task 20 builds it; until then, call `useEditorStore.getState().setWriteTarget("shot")` from the browser console), move the box, open a different shot in the strip, and confirm the box did not move there. Add an object with "only in this shot" (once Task 20's palette exists; until then, add it through `addObject` with `onlyInShotId` from the console) so it is hidden by default, switch to the scene page, click where it stands, and confirm nothing is selected and no gizmo appears, since a hidden object cannot be picked. Repeat the click/drag/snap portion of this check in both Chrome and Safari.
- [ ] Commit:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/viewport/Gizmo.tsx src/viewport/SceneContents.tsx src/viewport/StageCanvas.tsx
  ```
  ```
  git commit -m "$(cat <<'EOF'
  feat: add selection, gizmo and write-target routing

  StageCanvas tracks selection and object nodes, clears selection on an
  empty click, and renders Gizmo only when the selected object's resolved
  visible is true, since resolveSceneAll keeps hidden objects mounted and
  a hidden object must never be selectable or draggable. Gizmo snaps
  translation to 0.25 m (off while Alt is held), locks rotate to yaw and
  scale to a single uniform handle, commits through updateObject with the
  EditTarget editTargetFor picks for the page and write-target switch, and
  wraps its TransformControls in a helper:gizmo group so an offscreen
  render can hide it.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 18: Framing the shot camera

**Files:**
- Modify: `src/viewport/transform-commit.ts` (adds `framingFromControls`)
- Modify: `src/viewport/transform-commit.test.ts` (full file shown again below)
- Modify: `src/viewport/rigs/ShotCameraRig.tsx` (full file shown again below)
- Modify: `src/viewport/StageCanvas.tsx` (full file shown again below)

**Interfaces:**
- Consumes: `Vec3`, `Framing` from `src/domain/types.ts` (Task 4); `cameraAt` from `src/domain/resolve.ts` (Task 6); `lensToVFovDeg` from `src/domain/lens.ts` (Task 5); `setShotFraming` from `src/state/shot-actions.ts` (Task 14); `useDocumentStore` from `src/state/document-store.ts` (Task 12).
- Produces:
  ```ts
  export function framingFromControls(cameraPosition: Vec3, target: Vec3): Framing;
  ```
  `framingFromControls` lives in `src/viewport/transform-commit.ts` (created in Task 17), beside `editTargetFor` and `snapPosition`. It is not in the contract's Shared Interfaces block (no other task imports it by name), so this file, already this plan's home for pure viewport commit helpers, is where it stays.

- [ ] Add the failing test to `src/viewport/transform-commit.test.ts`. Write the complete file (replaces the Task 17 version):
  ```ts
  import { describe, expect, it } from "vitest";

  import { editTargetFor, framingFromControls, snapPosition } from "@/viewport/transform-commit";

  describe("editTargetFor", () => {
    it("is always the set on the scene page, regardless of the write-target switch", () => {
      expect(editTargetFor("scene", "set", null)).toEqual({ kind: "set" });
      expect(editTargetFor("scene", "shot", "shot-1")).toEqual({ kind: "set" });
    });

    it("follows the write-target switch on the shot page", () => {
      expect(editTargetFor("shot", "shot", "shot-1")).toEqual({ kind: "shot", shotId: "shot-1" });
      expect(editTargetFor("shot", "set", "shot-1")).toEqual({ kind: "set" });
    });

    it("falls back to the set on the shot page if no shot id is available", () => {
      expect(editTargetFor("shot", "shot", null)).toEqual({ kind: "set" });
    });
  });

  describe("snapPosition", () => {
    it("snaps to the nearest step when enabled", () => {
      const snapped = snapPosition([0.4, 0.9, -0.3], 0.25, true);
      expect(snapped[0]).toBeCloseTo(0.5, 5);
      expect(snapped[1]).toBeCloseTo(1, 5);
      expect(snapped[2]).toBeCloseTo(-0.25, 5);
    });

    it("returns the position unchanged when disabled", () => {
      expect(snapPosition([0.4, 0.9, -0.3], 0.25, false)).toEqual([0.4, 0.9, -0.3]);
    });

    it("returns the position unchanged for a non-positive step", () => {
      expect(snapPosition([0.4, 0.9, -0.3], 0, true)).toEqual([0.4, 0.9, -0.3]);
    });
  });

  describe("framingFromControls", () => {
    it("rounds both the camera position and the controls target to 3 decimals", () => {
      const framing = framingFromControls([1.23456, 2.00001, -0.5006], [0.1234, 0, 0.9995]);
      expect(framing.position).toEqual([1.235, 2, -0.501]);
      expect(framing.aim).toEqual([0.123, 0, 1]);
    });
  });
  ```
- [ ] Run the test and confirm the new case fails because `framingFromControls` is not exported yet, the earlier 6 still pass:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/viewport/transform-commit.test.ts
  ```
  Expected: 6 passed, 1 failed (`framingFromControls is not a function`, or a TypeScript error on import).
- [ ] Add `framingFromControls` to `src/viewport/transform-commit.ts` (append at the end, after `snapPosition`, and add `Framing` to the type-only import from `@/domain/types`):
  ```ts
  /** Builds a Framing from a live camera position and an OrbitControls
   * target, rounding both to 3 decimals so tiny floating-point drift from
   * an orbit/pan/dolly drag does not turn into a no-op-looking history
   * entry that still bumps updatedAt. */
  export function framingFromControls(cameraPosition: Vec3, target: Vec3): Framing {
    const round3 = (v: number) => Math.round(v * 1000) / 1000;
    return {
      position: [round3(cameraPosition[0]), round3(cameraPosition[1]), round3(cameraPosition[2])],
      aim: [round3(target[0]), round3(target[1]), round3(target[2])],
    };
  }
  ```
  and update the top import line to:
  ```ts
  import type { EditTarget } from "@/state/object-actions";
  import type { WriteTarget } from "@/state/editor-store";
  import type { Framing, Vec3 } from "@/domain/types";
  ```
- [ ] Run again and confirm all 7 tests pass:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npx vitest run src/viewport/transform-commit.test.ts
  ```
  Expected: 7 passed, 0 failed.
- [ ] Commit the helper on its own:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/viewport/transform-commit.ts src/viewport/transform-commit.test.ts
  ```
  ```
  git commit -m "$(cat <<'EOF'
  feat: add framingFromControls

  Pure helper turning a live camera position and OrbitControls target into
  a rounded Framing, used by ShotCameraRig's framing commit.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] Update `src/viewport/rigs/ShotCameraRig.tsx` to add interactive framing. When `interactive` (the shot page, camera mode `shot`), a drei `OrbitControls` lets the user orbit, pan and dolly the shot camera around its aim point; the controls' target is synced imperatively from the committed aim inside the same effect that positions the camera, not passed as a reactive prop, so a live drag is not fought by React re-rendering the same aim back onto it every frame. On the controls' `end` event, the new camera position and controls target are committed as the shot's single position and aim key through `setShotFraming`. Write the complete file (replaces the Task 16 version):
  ```tsx
  import { useCallback, useLayoutEffect, useRef } from "react";
  import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
  import type { PerspectiveCamera as ThreePerspectiveCamera } from "three";
  import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

  import { lensToVFovDeg } from "@/domain/lens";
  import { cameraAt } from "@/domain/resolve";
  import type { ShotCamera } from "@/domain/types";
  import { useDocumentStore } from "@/state/document-store";
  import { setShotFraming } from "@/state/shot-actions";
  import { framingFromControls } from "@/viewport/transform-commit";

  type ShotCameraRigProps = {
    camera: ShotCamera;
    t: number;
    sceneId: string;
    shotId: string;
    interactive: boolean;
  };

  /**
   * The shot camera itself: a PerspectiveCamera made default, positioned at
   * cameraAt(camera, t) and looking at its aim, with the fov derived from
   * the lens focal length. When interactive (the shot page in shot camera
   * mode), drei OrbitControls lets the user orbit, pan and dolly the camera
   * around its aim point; on the controls' end event the new position and
   * target are committed as the shot's single position and aim key through
   * setShotFraming.
   */
  export function ShotCameraRig({ camera, t, sceneId, shotId, interactive }: ShotCameraRigProps) {
    const cameraRef = useRef<ThreePerspectiveCamera>(null);
    const controlsRef = useRef<OrbitControlsImpl>(null);
    const { position, aim } = cameraAt(camera, t);
    const [px, py, pz] = position;
    const [ax, ay, az] = aim;

    useLayoutEffect(() => {
      const cam = cameraRef.current;
      if (!cam) return;
      cam.position.set(px, py, pz);
      cam.lookAt(ax, ay, az);
      controlsRef.current?.target.set(ax, ay, az);
    }, [px, py, pz, ax, ay, az]);

    const handleEnd = useCallback(() => {
      const cam = cameraRef.current;
      const controls = controlsRef.current;
      if (!cam || !controls) return;
      const framing = framingFromControls(
        [cam.position.x, cam.position.y, cam.position.z],
        [controls.target.x, controls.target.y, controls.target.z]
      );
      useDocumentStore.getState().apply((draft) => {
        setShotFraming(draft, sceneId, shotId, framing);
      });
    }, [sceneId, shotId]);

    return (
      <>
        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          fov={lensToVFovDeg(camera.lensMm)}
          position={[px, py, pz]}
          near={0.1}
          far={200}
        />
        {interactive && <OrbitControls ref={controlsRef} makeDefault onEnd={handleEnd} />}
      </>
    );
  }
  ```

- [ ] Update `src/viewport/StageCanvas.tsx` to pass `sceneId`, `shotId` and `interactive` into `ShotCameraRig`. Write the complete file (replaces the Task 17 version; only `pickRig`'s signature and the `ShotCameraRig` branch change, everything else, including the `resolveSceneAll` resolve call and the `selectedObject?.visible` gate on `Gizmo`, carries over unchanged from Task 17):
  ```tsx
  import { useCallback, useMemo, useRef, useState } from "react";
  import { Canvas, type RootState } from "@react-three/fiber";
  import { Environment, Lightformer } from "@react-three/drei";
  import type { Group } from "three";

  import { findScene, findShot } from "@/domain/lookup";
  import { resolveSceneAll } from "@/domain/resolve";
  import type { Scene, Shot } from "@/domain/types";
  import { useDocumentStore } from "@/state/document-store";
  import { useEditorStore, type CameraMode } from "@/state/editor-store";
  import { usePlaybackStore } from "@/state/playback-store";
  import { Ground } from "@/viewport/Ground";
  import { Gizmo } from "@/viewport/Gizmo";
  import { SceneContents } from "@/viewport/SceneContents";
  import { OrbitRig } from "@/viewport/rigs/OrbitRig";
  import { PlanRig } from "@/viewport/rigs/PlanRig";
  import { ShotCameraRig } from "@/viewport/rigs/ShotCameraRig";

  type StageCanvasProps = { sceneId: string; shotId: string | null };

  const CLICK_SLOP = 4;

  function Lighting() {
    return (
      <>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 4]} intensity={1.2} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation={[Math.PI / 2, 0, 0]} />
          <Lightformer form="rect" intensity={1} position={[-5, 2, 5]} scale={[5, 5, 1]} />
          <Lightformer form="rect" intensity={1} position={[5, 2, -5]} scale={[5, 5, 1]} rotation={[0, Math.PI, 0]} />
        </Environment>
      </>
    );
  }

  function pickRig(sceneId: string, shotId: string | null, cameraMode: CameraMode, shot: Shot | null, t: number) {
    if (shotId !== null && shot !== null && cameraMode !== "orbit") {
      return (
        <ShotCameraRig
          camera={shot.camera}
          t={t}
          sceneId={sceneId}
          shotId={shotId}
          interactive={cameraMode === "shot"}
        />
      );
    }
    if (cameraMode === "plan") {
      return <PlanRig />;
    }
    return <OrbitRig />;
  }

  /** The one live canvas, mounted once by the stage layout. */
  export function StageCanvas({ sceneId, shotId }: StageCanvasProps) {
    const project = useDocumentStore((s) => s.project);
    const cameraMode = useEditorStore((s) => s.cameraMode);
    const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
    const select = useEditorStore((s) => s.select);
    const t = usePlaybackStore((s) => s.time);
    const [canvasKey, setCanvasKey] = useState(0);

    const scene: Scene | null = project ? findScene(project, sceneId) : null;
    const shot: Shot | null = project && shotId ? (findShot(project, shotId)?.shot ?? null) : null;

    const objects = useMemo(() => (scene ? resolveSceneAll(scene, shot, t) : []), [scene, shot, t]);
    const selectedObject = selectedObjectId ? (objects.find((o) => o.id === selectedObjectId) ?? null) : null;

    const nodesRef = useRef(new Map<string, Group>());
    const registerNode = useCallback((id: string, node: Group | null) => {
      if (node) nodesRef.current.set(id, node);
      else nodesRef.current.delete(id);
    }, []);
    const selectedNode = selectedObjectId ? (nodesRef.current.get(selectedObjectId) ?? null) : null;

    const pointerDownAt = useRef<{ x: number; y: number } | null>(null);
    const handlePointerDown = useCallback((event: { clientX: number; clientY: number }) => {
      pointerDownAt.current = { x: event.clientX, y: event.clientY };
    }, []);
    const handlePointerMissed = useCallback(
      (event: MouseEvent) => {
        const down = pointerDownAt.current;
        if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > CLICK_SLOP) return;
        select(null);
      },
      [select]
    );

    const handleCreated = useCallback((state: RootState) => {
      state.gl.domElement.addEventListener(
        "webglcontextlost",
        (event) => {
          event.preventDefault();
          setCanvasKey((k) => k + 1);
        },
        { once: true }
      );
    }, []);

    const page: "scene" | "shot" = shotId === null ? "scene" : "shot";

    return (
      <Canvas
        key={canvasKey}
        onCreated={handleCreated}
        onPointerDown={handlePointerDown}
        onPointerMissed={handlePointerMissed}
      >
        <Lighting />
        <Ground />
        <SceneContents objects={objects} selectedId={selectedObjectId} onSelect={select} registerNode={registerNode} />
        {scene && selectedNode && selectedObjectId && selectedObject?.visible && (
          <Gizmo target={selectedNode} objectId={selectedObjectId} sceneId={scene.id} page={page} shotId={shotId} />
        )}
        {pickRig(scene?.id ?? sceneId, shotId, cameraMode, shot, t)}
      </Canvas>
    );
  }
  ```
  The lens field itself (a number input calling `setShotLens`, already implemented in Task 14) lives in the shot page's `Inspector`, which is Task 20's job, not this one. This task only guarantees the rig reads whatever lens is stored, through `lensToVFovDeg`, which it already does.
- [ ] Run typecheck and the full viewport test suite to confirm nothing regressed:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npm run typecheck && npx vitest run src/viewport
  ```
  Expected: typecheck clean, 9 passed, 0 failed (2 `SceneContents` tests plus 7 `transform-commit` tests).
- [ ] Manual check in the browser (drag-to-frame and the commit it produces need a real pointer and WebGL, so this is not covered by the automated suite; the Inspector this would normally show up in does not exist until Task 20, so read the result from storage directly): open a shot page, confirm the camera mode is `shot` (the default is `orbit`; call `useEditorStore.getState().setCameraMode("shot")` from the browser console until Task 20's toggle exists), drag to orbit around the shot camera's aim point, pan (right mouse or two-finger drag depending on the trackpad), dolly (scroll or pinch), and release. Open the browser's Application tab, IndexedDB, the `sb3d` database, the `projects` store, and confirm the shot's `camera.position[0].value` and `camera.aim[0].value` changed to match the new framing (autosave writes within 500 ms of the release). Reload the page and confirm the shot opens with the same framing rather than reverting. Switch camera mode to `orbit` and confirm the shot camera freezes in place while a separate free-orbit camera takes over. Repeat this whole check in both Chrome and Safari.
- [ ] Commit:
  ```
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/viewport/rigs/ShotCameraRig.tsx src/viewport/StageCanvas.tsx
  ```
  ```
  git commit -m "$(cat <<'EOF'
  feat: frame the shot camera by dragging it

  ShotCameraRig gains an interactive mode: OrbitControls orbits, pans and
  dollies the shot camera around its aim point, and on release the new
  position and target are committed through setShotFraming.

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 19: Router, projects, board, project layout

**Files:**
- Create: `src/app/router.tsx`
- Create: `src/app/routes/ProjectsPage.tsx`
- Create: `src/app/routes/ProjectsPage.test.tsx`
- Create: `src/app/routes/ProjectLayout.tsx`
- Create: `src/app/routes/ProjectLayout.test.tsx`
- Create: `src/app/routes/BoardPage.tsx`
- Create: `src/app/routes/BoardPage.test.tsx`
- Create: `src/app/routes/PropsPage.tsx`
- Create: `src/app/routes/PropsPage.test.tsx`
- Create: `src/app/components/SaveBanner.tsx`
- Create: `src/app/components/ReadOnlyNotice.tsx`
- Modify: `src/main.tsx`

**Interfaces:**

Consumes (exact signatures from the contract):
```ts
// src/storage/project-repo.ts
export type ProjectSummary = { id: string; name: string; updatedAt: string; sceneCount: number };
export function listProjects(): Promise<ProjectSummary[]>;
export function loadProject(id: string): Promise<Project | null>;
export function saveProject(project: Project): Promise<void>;
export function deleteProject(id: string): Promise<void>;

// src/storage/export-import.ts
export function exportProjectJson(project: Project): Blob;
export function exportFileName(project: Project): string;
export function importProjectJson(file: Blob): Promise<Project>;

// src/storage/autosave.ts
export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
export function createAutosaver(opts: {
  save: (project: Project) => Promise<void>;
  delayMs?: number;
  onStatus: (status: SaveStatus, failures: number) => void;
}): { schedule(project: Project): void; flush(): Promise<void>; dispose(): void };

// src/storage/project-lock.ts
export function acquireProjectLock(projectId: string): Promise<{ readOnly: boolean; release: () => void }>;

// src/storage/db.ts
export function resetDbForTests(): Promise<void>;

// src/domain/factories.ts
export function createProject(name: string): Project;

// src/state/document-store.ts
export const useDocumentStore: UseBoundStore<StoreApi<DocumentState>>;
export function setAutosaver(a: { schedule(p: Project): void } | null): void;

// src/state/shot-actions.ts
export function addScene(draft: Project, name: string): string;

// src/app/components/ThemeToggle.tsx (produced by Task 2)
export function ThemeToggle(): JSX.Element;
```

Produces:
```ts
// src/app/router.tsx
export const router: ReturnType<typeof createBrowserRouter>;

// src/app/routes/ProjectsPage.tsx
export function ProjectsPage(): JSX.Element;

// src/app/routes/ProjectLayout.tsx
export function ProjectLayout(): JSX.Element;

// src/app/routes/BoardPage.tsx
export function BoardPage(): JSX.Element | null;

// src/app/routes/PropsPage.tsx
export function PropsPage(): JSX.Element;

// src/app/components/SaveBanner.tsx
export function SaveBanner(props: { project: Project; failures: number }): JSX.Element;

// src/app/components/ReadOnlyNotice.tsx
export function ReadOnlyNotice(): JSX.Element;
```

This task ends the S0 placeholder `App`. `router.tsx` here only wires `/` and `/p/:projectId` with its `index` and `props` children. Task 20 modifies `router.tsx` again to add the pathless stage layout branch, once `StageLayout`, `ScenePage` and `ShotPage` exist.

- [ ] **Install the router and the packages the app imports directly.** These packages are imported by this task and by later ones, and no earlier task installs them.

  ```bash
  cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && npm install react-router lucide-react sonner && npm install -D @testing-library/user-event
  ```

  Expected: `react-router`, `lucide-react` and `sonner` appear under `dependencies` and `@testing-library/user-event` under `devDependencies`. `lucide-react` and `sonner` were already present as dependencies of `@weeeha/ui`. The app imports them directly, so it declares them itself. Match the versions in `packages/ui/package.json` so npm keeps one copy of each.

- [ ] Write the failing test for the projects list, `src/app/routes/ProjectsPage.test.tsx`:

```tsx
import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { ProjectsPage } from "./ProjectsPage";

function renderProjectsPage() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <ProjectsPage /> },
      { path: "/p/:projectId", element: <div>project page</div> },
    ],
    { initialEntries: ["/"] }
  );
  render(<RouterProvider router={router} />);
}

beforeEach(async () => {
  await resetDbForTests();
});

describe("ProjectsPage", () => {
  it("shows the empty state with no projects", async () => {
    renderProjectsPage();
    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
  });

  it("creates a project from the dialog and opens it", async () => {
    const user = userEvent.setup();
    renderProjectsPage();
    await screen.findByText("No projects yet");

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("Project name"), "Job Smith");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("project page")).toBeInTheDocument();
  });

  it("lists an existing project and deletes it with confirmation", async () => {
    const user = userEvent.setup();
    const { createProject } = await import("@/domain/factories");
    const { saveProject } = await import("@/storage/project-repo");
    const project = createProject("Job Smith");
    await saveProject(project);

    renderProjectsPage();
    expect(await screen.findByText("Job Smith")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Job Smith" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
  });

  it("imports a project from a file", async () => {
    const user = userEvent.setup();
    const { createProject } = await import("@/domain/factories");
    const { exportProjectJson } = await import("@/storage/export-import");
    const source = createProject("Exported film");
    const blob = exportProjectJson(source);
    const file = new File([await blob.text()], "exported-film.sb3d.json", {
      type: "application/json",
    });

    renderProjectsPage();
    await screen.findByText("No projects yet");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(await screen.findByText("project page")).toBeInTheDocument();
  });
});
```

- [ ] Run `npx vitest run "src/app/routes/ProjectsPage.test.tsx"` from `/Users/nickv/ClaudeCode Projects/scene-builder-3d`. Expected failure: the suite fails to resolve `./ProjectsPage`, since `src/app/routes/ProjectsPage.tsx` does not exist yet.

- [ ] Write `src/app/routes/ProjectsPage.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "@weeeha/ui/components/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "@weeeha/ui/components/card";
import { Badge } from "@weeeha/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@weeeha/ui/components/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@weeeha/ui/components/alert-dialog";
import { Field, FieldLabel, FieldContent } from "@weeeha/ui/components/field";
import { Input } from "@weeeha/ui/components/input";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@weeeha/ui/components/empty";
import { Skeleton } from "@weeeha/ui/components/skeleton";
import { toast } from "sonner";
import { FolderOpen, Plus, Trash2, Upload } from "lucide-react";

import { listProjects, saveProject, deleteProject } from "@/storage/project-repo";
import type { ProjectSummary } from "@/storage/project-repo";
import { importProjectJson } from "@/storage/export-import";
import { createProject } from "@/domain/factories";
import { ThemeToggle } from "@/app/components/ThemeToggle";

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<ProjectSummary[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    listProjects().then(setSummaries);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const project = createProject(trimmed);
    await saveProject(project);
    setCreateOpen(false);
    setName("");
    navigate(`/p/${project.id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    refresh();
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const project = await importProjectJson(file);
      await saveProject(project);
      navigate(`/p/${project.id}`);
    } catch {
      toast.error("That file could not be imported.");
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-medium">Projects</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportChange}
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus />
                New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Name the project</DialogTitle>
              </DialogHeader>
              <Field>
                <FieldLabel htmlFor="project-name">Project name</FieldLabel>
                <FieldContent>
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreate();
                      }
                    }}
                    autoFocus
                  />
                </FieldContent>
              </Field>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!name.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {summaries === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : summaries.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpen />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create a project to start dressing a set and framing shots.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              New project
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {summaries.map((summary) => (
            <li key={summary.id}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Link to={`/p/${summary.id}`} className="hover:underline">
                      {summary.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    Updated {formatUpdatedAt(summary.updatedAt)}
                  </CardDescription>
                  <CardAction>
                    <Badge variant="outline">{summary.sceneCount} scenes</Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${summary.name}`}
                      >
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this project</AlertDialogTitle>
                        <AlertDialogDescription>
                          This deletes {summary.name} and its blobs. This cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(summary.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] Run `npx vitest run "src/app/routes/ProjectsPage.test.tsx"`. Expected pass: 4 passed, 0 failed.

- [ ] Write `src/app/components/SaveBanner.tsx`:

```tsx
import { Alert, AlertTitle, AlertDescription, AlertAction } from "@weeeha/ui/components/alert";
import { Button } from "@weeeha/ui/components/button";
import { TriangleAlert, Download } from "lucide-react";

import { exportProjectJson, exportFileName } from "@/storage/export-import";
import type { Project } from "@/domain/types";

function downloadProject(project: Project) {
  const blob = exportProjectJson(project);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFileName(project);
  link.click();
  URL.revokeObjectURL(url);
}

export function SaveBanner({ project, failures }: { project: Project; failures: number }) {
  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
      <TriangleAlert />
      <AlertTitle>Changes are not being saved</AlertTitle>
      <AlertDescription>
        {failures} save attempts have failed in a row. Export a backup while this is
        unresolved.
      </AlertDescription>
      <AlertAction>
        <Button size="sm" variant="outline" onClick={() => downloadProject(project)}>
          <Download />
          Export
        </Button>
      </AlertAction>
    </Alert>
  );
}
```

- [ ] Write `src/app/components/ReadOnlyNotice.tsx`:

```tsx
import { Alert, AlertTitle, AlertDescription } from "@weeeha/ui/components/alert";
import { Lock } from "lucide-react";

export function ReadOnlyNotice() {
  return (
    <Alert className="rounded-none border-x-0 border-t-0">
      <Lock />
      <AlertTitle>Read-only</AlertTitle>
      <AlertDescription>
        This project is open in another tab. Changes here will not be saved.
      </AlertDescription>
    </Alert>
  );
}
```

- [ ] Write the failing test for the project shell, `src/app/routes/ProjectLayout.test.tsx`:

```tsx
import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { saveProject } from "@/storage/project-repo";
import { acquireProjectLock } from "@/storage/project-lock";
import { useDocumentStore } from "@/state/document-store";
import { ProjectLayout } from "./ProjectLayout";

// A minimal, spec-faithful fake of the Web Locks API: request(name, options,
// callback) holds the named lock until the callback's returned promise
// settles, and honors ifAvailable by handing the callback null when the name
// is already held. Any correct acquireProjectLock built on the real API works
// against this fake without knowing its internal lock-name convention.
function installFakeLockManager() {
  const held = new Set<string>();
  (globalThis.navigator as unknown as { locks: unknown }).locks = {
    async request(
      name: string,
      optionsOrCallback: { ifAvailable?: boolean } | ((lock: { name: string } | null) => unknown),
      maybeCallback?: (lock: { name: string } | null) => unknown
    ) {
      const options = typeof optionsOrCallback === "function" ? {} : optionsOrCallback;
      const callback =
        typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback!;
      if (options.ifAvailable && held.has(name)) {
        return callback(null);
      }
      held.add(name);
      try {
        return await callback({ name });
      } finally {
        held.delete(name);
      }
    },
  };
}

function renderProjectLayout(projectId: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/p/:projectId",
        element: <ProjectLayout />,
        children: [{ index: true, element: <div>board content</div> }],
      },
    ],
    { initialEntries: [`/p/${projectId}`] }
  );
  render(<RouterProvider router={router} />);
}

beforeEach(async () => {
  await resetDbForTests();
  installFakeLockManager();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ProjectLayout", () => {
  it("loads the project and renders the matched child route", async () => {
    const project = createProject("Job Smith");
    await saveProject(project);

    renderProjectLayout(project.id);

    expect(await screen.findByText("board content")).toBeInTheDocument();
    expect(useDocumentStore.getState().project?.id).toBe(project.id);
  });

  it("shows a not found message for a missing project", async () => {
    renderProjectLayout("does-not-exist");
    expect(await screen.findByText("Project not found")).toBeInTheDocument();
  });

  it("opens read-only when another tab already holds the project lock", async () => {
    const project = createProject("Held Elsewhere");
    await saveProject(project);

    const firstTab = await acquireProjectLock(project.id);
    expect(firstTab.readOnly).toBe(false);

    renderProjectLayout(project.id);

    expect(await screen.findByText("Read-only")).toBeInTheDocument();
    expect(useDocumentStore.getState().readOnly).toBe(true);
  });

  it("shows a save banner with an export button after repeated save failures", async () => {
    vi.useFakeTimers();
    const project = createProject("Flaky Save");
    await saveProject(project);

    const repo = await import("@/storage/project-repo");
    vi.spyOn(repo, "saveProject").mockRejectedValue(new Error("quota exceeded"));

    renderProjectLayout(project.id);
    await vi.waitFor(() => expect(screen.getByText("board content")).toBeInTheDocument());

    useDocumentStore.getState().apply((draft) => {
      draft.name = "Flaky Save Renamed";
    });

    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    expect(await screen.findByText("Changes are not being saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });
});
```

- [ ] Run `npx vitest run "src/app/routes/ProjectLayout.test.tsx"`. Expected failure: fails to resolve `./ProjectLayout`.

- [ ] Write `src/app/routes/ProjectLayout.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { Outlet, useParams, Link } from "react-router";

import { loadProject, saveProject } from "@/storage/project-repo";
import { acquireProjectLock } from "@/storage/project-lock";
import { createAutosaver } from "@/storage/autosave";
import { useDocumentStore, setAutosaver } from "@/state/document-store";

import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@weeeha/ui/components/empty";
import { Skeleton } from "@weeeha/ui/components/skeleton";
import { Button } from "@weeeha/ui/components/button";
import { FolderOpen } from "lucide-react";

import { SaveBanner } from "@/app/components/SaveBanner";
import { ReadOnlyNotice } from "@/app/components/ReadOnlyNotice";
import { ThemeToggle } from "@/app/components/ThemeToggle";

let persistRequested = false;

type LoadState = "loading" | "not-found" | "ready";

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const [state, setState] = useState<LoadState>("loading");
  const releaseRef = useRef<(() => void) | null>(null);

  const project = useDocumentStore((s) => s.project);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const saveStatus = useDocumentStore((s) => s.saveStatus);
  const saveFailures = useDocumentStore((s) => s.saveFailures);

  useEffect(() => {
    if (!projectId) {
      setState("not-found");
      return;
    }

    let cancelled = false;
    let autosaver: ReturnType<typeof createAutosaver> | null = null;

    async function open() {
      const loaded = await loadProject(projectId!);
      if (cancelled) return;
      if (!loaded) {
        setState("not-found");
        return;
      }

      const lock = await acquireProjectLock(projectId!);
      if (cancelled) {
        lock.release();
        return;
      }
      releaseRef.current = lock.release;

      autosaver = createAutosaver({
        save: saveProject,
        onStatus: (status, failures) => {
          // useDocumentStore is a zustand store: setState merges these two
          // fields into DocumentState without touching its actions.
          useDocumentStore.setState({ saveStatus: status, saveFailures: failures });
        },
      });
      setAutosaver(autosaver);

      useDocumentStore.getState().load(loaded, { readOnly: lock.readOnly });
      setState("ready");

      if (!persistRequested) {
        persistRequested = true;
        void navigator.storage?.persist?.();
      }
    }

    open();

    const flush = () => {
      autosaver?.flush();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
      autosaver?.flush();
      autosaver?.dispose();
      setAutosaver(null);
      releaseRef.current?.();
      releaseRef.current = null;
      useDocumentStore.getState().close();
    };
  }, [projectId]);

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (state === "not-found") {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen />
          </EmptyMedia>
          <EmptyTitle>Project not found</EmptyTitle>
          <EmptyDescription>
            This project does not exist in this browser.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/">Back to projects</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="flex h-dvh flex-col">
      {saveStatus === "error" ? <SaveBanner failures={saveFailures} project={project} /> : null}
      {readOnly ? <ReadOnlyNotice /> : null}
      <header className="flex items-center justify-end gap-2 border-b border-border px-3 py-2">
        <ThemeToggle />
      </header>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
```

- [ ] Run `npx vitest run "src/app/routes/ProjectLayout.test.tsx"`. Expected pass: 4 passed, 0 failed.

- [ ] Write the failing test for the board, `src/app/routes/BoardPage.test.tsx`:

```tsx
import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { addScene } from "@/state/shot-actions";
import { BoardPage } from "./BoardPage";

beforeEach(async () => {
  await resetDbForTests();
});

function renderBoard(projectId: string) {
  render(
    <MemoryRouter initialEntries={[`/p/${projectId}`]}>
      <Routes>
        <Route path="/p/:projectId" element={<BoardPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("BoardPage", () => {
  it("shows the empty state with no scenes and adds one", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});

    renderBoard(project.id);
    expect(screen.getByText("No scenes yet")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add scene" }));

    expect(useDocumentStore.getState().project?.scenes).toHaveLength(1);
    expect(screen.queryByText("No scenes yet")).not.toBeInTheDocument();
  });

  it("lists scenes with their shot count and links to the scene page", () => {
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      addScene(draft, "Kitchen");
    });

    renderBoard(project.id);

    expect(screen.getByText("Kitchen")).toBeInTheDocument();
    expect(screen.getByText("Empty set")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      expect.stringContaining(`/p/${project.id}/scene/`)
    );
  });
});
```

- [ ] Run `npx vitest run "src/app/routes/BoardPage.test.tsx"`. Expected failure: fails to resolve `./BoardPage`.

- [ ] Write `src/app/routes/BoardPage.tsx`:

```tsx
import { Link, useParams } from "react-router";

import { Button } from "@weeeha/ui/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@weeeha/ui/components/card";
import { Badge } from "@weeeha/ui/components/badge";
import { Skeleton } from "@weeeha/ui/components/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@weeeha/ui/components/empty";
import { Plus, Clapperboard } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { addScene } from "@/state/shot-actions";

export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useDocumentStore((s) => s.project);
  const apply = useDocumentStore((s) => s.apply);
  const readOnly = useDocumentStore((s) => s.readOnly);

  if (!project) {
    return null;
  }

  const handleAddScene = () => {
    apply((draft) => {
      addScene(draft, `Scene ${draft.scenes.length + 1}`);
    });
  };

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-medium">{project.name}</h1>
        <Button onClick={handleAddScene} disabled={readOnly}>
          <Plus />
          Add scene
        </Button>
      </div>

      {project.scenes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Clapperboard />
            </EmptyMedia>
            <EmptyTitle>No scenes yet</EmptyTitle>
            <EmptyDescription>Add a scene to start dressing a set.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={handleAddScene} disabled={readOnly}>
              <Plus />
              Add scene
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {project.scenes.map((scene) => (
            <li key={scene.id}>
              <Link to={`/p/${projectId}/scene/${scene.id}`}>
                <Card>
                  <CardHeader>
                    <CardTitle>{scene.name}</CardTitle>
                    <CardDescription>
                      {scene.shots.length} {scene.shots.length === 1 ? "shot" : "shots"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 overflow-x-hidden">
                      {scene.shots.length === 0 ? (
                        <Badge variant="outline">Empty set</Badge>
                      ) : (
                        scene.shots
                          .slice(0, 4)
                          .map((shot) => (
                            <Skeleton
                              key={shot.id}
                              className="h-12 w-20 shrink-0 rounded-md"
                            />
                          ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] Run `npx vitest run "src/app/routes/BoardPage.test.tsx"`. Expected pass: 2 passed, 0 failed.

- [ ] Write the failing test for the props page, `src/app/routes/PropsPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PropsPage } from "./PropsPage";

describe("PropsPage", () => {
  it("shows the S2 empty state", () => {
    render(<PropsPage />);
    expect(screen.getByText("Props arrive in S2")).toBeInTheDocument();
  });
});
```

- [ ] Run `npx vitest run "src/app/routes/PropsPage.test.tsx"`. Expected failure: fails to resolve `./PropsPage`.

- [ ] Write `src/app/routes/PropsPage.tsx`:

```tsx
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@weeeha/ui/components/empty";
import { Package } from "lucide-react";

export function PropsPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Package />
          </EmptyMedia>
          <EmptyTitle>Props arrive in S2</EmptyTitle>
          <EmptyDescription>
            The prop library, import and placement land in the next slice.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
```

- [ ] Run `npx vitest run "src/app/routes/PropsPage.test.tsx"`. Expected pass: 1 passed, 0 failed.

- [ ] Write `src/app/router.tsx`:

```tsx
import { createBrowserRouter } from "react-router";

import { ProjectsPage } from "@/app/routes/ProjectsPage";
import { ProjectLayout } from "@/app/routes/ProjectLayout";
import { BoardPage } from "@/app/routes/BoardPage";
import { PropsPage } from "@/app/routes/PropsPage";

export const router = createBrowserRouter([
  { path: "/", element: <ProjectsPage /> },
  {
    path: "/p/:projectId",
    element: <ProjectLayout />,
    children: [
      { index: true, element: <BoardPage /> },
      { path: "props", element: <PropsPage /> },
    ],
  },
]);
```

- [ ] Modify `src/main.tsx` to mount the router in place of the S0 placeholder `App`. Full contents:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { ThemeProvider } from "@weeeha/ui/components/theme-provider";
import { Toaster } from "@weeeha/ui/components/sonner";

import { router } from "@/app/router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  </StrictMode>
);
```

- [ ] Run the full check from `/Users/nickv/ClaudeCode Projects/scene-builder-3d`: `npm run typecheck && npm run lint && npm test`. Expected: all three succeed, no errors.

- [ ] Commit:

```bash
cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/app/router.tsx src/app/routes/ProjectsPage.tsx src/app/routes/ProjectsPage.test.tsx src/app/routes/ProjectLayout.tsx src/app/routes/ProjectLayout.test.tsx src/app/routes/BoardPage.tsx src/app/routes/BoardPage.test.tsx src/app/routes/PropsPage.tsx src/app/routes/PropsPage.test.tsx src/app/components/SaveBanner.tsx src/app/components/ReadOnlyNotice.tsx src/main.tsx && git commit -m "$(cat <<'EOF'
feat: router, projects page, board, project layout

Wires the projects list (create, delete, import), the per-project layout
that loads the document, takes the tab lock, and drives autosave, and the
board page that lists scenes and adds new ones. Replaces the S0 placeholder
App with real routing.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 20: Stage layout, scene page, shot page, shot strip, panels

**Files:**
- Create: `src/app/components/ObjectPalette.tsx`
- Create: `src/app/components/ObjectPalette.test.tsx`
- Create: `src/app/components/WriteTargetSwitch.tsx`
- Create: `src/app/components/WriteTargetSwitch.test.tsx`
- Create: `src/app/components/Inspector.tsx`
- Create: `src/app/components/Inspector.test.tsx`
- Create: `src/app/components/ShotStrip.tsx`
- Create: `src/app/components/ShotStrip.test.tsx`
- Create: `src/app/routes/ScenePage.tsx`
- Create: `src/app/routes/ShotPage.tsx`
- Create: `src/app/routes/StageLayout.tsx`
- Create: `src/app/routes/StageLayout.test.tsx`
- Modify: `src/app/router.tsx`

**Interfaces:**

Consumes:
```ts
// src/viewport/StageCanvas.tsx
export function StageCanvas(props: { sceneId: string; shotId: string | null }): JSX.Element;

// src/domain/lookup.ts
export function findScene(project: Project, sceneId: string): Scene | null;
export function findShot(project: Project, shotId: string): { scene: Scene; shot: Shot } | null;

// src/domain/factories.ts
export function createPrimitive(shape: PrimitiveShape): PrimitiveObject;
export function createDoll(): DollObject;

// src/state/document-store.ts
export const useDocumentStore: UseBoundStore<StoreApi<DocumentState>>;

// src/state/editor-store.ts
export type WriteTarget = "set" | "shot";
export const useEditorStore: UseBoundStore<StoreApi<EditorState>>;

// src/state/object-actions.ts
export type EditTarget = { kind: "set" } | { kind: "shot"; shotId: string };
export function addObject(draft: Project, sceneId: string, object: StageObject, opts?: { onlyInShotId?: string }): void;
export function updateObject(draft: Project, sceneId: string, objectId: string, patch: ObjectOverride, target: EditTarget): void;
export function deleteObject(draft: Project, sceneId: string, objectId: string): void;

// src/state/shot-actions.ts
export function addShot(draft: Project, sceneId: string): string;
export function duplicateShot(draft: Project, sceneId: string, shotId: string): string;
export function deleteShot(draft: Project, sceneId: string, shotId: string): void;
export function moveShot(draft: Project, sceneId: string, shotId: string, toIndex: number): void;
export function updateShot(draft: Project, sceneId: string, shotId: string, patch: Partial<Pick<Shot, "name" | "type" | "durationSec">>): void;
export function setShotLens(draft: Project, sceneId: string, shotId: string, lensMm: number): void;
export function setSceneNotes(draft: Project, sceneId: string, notes: string): void;

// src/viewport/transform-commit.ts
export function editTargetFor(page: "scene" | "shot", writeTarget: WriteTarget, shotId: string | null): EditTarget;
```

Produces:
```ts
// src/app/routes/StageLayout.tsx
export function StageLayout(): JSX.Element;

// src/app/routes/ScenePage.tsx
export function ScenePage(): JSX.Element | null;

// src/app/routes/ShotPage.tsx
export function ShotPage(): JSX.Element | null;

// src/app/components/ShotStrip.tsx
export function ShotStrip(props: { sceneId: string }): JSX.Element | null;

// src/app/components/ObjectPalette.tsx
export function ObjectPalette(props: { sceneId: string; shotId: string | null; writeTarget?: WriteTarget }): JSX.Element;

// src/app/components/Inspector.tsx
export function Inspector(props: { page: "scene" | "shot"; sceneId: string; shotId: string | null }): JSX.Element | null;

// src/app/components/WriteTargetSwitch.tsx
export function WriteTargetSwitch(): JSX.Element;
```

`StageLayout` derives `sceneId`/`shotId` with `useMatch`, not `useParams`, because it must tell which of its two child routes is live before it can trust either param name. `ScenePage` and `ShotPage` read their own id with `useParams`, since the router does not pass route params as props.

- [ ] Write the failing test for the palette, `src/app/components/ObjectPalette.test.tsx`:

```tsx
import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { addScene, addShot } from "@/state/shot-actions";
import { ObjectPalette } from "./ObjectPalette";

beforeEach(async () => {
  await resetDbForTests();
});

describe("ObjectPalette", () => {
  it("adds a box to the set on the scene page", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    let sceneId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
    });

    render(<ObjectPalette sceneId={sceneId} shotId={null} />);
    await user.click(screen.getByRole("button", { name: "Add box" }));

    const scene = useDocumentStore.getState().project!.scenes[0];
    expect(scene.set.objects).toHaveLength(1);
    expect(scene.set.objects[0].kind).toBe("primitive");
  });

  it("adds an object only to this shot when the write target is shot", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    let sceneId = "";
    let shotId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shotId = addShot(draft, sceneId);
    });

    render(<ObjectPalette sceneId={sceneId} shotId={shotId} writeTarget="shot" />);
    await user.click(screen.getByRole("button", { name: "Add doll" }));

    const scene = useDocumentStore.getState().project!.scenes[0];
    const object = scene.set.objects[0];
    expect(object.visible).toBe(false);
    expect(scene.shots[0].overrides[object.id]).toEqual({ visible: true });
  });
});
```

- [ ] Run `npx vitest run "src/app/components/ObjectPalette.test.tsx"`. Expected failure: fails to resolve `./ObjectPalette`.

- [ ] Write `src/app/components/ObjectPalette.tsx`:

```tsx
import { ButtonGroup } from "@weeeha/ui/components/button-group";
import { Button } from "@weeeha/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@weeeha/ui/components/tooltip";
import { Box, Cylinder, Circle, Square, RectangleHorizontal, User } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { addObject } from "@/state/object-actions";
import { createPrimitive, createDoll } from "@/domain/factories";
import type { PrimitiveShape } from "@/domain/types";
import type { WriteTarget } from "@/state/editor-store";

const PRIMITIVES: { shape: PrimitiveShape; label: string; icon: typeof Box }[] = [
  { shape: "box", label: "Box", icon: Box },
  { shape: "cylinder", label: "Cylinder", icon: Cylinder },
  { shape: "sphere", label: "Sphere", icon: Circle },
  { shape: "plane", label: "Plane", icon: Square },
  { shape: "wall", label: "Wall", icon: RectangleHorizontal },
];

export function ObjectPalette({
  sceneId,
  shotId,
  writeTarget = "set",
}: {
  sceneId: string;
  shotId: string | null;
  writeTarget?: WriteTarget;
}) {
  const apply = useDocumentStore((s) => s.apply);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const onlyInShotId = shotId && writeTarget === "shot" ? shotId : undefined;

  const handleAddPrimitive = (shape: PrimitiveShape) => {
    apply((draft) => {
      addObject(draft, sceneId, createPrimitive(shape), { onlyInShotId });
    });
  };

  const handleAddDoll = () => {
    apply((draft) => {
      addObject(draft, sceneId, createDoll(), { onlyInShotId });
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">Add to the set</span>
      <ButtonGroup>
        {PRIMITIVES.map(({ shape, label, icon: Icon }) => (
          <Tooltip key={shape}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Add ${label.toLowerCase()}`}
                disabled={readOnly}
                onClick={() => handleAddPrimitive(shape)}
              >
                <Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Add doll"
              disabled={readOnly}
              onClick={handleAddDoll}
            >
              <User />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Doll</TooltipContent>
        </Tooltip>
      </ButtonGroup>
    </div>
  );
}
```

- [ ] Run `npx vitest run "src/app/components/ObjectPalette.test.tsx"`. Expected pass: 2 passed, 0 failed.

- [ ] Write the failing test for the write-target switch, `src/app/components/WriteTargetSwitch.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { useEditorStore } from "@/state/editor-store";
import { WriteTargetSwitch } from "./WriteTargetSwitch";

describe("WriteTargetSwitch", () => {
  it("defaults to this shot and switches to set", async () => {
    const user = userEvent.setup();
    useEditorStore.setState({ writeTarget: "shot" });
    render(<WriteTargetSwitch />);

    expect(screen.getByRole("radio", { name: "This shot" })).toHaveAttribute(
      "aria-checked",
      "true"
    );

    await user.click(screen.getByRole("radio", { name: "Set" }));
    expect(useEditorStore.getState().writeTarget).toBe("set");
  });
});
```

- [ ] Run `npx vitest run "src/app/components/WriteTargetSwitch.test.tsx"`. Expected failure: fails to resolve `./WriteTargetSwitch`.

- [ ] Write `src/app/components/WriteTargetSwitch.tsx`:

```tsx
import { ToggleGroup, ToggleGroupItem } from "@weeeha/ui/components/toggle-group";
import { Label } from "@weeeha/ui/components/label";

import { useEditorStore } from "@/state/editor-store";

export function WriteTargetSwitch() {
  const writeTarget = useEditorStore((s) => s.writeTarget);
  const setWriteTarget = useEditorStore((s) => s.setWriteTarget);

  return (
    <div className="flex items-center gap-2">
      <Label id="write-target-label">Writes to</Label>
      <ToggleGroup
        type="single"
        aria-labelledby="write-target-label"
        value={writeTarget}
        onValueChange={(value) => {
          if (value) setWriteTarget(value as "set" | "shot");
        }}
        variant="outline"
      >
        <ToggleGroupItem value="set">Set</ToggleGroupItem>
        <ToggleGroupItem value="shot">This shot</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
```

- [ ] Run `npx vitest run "src/app/components/WriteTargetSwitch.test.tsx"`. Expected pass: 1 passed, 0 failed.

- [ ] Write the failing test for the inspector, `src/app/components/Inspector.test.tsx`:

```tsx
import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject, createPrimitive } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { addScene, addShot } from "@/state/shot-actions";
import { addObject, updateObject } from "@/state/object-actions";
import { Inspector } from "./Inspector";

beforeEach(async () => {
  await resetDbForTests();
  useEditorStore.setState({ selectedObjectId: null, writeTarget: "shot" });
});

describe("Inspector", () => {
  it("shows no reset control on the scene page", () => {
    const project = createProject("Job Smith");
    let sceneId = "";
    let objectId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      const box = createPrimitive("box");
      objectId = box.id;
      addObject(draft, sceneId, box);
    });
    useEditorStore.setState({ selectedObjectId: objectId });

    render(<Inspector page="scene" sceneId={sceneId} shotId={null} />);
    expect(
      screen.queryByRole("button", { name: "Reset position" })
    ).not.toBeInTheDocument();
  });

  it("shows a modified reset on the shot page once an override exists, and clears it", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    let sceneId = "";
    let shotId = "";
    let objectId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shotId = addShot(draft, sceneId);
      const box = createPrimitive("box");
      objectId = box.id;
      addObject(draft, sceneId, box);
    });
    useEditorStore.setState({ selectedObjectId: objectId, writeTarget: "shot" });
    useDocumentStore.getState().apply((draft) => {
      updateObject(
        draft,
        sceneId,
        objectId,
        { transform: { position: [1, 0, 0], rotationY: 0, scale: 1 } },
        { kind: "shot", shotId }
      );
    });

    render(<Inspector page="shot" sceneId={sceneId} shotId={shotId} />);
    const reset = screen.getByRole("button", { name: "Reset position" });
    expect(reset).toBeEnabled();

    await user.click(reset);

    const shot = useDocumentStore.getState().project!.scenes[0].shots[0];
    expect(shot.overrides[objectId]?.transform).toBeUndefined();
  });

  it("shows shot fields on the shot page", () => {
    const project = createProject("Job Smith");
    let sceneId = "";
    let shotId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shotId = addShot(draft, sceneId);
    });

    render(<Inspector page="shot" sceneId={sceneId} shotId={shotId} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Shot 01");
    expect(screen.getByRole("radio", { name: "WIDE" })).toBeInTheDocument();
  });
});
```

- [ ] Run `npx vitest run "src/app/components/Inspector.test.tsx"`. Expected failure: fails to resolve `./Inspector`.

- [ ] Write `src/app/components/Inspector.tsx`:

```tsx
import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { findScene, findShot } from "@/domain/lookup";
import { updateObject, deleteObject } from "@/state/object-actions";
import { updateShot, setShotLens } from "@/state/shot-actions";
import { editTargetFor } from "@/viewport/transform-commit";
import type { ObjectOverride, PoseName, Shot, ShotType } from "@/domain/types";

import { FieldRow, UnitInput } from "@/components/super-ai/field-row";
import { ResetAffordance } from "@/components/super-ai/reset-affordance";
import { ChoiceChip, ChoiceChips } from "@/components/super-ai/choice-chips";
import { Input } from "@weeeha/ui/components/input";
import { Switch } from "@weeeha/ui/components/switch";
import { Slider } from "@weeeha/ui/components/slider";
import { ToggleGroup, ToggleGroupItem } from "@weeeha/ui/components/toggle-group";
import { Button } from "@weeeha/ui/components/button";
import { Separator } from "@weeeha/ui/components/separator";
import { Trash2 } from "lucide-react";

const POSES: PoseName[] = ["stand", "walk", "run", "sit", "crouch", "point"];
const SHOT_TYPES: ShotType[] = ["WIDE", "MED", "CU", "POV"];

export function Inspector({
  page,
  sceneId,
  shotId,
}: {
  page: "scene" | "shot";
  sceneId: string;
  shotId: string | null;
}) {
  const project = useDocumentStore((s) => s.project);
  const apply = useDocumentStore((s) => s.apply);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const select = useEditorStore((s) => s.select);
  const writeTarget = useEditorStore((s) => s.writeTarget);

  if (!project) return null;
  const scene = findScene(project, sceneId);
  if (!scene) return null;

  const shot = shotId ? findShot(project, shotId)?.shot ?? null : null;
  const editTarget = editTargetFor(page, writeTarget, shotId);
  const selected = selectedObjectId
    ? scene.set.objects.find((object) => object.id === selectedObjectId) ?? null
    : null;
  const override = shot && selected ? shot.overrides[selected.id] : undefined;

  const commit = (patch: ObjectOverride) => {
    if (!selected) return;
    apply((draft) => {
      updateObject(draft, sceneId, selected.id, patch, editTarget);
    });
  };

  const handleDelete = () => {
    if (!selected) return;
    apply((draft) => {
      deleteObject(draft, sceneId, selected.id);
    });
    select(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {page === "shot" && shot ? (
        <ShotFields shot={shot} sceneId={sceneId} shotId={shot.id} readOnly={readOnly} />
      ) : null}

      {selected ? (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{selected.name}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${selected.name}`}
              disabled={readOnly}
              onClick={handleDelete}
            >
              <Trash2 />
            </Button>
          </div>

          <FieldRow
            label="Position"
            reset={
              shot ? (
                <ResetAffordance
                  state={override?.transform ? "modified" : "default"}
                  onReset={() => commit({ transform: undefined })}
                  label="Reset position"
                />
              ) : undefined
            }
          >
            {() => (
              <div className="flex gap-1">
                <UnitInput
                  aria-label="Position X"
                  unit="m"
                  disabled={readOnly}
                  value={selected.transform.position[0]}
                  onValueChange={(x) =>
                    commit({
                      transform: {
                        ...selected.transform,
                        position: [
                          x,
                          selected.transform.position[1],
                          selected.transform.position[2],
                        ],
                      },
                    })
                  }
                />
                <UnitInput
                  aria-label="Position Y"
                  unit="m"
                  disabled={readOnly}
                  value={selected.transform.position[1]}
                  onValueChange={(y) =>
                    commit({
                      transform: {
                        ...selected.transform,
                        position: [
                          selected.transform.position[0],
                          y,
                          selected.transform.position[2],
                        ],
                      },
                    })
                  }
                />
                <UnitInput
                  aria-label="Position Z"
                  unit="m"
                  disabled={readOnly}
                  value={selected.transform.position[2]}
                  onValueChange={(z) =>
                    commit({
                      transform: {
                        ...selected.transform,
                        position: [
                          selected.transform.position[0],
                          selected.transform.position[1],
                          z,
                        ],
                      },
                    })
                  }
                />
              </div>
            )}
          </FieldRow>

          <FieldRow
            label="Rotation"
            reset={
              shot ? (
                <ResetAffordance
                  state={override?.transform ? "modified" : "default"}
                  onReset={() => commit({ transform: undefined })}
                  label="Reset rotation"
                />
              ) : undefined
            }
          >
            {(id) => (
              <UnitInput
                id={id}
                aria-label="Rotation Y"
                unit="deg"
                disabled={readOnly}
                value={(selected.transform.rotationY * 180) / Math.PI}
                onValueChange={(deg) =>
                  commit({
                    transform: { ...selected.transform, rotationY: (deg * Math.PI) / 180 },
                  })
                }
              />
            )}
          </FieldRow>

          <FieldRow
            label="Scale"
            reset={
              shot ? (
                <ResetAffordance
                  state={override?.transform ? "modified" : "default"}
                  onReset={() => commit({ transform: undefined })}
                  label="Reset scale"
                />
              ) : undefined
            }
          >
            {(id) => (
              <UnitInput
                id={id}
                aria-label="Scale"
                unit="x"
                disabled={readOnly}
                value={selected.transform.scale}
                onValueChange={(scale) =>
                  commit({ transform: { ...selected.transform, scale } })
                }
              />
            )}
          </FieldRow>

          <FieldRow
            label="Visible"
            reset={
              shot ? (
                <ResetAffordance
                  state={override?.visible !== undefined ? "modified" : "default"}
                  onReset={() => commit({ visible: undefined })}
                  label="Reset visibility"
                />
              ) : undefined
            }
          >
            {(id) => (
              <Switch
                id={id}
                checked={selected.visible}
                disabled={readOnly}
                onCheckedChange={(checked) => commit({ visible: checked })}
              />
            )}
          </FieldRow>

          {selected.kind === "doll" ? (
            <FieldRow
              label="Pose"
              reset={
                shot ? (
                  <ResetAffordance
                    state={override?.pose !== undefined ? "modified" : "default"}
                    onReset={() => commit({ pose: undefined })}
                    label="Reset pose"
                  />
                ) : undefined
              }
            >
              {() => (
                <ToggleGroup
                  type="single"
                  value={selected.pose}
                  onValueChange={(value) => value && commit({ pose: value as PoseName })}
                  variant="outline"
                >
                  {POSES.map((pose) => (
                    <ToggleGroupItem key={pose} value={pose}>
                      {pose}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            </FieldRow>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ShotFields({
  shot,
  sceneId,
  shotId,
  readOnly,
}: {
  shot: Shot;
  sceneId: string;
  shotId: string;
  readOnly: boolean;
}) {
  const apply = useDocumentStore((s) => s.apply);

  return (
    <div className="flex flex-col gap-3">
      <FieldRow label="Name">
        {(id) => (
          <Input
            id={id}
            value={shot.name}
            disabled={readOnly}
            onChange={(event) =>
              apply((draft) => {
                updateShot(draft, sceneId, shotId, { name: event.target.value });
              })
            }
          />
        )}
      </FieldRow>

      <FieldRow label="Type">
        {() => (
          <ChoiceChips
            value={shot.type}
            onValueChange={(value) =>
              apply((draft) => {
                updateShot(draft, sceneId, shotId, { type: value as ShotType });
              })
            }
          >
            {SHOT_TYPES.map((type) => (
              <ChoiceChip key={type} value={type}>
                {type}
              </ChoiceChip>
            ))}
          </ChoiceChips>
        )}
      </FieldRow>

      <FieldRow label="Duration" hint="Seconds">
        {(id) => (
          <UnitInput
            id={id}
            aria-label="Duration"
            unit="s"
            disabled={readOnly}
            value={shot.durationSec}
            min={0.5}
            step={0.5}
            onValueChange={(value) =>
              apply((draft) => {
                updateShot(draft, sceneId, shotId, { durationSec: value });
              })
            }
          />
        )}
      </FieldRow>

      <FieldRow label="Lens" hint="Millimetres">
        {(id) => (
          <div className="flex flex-1 items-center gap-2">
            <Slider
              id={id}
              min={12}
              max={200}
              step={1}
              disabled={readOnly}
              value={[shot.camera.lensMm]}
              onValueChange={([value]) =>
                apply((draft) => {
                  setShotLens(draft, sceneId, shotId, value);
                })
              }
              thumbLabels={["Lens in millimetres"]}
            />
            <UnitInput
              aria-label="Lens in millimetres"
              unit="mm"
              disabled={readOnly}
              value={shot.camera.lensMm}
              onValueChange={(value) =>
                apply((draft) => {
                  setShotLens(draft, sceneId, shotId, value);
                })
              }
            />
          </div>
        )}
      </FieldRow>
    </div>
  );
}
```

- [ ] Run `npx vitest run "src/app/components/Inspector.test.tsx"`. Expected pass: 3 passed, 0 failed.

- [ ] Write the failing test for the shot strip, `src/app/components/ShotStrip.test.tsx`:

```tsx
import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { addScene, addShot } from "@/state/shot-actions";
import { ShotStrip } from "./ShotStrip";

beforeEach(async () => {
  await resetDbForTests();
});

function renderStrip(projectId: string, sceneId: string, initialPath: string) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/p/:projectId/*" element={<ShotStrip sceneId={sceneId} />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ShotStrip", () => {
  it("shows only Set and the add button when the scene has no shots", () => {
    const project = createProject("Job Smith");
    let sceneId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
    });

    renderStrip(project.id, sceneId, `/p/${project.id}/scene/${sceneId}`);

    expect(screen.getByRole("link", { name: "Set" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add shot" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Shot 1/ })).not.toBeInTheDocument();
  });

  it("adds a shot and lists it with duration and duplicate, delete, move actions", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    let sceneId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
    });

    renderStrip(project.id, sceneId, `/p/${project.id}/scene/${sceneId}`);
    await user.click(screen.getByRole("button", { name: "Add shot" }));

    expect(screen.getByRole("link", { name: /Shot 1, Shot 01/ })).toBeInTheDocument();
    expect(screen.getByText("4s")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /More actions for Shot 01/ }));
    expect(screen.getByRole("menuitem", { name: /Duplicate/ })).toBeInTheDocument();
  });
});
```

- [ ] Run `npx vitest run "src/app/components/ShotStrip.test.tsx"`. Expected failure: fails to resolve `./ShotStrip`.

- [ ] Write `src/app/components/ShotStrip.tsx`:

```tsx
import { useState } from "react";
import { NavLink, useMatch, useParams } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@weeeha/ui/components/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@weeeha/ui/components/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@weeeha/ui/components/alert-dialog";
import { Button } from "@weeeha/ui/components/button";
import { ScrollArea, ScrollBar } from "@weeeha/ui/components/scroll-area";
import { Skeleton } from "@weeeha/ui/components/skeleton";
import { cn } from "@/lib/utils";
import { Plus, Copy, Trash2, ChevronLeft, ChevronRight, Clapperboard } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { findScene } from "@/domain/lookup";
import { addShot, duplicateShot, deleteShot, moveShot } from "@/state/shot-actions";
import type { Shot } from "@/domain/types";

export function ShotStrip({ sceneId }: { sceneId: string }) {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useDocumentStore((s) => s.project);
  const apply = useDocumentStore((s) => s.apply);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const shotMatch = useMatch("/p/:projectId/shot/:shotId");
  const activeShotId = shotMatch?.params.shotId ?? null;

  if (!project) return null;
  const scene = findScene(project, sceneId);
  if (!scene) return null;

  const handleAdd = () => {
    apply((draft) => {
      addShot(draft, sceneId);
    });
  };

  return (
    <ScrollArea className="w-full border-t border-border">
      <div className="flex items-center gap-2 p-2">
        <NavLink
          to={`/p/${projectId}/scene/${sceneId}`}
          className={({ isActive }) =>
            cn(
              "inline-flex h-14 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium",
              isActive ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
            )
          }
        >
          <Clapperboard className="size-4" />
          Set
        </NavLink>

        {scene.shots.map((shot, index) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            index={index}
            sceneId={sceneId}
            projectId={projectId ?? ""}
            active={shot.id === activeShotId}
            canMoveLeft={index > 0}
            canMoveRight={index < scene.shots.length - 1}
            readOnly={readOnly}
          />
        ))}

        <Button
          variant="outline"
          size="icon"
          aria-label="Add shot"
          onClick={handleAdd}
          disabled={readOnly}
        >
          <Plus />
        </Button>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function ShotCard({
  shot,
  index,
  sceneId,
  projectId,
  active,
  canMoveLeft,
  canMoveRight,
  readOnly,
}: {
  shot: Shot;
  index: number;
  sceneId: string;
  projectId: string;
  active: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  readOnly: boolean;
}) {
  const apply = useDocumentStore((s) => s.apply);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleDuplicate = () => {
    apply((draft) => {
      duplicateShot(draft, sceneId, shot.id);
    });
  };
  const handleDelete = () => {
    apply((draft) => {
      deleteShot(draft, sceneId, shot.id);
    });
  };
  const handleMoveLeft = () => {
    apply((draft) => {
      moveShot(draft, sceneId, shot.id, index - 1);
    });
  };
  const handleMoveRight = () => {
    apply((draft) => {
      moveShot(draft, sceneId, shot.id, index + 1);
    });
  };
  const requestDelete = () => setConfirmDeleteOpen(true);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="relative shrink-0">
            <NavLink
              to={`/p/${projectId}/shot/${shot.id}`}
              aria-label={`Shot ${index + 1}, ${shot.name}`}
              className={cn(
                "flex h-14 w-28 flex-col justify-between rounded-lg border border-border p-1.5 text-start text-xs",
                active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-medium">{String(index + 1).padStart(2, "0")}</span>
                <Skeleton className="h-6 w-12 rounded-sm" />
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="truncate">{shot.name}</span>
                <span>{shot.durationSec}s</span>
              </div>
            </NavLink>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute -top-1.5 -end-1.5 rounded-full bg-card"
                  aria-label={`More actions for ${shot.name}`}
                >
                  <span aria-hidden="true">...</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={handleDuplicate} disabled={readOnly}>
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleMoveLeft}
                  disabled={readOnly || !canMoveLeft}
                >
                  <ChevronLeft />
                  Move left
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleMoveRight}
                  disabled={readOnly || !canMoveRight}
                >
                  <ChevronRight />
                  Move right
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={readOnly}
                  onSelect={(event) => {
                    event.preventDefault();
                    requestDelete();
                  }}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={handleDuplicate} disabled={readOnly}>
            <Copy />
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleMoveLeft} disabled={readOnly || !canMoveLeft}>
            <ChevronLeft />
            Move left
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleMoveRight} disabled={readOnly || !canMoveRight}>
            <ChevronRight />
            Move right
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            disabled={readOnly}
            onSelect={(event) => {
              event.preventDefault();
              requestDelete();
            }}
          >
            <Trash2 />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this shot</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes {shot.name}. Cmd+Z still works right after.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] Run `npx vitest run "src/app/components/ShotStrip.test.tsx"`. Expected pass: 2 passed, 0 failed.

- [ ] Write `src/app/routes/ScenePage.tsx`:

```tsx
import { useParams } from "react-router";

import { ScrollArea } from "@weeeha/ui/components/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@weeeha/ui/components/toggle-group";
import { Field, FieldLabel, FieldContent } from "@weeeha/ui/components/field";
import { Textarea } from "@weeeha/ui/components/textarea";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@weeeha/ui/components/empty";
import { Orbit, Grid2x2, Box } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { findScene } from "@/domain/lookup";
import { setSceneNotes } from "@/state/shot-actions";
import { ObjectPalette } from "@/app/components/ObjectPalette";
import { Inspector } from "@/app/components/Inspector";

export function ScenePage() {
  const { sceneId } = useParams<{ sceneId: string }>();
  const project = useDocumentStore((s) => s.project);
  const apply = useDocumentStore((s) => s.apply);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const cameraMode = useEditorStore((s) => s.cameraMode);
  const setCameraMode = useEditorStore((s) => s.setCameraMode);

  if (!project || !sceneId) return null;
  const scene = findScene(project, sceneId);
  if (!scene) return null;

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-4">
        <ToggleGroup
          type="single"
          value={cameraMode === "plan" ? "plan" : "orbit"}
          onValueChange={(value) => value && setCameraMode(value as "orbit" | "plan")}
          variant="outline"
        >
          <ToggleGroupItem value="orbit" aria-label="Orbit camera">
            <Orbit />
            Orbit
          </ToggleGroupItem>
          <ToggleGroupItem value="plan" aria-label="Plan camera">
            <Grid2x2 />
            Plan
          </ToggleGroupItem>
        </ToggleGroup>

        <ObjectPalette sceneId={sceneId} shotId={null} />

        {scene.set.objects.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Box />
              </EmptyMedia>
              <EmptyTitle>The set is empty</EmptyTitle>
              <EmptyDescription>
                Add a primitive or a doll to start dressing it.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Inspector page="scene" sceneId={sceneId} shotId={null} />
        )}

        <Field>
          <FieldLabel htmlFor="scene-notes">Notes</FieldLabel>
          <FieldContent>
            <Textarea
              id="scene-notes"
              value={scene.notes}
              disabled={readOnly}
              onChange={(event) => {
                apply((draft) => {
                  setSceneNotes(draft, sceneId, event.target.value);
                });
              }}
              placeholder="What is this scene about"
            />
          </FieldContent>
        </Field>
      </div>
    </ScrollArea>
  );
}
```

- [ ] Write `src/app/routes/ShotPage.tsx`:

```tsx
import { useParams } from "react-router";

import { ScrollArea } from "@weeeha/ui/components/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@weeeha/ui/components/toggle-group";
import { Video, Orbit } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { findShot } from "@/domain/lookup";
import { WriteTargetSwitch } from "@/app/components/WriteTargetSwitch";
import { ObjectPalette } from "@/app/components/ObjectPalette";
import { Inspector } from "@/app/components/Inspector";

export function ShotPage() {
  const { shotId } = useParams<{ shotId: string }>();
  const project = useDocumentStore((s) => s.project);
  const cameraMode = useEditorStore((s) => s.cameraMode);
  const setCameraMode = useEditorStore((s) => s.setCameraMode);
  const writeTarget = useEditorStore((s) => s.writeTarget);

  if (!project || !shotId) return null;
  const found = findShot(project, shotId);
  if (!found) return null;
  const { scene, shot } = found;

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-4">
        <ToggleGroup
          type="single"
          value={cameraMode === "orbit" ? "orbit" : "shot"}
          onValueChange={(value) => value && setCameraMode(value as "shot" | "orbit")}
          variant="outline"
        >
          <ToggleGroupItem value="shot" aria-label="Shot camera">
            <Video />
            Shot
          </ToggleGroupItem>
          <ToggleGroupItem value="orbit" aria-label="Orbit camera">
            <Orbit />
            Orbit
          </ToggleGroupItem>
        </ToggleGroup>

        <WriteTargetSwitch />

        <ObjectPalette sceneId={scene.id} shotId={shot.id} writeTarget={writeTarget} />

        <Inspector page="shot" sceneId={scene.id} shotId={shot.id} />
      </div>
    </ScrollArea>
  );
}
```

- [ ] Write the failing regression test, `src/app/routes/StageLayout.test.tsx`. The mock counts mounts with a module-level counter created by `vi.hoisted`, bumped from a `useEffect` (an effect runs once per real mount, unlike the component body, which runs on every render):

```tsx
import "fake-indexeddb/auto";
import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { addScene, addShot } from "@/state/shot-actions";
import type { Project } from "@/domain/types";
import { StageLayout } from "./StageLayout";
import { ScenePage } from "./ScenePage";
import { ShotPage } from "./ShotPage";

const counters = vi.hoisted(() => ({ mounts: 0 }));

vi.mock("@/viewport/StageCanvas", () => ({
  StageCanvas: (props: { sceneId: string; shotId: string | null }) => {
    useEffect(() => {
      counters.mounts += 1;
    }, []);
    return (
      <div
        data-testid="stage-canvas"
        data-scene={props.sceneId}
        data-shot={props.shotId ?? ""}
      />
    );
  },
}));

function renderStage(project: Project, initialPath: string) {
  useDocumentStore.getState().load(project, {});
  const router = createMemoryRouter(
    [
      {
        path: "/p/:projectId",
        children: [
          {
            element: <StageLayout />,
            children: [
              { path: "scene/:sceneId", element: <ScenePage /> },
              { path: "shot/:shotId", element: <ShotPage /> },
            ],
          },
        ],
      },
    ],
    { initialEntries: [initialPath] }
  );
  render(<RouterProvider router={router} />);
}

beforeEach(async () => {
  await resetDbForTests();
  counters.mounts = 0;
});

describe("StageLayout", () => {
  it("keeps one StageCanvas mounted across scene and shot navigation", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});
    let sceneId = "";
    let shot1Id = "";
    let shot2Id = "";
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shot1Id = addShot(draft, sceneId);
      shot2Id = addShot(draft, sceneId);
    });
    const loaded = useDocumentStore.getState().project!;

    renderStage(loaded, `/p/${loaded.id}/scene/${sceneId}`);
    expect(await screen.findByTestId("stage-canvas")).toHaveAttribute("data-shot", "");
    expect(counters.mounts).toBe(1);

    await user.click(screen.getByRole("link", { name: /Shot 1, Shot 01/ }));
    expect(await screen.findByTestId("stage-canvas")).toHaveAttribute("data-shot", shot1Id);
    expect(counters.mounts).toBe(1);

    await user.click(screen.getByRole("link", { name: /Shot 2, Shot 02/ }));
    expect(await screen.findByTestId("stage-canvas")).toHaveAttribute("data-shot", shot2Id);
    expect(counters.mounts).toBe(1);

    await user.click(screen.getByRole("link", { name: "Set" }));
    expect(await screen.findByTestId("stage-canvas")).toHaveAttribute("data-shot", "");
    expect(counters.mounts).toBe(1);
  });

  it("shows an empty state for an unknown shot id, with a link back to the board", async () => {
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});
    let sceneId = "";
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
    });
    void sceneId;
    const loaded = useDocumentStore.getState().project!;

    renderStage(loaded, `/p/${loaded.id}/shot/does-not-exist`);

    expect(await screen.findByText("This scene or shot is gone")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the board" })).toHaveAttribute(
      "href",
      `/p/${loaded.id}`
    );
  });
});
```

- [ ] Run `npx vitest run "src/app/routes/StageLayout.test.tsx"`. Expected failure: fails to resolve `./StageLayout`.

- [ ] Write `src/app/routes/StageLayout.tsx`:

```tsx
import { Outlet, useMatch, useParams, Link } from "react-router";

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@weeeha/ui/components/resizable";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@weeeha/ui/components/empty";
import { Button } from "@weeeha/ui/components/button";
import { Compass } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { findScene, findShot } from "@/domain/lookup";
import { StageCanvas } from "@/viewport/StageCanvas";
import { ShotStrip } from "@/app/components/ShotStrip";

export function StageLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const sceneMatch = useMatch("/p/:projectId/scene/:sceneId");
  const shotMatch = useMatch("/p/:projectId/shot/:shotId");
  const project = useDocumentStore((s) => s.project);

  let sceneId: string | null = null;
  let shotId: string | null = null;
  let notFound = false;

  if (sceneMatch) {
    sceneId = sceneMatch.params.sceneId ?? null;
    if (!project || !sceneId || !findScene(project, sceneId)) {
      notFound = true;
    }
  } else if (shotMatch) {
    shotId = shotMatch.params.shotId ?? null;
    const found = project && shotId ? findShot(project, shotId) : null;
    if (found) {
      sceneId = found.scene.id;
    } else {
      notFound = true;
    }
  } else {
    notFound = true;
  }

  if (notFound || !sceneId) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Compass />
          </EmptyMedia>
          <EmptyTitle>This scene or shot is gone</EmptyTitle>
          <EmptyDescription>
            It may have been deleted, or the link is stale.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to={`/p/${projectId}`}>Back to the board</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ResizablePanelGroup className="h-full">
      <ResizablePanel defaultSize="70" minSize="40">
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1">
            <StageCanvas sceneId={sceneId} shotId={shotId} />
          </div>
          <ShotStrip sceneId={sceneId} />
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="30" minSize="22">
        <Outlet />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

The canvas is rendered directly by `StageLayout`, in the same position in the tree, for both the `scene/:sceneId` and `shot/:shotId` children; only the `<Outlet />` panel and `StageCanvas`'s `shotId` prop change between them, so React reconciles it as the same element and never remounts it.

- [ ] Run `npx vitest run "src/app/routes/StageLayout.test.tsx"`. Expected pass: 2 passed, 0 failed.

- [ ] Modify `src/app/router.tsx` to add the pathless stage layout branch. Full contents:

```tsx
import { createBrowserRouter } from "react-router";

import { ProjectsPage } from "@/app/routes/ProjectsPage";
import { ProjectLayout } from "@/app/routes/ProjectLayout";
import { BoardPage } from "@/app/routes/BoardPage";
import { PropsPage } from "@/app/routes/PropsPage";
import { StageLayout } from "@/app/routes/StageLayout";
import { ScenePage } from "@/app/routes/ScenePage";
import { ShotPage } from "@/app/routes/ShotPage";

export const router = createBrowserRouter([
  { path: "/", element: <ProjectsPage /> },
  {
    path: "/p/:projectId",
    element: <ProjectLayout />,
    children: [
      { index: true, element: <BoardPage /> },
      { path: "props", element: <PropsPage /> },
      {
        element: <StageLayout />,
        children: [
          { path: "scene/:sceneId", element: <ScenePage /> },
          { path: "shot/:shotId", element: <ShotPage /> },
        ],
      },
    ],
  },
]);
```

- [ ] Run the full check: `npm run typecheck && npm run lint && npm test`. Expected: all three succeed, no errors.

- [ ] Commit:

```bash
cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/app/components/ObjectPalette.tsx src/app/components/ObjectPalette.test.tsx src/app/components/WriteTargetSwitch.tsx src/app/components/WriteTargetSwitch.test.tsx src/app/components/Inspector.tsx src/app/components/Inspector.test.tsx src/app/components/ShotStrip.tsx src/app/components/ShotStrip.test.tsx src/app/routes/ScenePage.tsx src/app/routes/ShotPage.tsx src/app/routes/StageLayout.tsx src/app/routes/StageLayout.test.tsx src/app/router.tsx && git commit -m "$(cat <<'EOF'
feat: stage layout, scene and shot pages, shot strip, panels

Mounts the canvas and the shot strip once in a pathless stage layout route
so scene-to-shot and shot-to-shot moves swap panels around a live canvas
instead of remounting it, proven by a regression test with a mocked
StageCanvas. Adds the object palette, the inspector with per-shot override
resets, and the writes-to switch.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: Shot thumbnails

**Files:**
- Create: `src/viewport/thumbnail-queue.ts`
- Create: `src/viewport/thumbnail-queue.test.ts`
- Create: `src/viewport/thumbnails.ts`
- Create: `src/viewport/ThumbnailWorker.tsx`
- Modify: `src/viewport/StageCanvas.tsx`
- Modify: `src/app/components/ShotStrip.tsx`
- Modify: `src/app/routes/BoardPage.tsx`

**Interfaces:**

Consumes:
```ts
// src/domain/resolve.ts
export function resolveSceneAll(scene: Scene, shot: Shot | null, t: number): StageObject[]; // overrides applied, invisible objects kept with visible: false, length always equals scene.set.objects.length
export function cameraAt(camera: ShotCamera, t: number): Framing;

// src/domain/hash.ts
export function hashShotState(scene: Scene, shot: Shot, assets?: PropAsset[]): Promise<string>;

// src/storage/blob-store.ts
export function putBlob(rec: { key: string; projectId: string; kind: BlobKind; blob: Blob }): Promise<void>;
export function getBlob(key: string): Promise<Blob | null>;
export function deleteBlob(key: string): Promise<void>;

// src/state/shot-actions.ts
export function setShotThumb(draft: Project, sceneId: string, shotId: string, thumb: { blobKey: string; stateHash: string }): void;

// src/state/document-store.ts
export const useDocumentStore: UseBoundStore<StoreApi<DocumentState>>; // applyTransient
```

Produces:
```ts
// src/viewport/thumbnail-queue.ts
export function shotsNeedingThumbs(scene: Scene, currentHashes: Record<string, string>): string[];

// src/viewport/thumbnails.ts
export function renderShotPixels(gl: THREE.WebGLRenderer, scene3d: THREE.Scene, framing: Framing, lensMm: number): { pixels: Uint8Array; width: number; height: number };
export function pixelsToPngBlob(pixels: Uint8Array, width: number, height: number): Promise<Blob>;
export function renderShotThumbnail(gl: THREE.WebGLRenderer, scene3d: THREE.Scene, framing: Framing, lensMm: number): Promise<Blob>;

// src/viewport/ThumbnailWorker.tsx
export function ThumbnailWorker(props: { scene: Scene; sceneId: string }): null;
```

`ThumbnailWorker` lives in its own file rather than inside `StageCanvas.tsx`, so the modify step against `StageCanvas.tsx` below only ever has to touch two lines and never has to reconstruct the file Tasks 16 to 18 own.

- [ ] Write the failing test for the queue, `src/viewport/thumbnail-queue.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createScene, createShot } from "@/domain/factories";
import { shotsNeedingThumbs } from "./thumbnail-queue";

describe("shotsNeedingThumbs", () => {
  it("includes a shot with no thumb", () => {
    const scene = createScene("Kitchen");
    const shot = createShot("Shot 01");
    scene.shots.push(shot);

    expect(shotsNeedingThumbs(scene, { [shot.id]: "abc" })).toEqual([shot.id]);
  });

  it("includes a shot whose thumb hash is stale", () => {
    const scene = createScene("Kitchen");
    const shot = createShot("Shot 01");
    shot.thumb = { blobKey: "thumb:1", stateHash: "old" };
    scene.shots.push(shot);

    expect(shotsNeedingThumbs(scene, { [shot.id]: "new" })).toEqual([shot.id]);
  });

  it("excludes a shot whose thumb hash is fresh", () => {
    const scene = createScene("Kitchen");
    const shot = createShot("Shot 01");
    shot.thumb = { blobKey: "thumb:1", stateHash: "current" };
    scene.shots.push(shot);

    expect(shotsNeedingThumbs(scene, { [shot.id]: "current" })).toEqual([]);
  });
});
```

- [ ] Run `npx vitest run "src/viewport/thumbnail-queue.test.ts"`. Expected failure: fails to resolve `./thumbnail-queue`.

- [ ] Write `src/viewport/thumbnail-queue.ts`:

```ts
import type { Scene } from "@/domain/types";

export function shotsNeedingThumbs(
  scene: Scene,
  currentHashes: Record<string, string>
): string[] {
  return scene.shots
    .filter((shot) => !shot.thumb || shot.thumb.stateHash !== currentHashes[shot.id])
    .map((shot) => shot.id);
}
```

- [ ] Run `npx vitest run "src/viewport/thumbnail-queue.test.ts"`. Expected pass: 3 passed, 0 failed.

- [ ] Write `src/viewport/thumbnails.ts`, split into a synchronous pixel read and an async PNG encode so `ThumbnailWorker` can keep every scene mutation inside one synchronous window with no `await` in the middle. `renderShotPixels` and `pixelsToPngBlob` are exercised by hand during S1 verification, not by a unit test: they need a real WebGL context, and the spec's own testing section puts WebGL output checks in manual and story review, not unit tests.

```ts
import * as THREE from "three";

import { lensToVFovDeg } from "@/domain/lens";
import type { Framing } from "@/domain/types";

const THUMB_WIDTH = 320;
const THUMB_HEIGHT = 136;

export function renderShotPixels(
  gl: THREE.WebGLRenderer,
  scene3d: THREE.Scene,
  framing: Framing,
  lensMm: number
): { pixels: Uint8Array; width: number; height: number } {
  const camera = new THREE.PerspectiveCamera(
    lensToVFovDeg(lensMm),
    THUMB_WIDTH / THUMB_HEIGHT,
    0.1,
    1000
  );
  camera.position.set(framing.position[0], framing.position[1], framing.position[2]);
  camera.lookAt(framing.aim[0], framing.aim[1], framing.aim[2]);
  camera.updateMatrixWorld(true);

  const target = new THREE.WebGLRenderTarget(THUMB_WIDTH, THUMB_HEIGHT);
  const previousTarget = gl.getRenderTarget();
  gl.setRenderTarget(target);
  gl.render(scene3d, camera);
  gl.setRenderTarget(previousTarget);

  const pixels = new Uint8Array(THUMB_WIDTH * THUMB_HEIGHT * 4);
  gl.readRenderTargetPixels(target, 0, 0, THUMB_WIDTH, THUMB_HEIGHT, pixels);
  target.dispose();

  return { pixels, width: THUMB_WIDTH, height: THUMB_HEIGHT };
}

export function pixelsToPngBlob(
  pixels: Uint8Array,
  width: number,
  height: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);

  // WebGL reads pixels bottom-to-top; canvas ImageData is top-to-bottom, so
  // each row is copied into its vertically mirrored position.
  const rowBytes = width * 4;
  for (let y = 0; y < height; y++) {
    const srcStart = y * rowBytes;
    const destStart = (height - 1 - y) * rowBytes;
    imageData.data.set(pixels.subarray(srcStart, srcStart + rowBytes), destStart);
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Thumbnail render produced no image data"));
      }
    }, "image/png");
  });
}

export async function renderShotThumbnail(
  gl: THREE.WebGLRenderer,
  scene3d: THREE.Scene,
  framing: Framing,
  lensMm: number
): Promise<Blob> {
  const { pixels, width, height } = renderShotPixels(gl, scene3d, framing, lensMm);
  return pixelsToPngBlob(pixels, width, height);
}
```

- [ ] Write `src/viewport/ThumbnailWorker.tsx`. It mounts inside `StageCanvas`'s `<Canvas>` (it needs `useThree` for `gl` and the live `scene`). For each stale shot it snapshots every set object's THREE node, applies that shot's resolved visibility and transform (`resolveSceneAll`, which keeps every object, hidden ones included, so nothing needs a separate "not present" branch), hides every helper node (ground, gizmo, and anything else named with the `helper:` prefix), reads pixels synchronously, restores everything in a `finally`, and only then awaits the PNG encode:

```tsx
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

import { useDocumentStore } from "@/state/document-store";
import { resolveSceneAll, cameraAt } from "@/domain/resolve";
import { hashShotState } from "@/domain/hash";
import { shotsNeedingThumbs } from "@/viewport/thumbnail-queue";
import { renderShotPixels, pixelsToPngBlob } from "@/viewport/thumbnails";
import { putBlob, deleteBlob } from "@/storage/blob-store";
import { setShotThumb } from "@/state/shot-actions";
import type { Scene, Shot } from "@/domain/types";

export function ThumbnailWorker({ scene, sceneId }: { scene: Scene; sceneId: string }) {
  const { gl, scene: scene3d } = useThree();
  const project = useDocumentStore((s) => s.project);
  const applyTransient = useDocumentStore((s) => s.applyTransient);
  const rendering = useRef(false);

  useEffect(() => {
    if (!project) return;

    const timer = window.setTimeout(async () => {
      if (rendering.current) return;
      rendering.current = true;
      try {
        const hashes: Record<string, string> = {};
        for (const shot of scene.shots) {
          hashes[shot.id] = await hashShotState(scene, shot, project.props);
        }

        const staleIds = shotsNeedingThumbs(scene, hashes);
        for (const shotId of staleIds) {
          const shot = scene.shots.find((candidate) => candidate.id === shotId);
          if (!shot) continue;

          const blob = await renderShotForThumbnail(gl, scene3d, scene, shot);
          const key = `thumb:${shot.id}:${hashes[shotId]}`;
          const previousKey = shot.thumb?.blobKey;

          await putBlob({ key, projectId: project.id, kind: "thumb", blob });
          if (previousKey) {
            await deleteBlob(previousKey);
          }

          applyTransient((draft) => {
            setShotThumb(draft, sceneId, shot.id, { blobKey: key, stateHash: hashes[shotId] });
          });
        }
      } finally {
        rendering.current = false;
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [project, scene, sceneId, gl, scene3d, applyTransient]);

  return null;
}

async function renderShotForThumbnail(
  gl: THREE.WebGLRenderer,
  scene3d: THREE.Scene,
  scene: Scene,
  shot: Shot
): Promise<Blob> {
  const resolved = resolveSceneAll(scene, shot, 0);
  const framing = cameraAt(shot.camera, 0);

  type ObjectSnapshot = {
    visible: boolean;
    position: THREE.Vector3;
    rotationY: number;
    scale: number;
  };
  const objectSnapshots = new Map<string, ObjectSnapshot>();
  const helperSnapshots = new Map<THREE.Object3D, boolean>();

  // Everything from here through the try/finally below runs with no await in
  // between: renderShotPixels is synchronous, so the live render loop, which
  // runs on its own schedule outside this function, can never draw a frame
  // while the scene sits in another shot's layout. The visible frame is
  // therefore never actually shown in the overridden state. PNG encoding,
  // the only async step, happens after the finally has already restored
  // every node.
  for (const object of scene.set.objects) {
    const node = scene3d.getObjectByName(`obj:${object.id}`);
    if (!node) continue;

    objectSnapshots.set(object.id, {
      visible: node.visible,
      position: node.position.clone(),
      rotationY: node.rotation.y,
      scale: node.scale.x,
    });

    const resolvedObject = resolved.find((candidate) => candidate.id === object.id);
    if (!resolvedObject) continue;
    node.visible = resolvedObject.visible;
    node.position.set(
      resolvedObject.transform.position[0],
      resolvedObject.transform.position[1],
      resolvedObject.transform.position[2]
    );
    node.rotation.y = resolvedObject.transform.rotationY;
    node.scale.setScalar(resolvedObject.transform.scale);
  }

  scene3d.traverse((node) => {
    if (node.name.startsWith("helper:")) {
      helperSnapshots.set(node, node.visible);
      node.visible = false;
    }
  });

  let pixels: { pixels: Uint8Array; width: number; height: number };
  try {
    pixels = renderShotPixels(gl, scene3d, framing, shot.camera.lensMm);
  } finally {
    for (const [id, snapshot] of objectSnapshots) {
      const node = scene3d.getObjectByName(`obj:${id}`);
      if (!node) continue;
      node.visible = snapshot.visible;
      node.position.copy(snapshot.position);
      node.rotation.y = snapshot.rotationY;
      node.scale.setScalar(snapshot.scale);
    }
    for (const [node, visible] of helperSnapshots) {
      node.visible = visible;
    }
  }

  return pixelsToPngBlob(pixels.pixels, pixels.width, pixels.height);
}
```

Known limitation: a doll's per-shot pose override is not reflected in the thumbnail of a shot other than the one currently on screen, because pose is applied by React (it picks a rig, not a node transform), not by anything `renderShotForThumbnail` can snapshot and restore on a THREE node. This is revisited in S3.

- [ ] Modify `src/viewport/StageCanvas.tsx` with exactly two edits. Leave everything else in the file exactly as Task 18 left it: this task never reconstructs that file, since `Gizmo`, the rig components and `SceneContents` all belong to Tasks 16 to 18.

  (a) Add to the imports:

  ```tsx
  import { ThumbnailWorker } from "@/viewport/ThumbnailWorker";
  ```

  (b) Directly after the existing line

  ```tsx
  <SceneContents objects={objects} selectedId={selectedObjectId} onSelect={select} registerNode={registerNode} />
  ```

  insert:

  ```tsx
  {scene && <ThumbnailWorker scene={scene} sceneId={scene.id} />}
  ```

- [ ] Modify `src/app/components/ShotStrip.tsx` so each card reads its thumbnail from the blob store. Full contents (the only change from Task 20 is the `ShotThumbnailImage` helper and its use in `ShotCard`):

```tsx
import { useEffect, useState } from "react";
import { NavLink, useMatch, useParams } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@weeeha/ui/components/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@weeeha/ui/components/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@weeeha/ui/components/alert-dialog";
import { Button } from "@weeeha/ui/components/button";
import { ScrollArea, ScrollBar } from "@weeeha/ui/components/scroll-area";
import { Skeleton } from "@weeeha/ui/components/skeleton";
import { cn } from "@/lib/utils";
import { Plus, Copy, Trash2, ChevronLeft, ChevronRight, Clapperboard } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { findScene } from "@/domain/lookup";
import { addShot, duplicateShot, deleteShot, moveShot } from "@/state/shot-actions";
import { getBlob } from "@/storage/blob-store";
import type { Shot } from "@/domain/types";

export function ShotStrip({ sceneId }: { sceneId: string }) {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useDocumentStore((s) => s.project);
  const apply = useDocumentStore((s) => s.apply);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const shotMatch = useMatch("/p/:projectId/shot/:shotId");
  const activeShotId = shotMatch?.params.shotId ?? null;

  if (!project) return null;
  const scene = findScene(project, sceneId);
  if (!scene) return null;

  const handleAdd = () => {
    apply((draft) => {
      addShot(draft, sceneId);
    });
  };

  return (
    <ScrollArea className="w-full border-t border-border">
      <div className="flex items-center gap-2 p-2">
        <NavLink
          to={`/p/${projectId}/scene/${sceneId}`}
          className={({ isActive }) =>
            cn(
              "inline-flex h-14 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium",
              isActive ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
            )
          }
        >
          <Clapperboard className="size-4" />
          Set
        </NavLink>

        {scene.shots.map((shot, index) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            index={index}
            sceneId={sceneId}
            projectId={projectId ?? ""}
            active={shot.id === activeShotId}
            canMoveLeft={index > 0}
            canMoveRight={index < scene.shots.length - 1}
            readOnly={readOnly}
          />
        ))}

        <Button
          variant="outline"
          size="icon"
          aria-label="Add shot"
          onClick={handleAdd}
          disabled={readOnly}
        >
          <Plus />
        </Button>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function ShotThumbnailImage({ blobKey }: { blobKey: string | undefined }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blobKey) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    getBlob(blobKey).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blobKey]);

  if (!url) {
    return <Skeleton className="h-6 w-12 rounded-sm" />;
  }
  return <img src={url} alt="" className="h-6 w-12 rounded-sm object-cover" />;
}

function ShotCard({
  shot,
  index,
  sceneId,
  projectId,
  active,
  canMoveLeft,
  canMoveRight,
  readOnly,
}: {
  shot: Shot;
  index: number;
  sceneId: string;
  projectId: string;
  active: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  readOnly: boolean;
}) {
  const apply = useDocumentStore((s) => s.apply);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleDuplicate = () => {
    apply((draft) => {
      duplicateShot(draft, sceneId, shot.id);
    });
  };
  const handleDelete = () => {
    apply((draft) => {
      deleteShot(draft, sceneId, shot.id);
    });
  };
  const handleMoveLeft = () => {
    apply((draft) => {
      moveShot(draft, sceneId, shot.id, index - 1);
    });
  };
  const handleMoveRight = () => {
    apply((draft) => {
      moveShot(draft, sceneId, shot.id, index + 1);
    });
  };
  const requestDelete = () => setConfirmDeleteOpen(true);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="relative shrink-0">
            <NavLink
              to={`/p/${projectId}/shot/${shot.id}`}
              aria-label={`Shot ${index + 1}, ${shot.name}`}
              className={cn(
                "flex h-14 w-28 flex-col justify-between rounded-lg border border-border p-1.5 text-start text-xs",
                active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-medium">{String(index + 1).padStart(2, "0")}</span>
                <ShotThumbnailImage blobKey={shot.thumb?.blobKey} />
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="truncate">{shot.name}</span>
                <span>{shot.durationSec}s</span>
              </div>
            </NavLink>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute -top-1.5 -end-1.5 rounded-full bg-card"
                  aria-label={`More actions for ${shot.name}`}
                >
                  <span aria-hidden="true">...</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={handleDuplicate} disabled={readOnly}>
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleMoveLeft}
                  disabled={readOnly || !canMoveLeft}
                >
                  <ChevronLeft />
                  Move left
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleMoveRight}
                  disabled={readOnly || !canMoveRight}
                >
                  <ChevronRight />
                  Move right
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={readOnly}
                  onSelect={(event) => {
                    event.preventDefault();
                    requestDelete();
                  }}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={handleDuplicate} disabled={readOnly}>
            <Copy />
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleMoveLeft} disabled={readOnly || !canMoveLeft}>
            <ChevronLeft />
            Move left
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleMoveRight} disabled={readOnly || !canMoveRight}>
            <ChevronRight />
            Move right
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            disabled={readOnly}
            onSelect={(event) => {
              event.preventDefault();
              requestDelete();
            }}
          >
            <Trash2 />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this shot</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes {shot.name}. Cmd+Z still works right after.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] Run `npx vitest run "src/app/components/ShotStrip.test.tsx"`. Expected pass: 2 passed, 0 failed (the strip's existing tests still hold, since a shot with no `thumb` still renders the same `Skeleton`).

- [ ] Modify `src/app/routes/BoardPage.tsx` so scene cards read real thumbnails too. Full contents (only the shots row inside `CardContent` changes from Task 19):

```tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { Button } from "@weeeha/ui/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@weeeha/ui/components/card";
import { Badge } from "@weeeha/ui/components/badge";
import { Skeleton } from "@weeeha/ui/components/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@weeeha/ui/components/empty";
import { Plus, Clapperboard } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { addScene } from "@/state/shot-actions";
import { getBlob } from "@/storage/blob-store";
import type { Shot } from "@/domain/types";

function BoardShotThumbnail({ blobKey }: { blobKey: string | undefined }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blobKey) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    getBlob(blobKey).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blobKey]);

  if (!url) {
    return <Skeleton className="h-12 w-20 shrink-0 rounded-md" />;
  }
  return <img src={url} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" />;
}

export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useDocumentStore((s) => s.project);
  const apply = useDocumentStore((s) => s.apply);
  const readOnly = useDocumentStore((s) => s.readOnly);

  if (!project) {
    return null;
  }

  const handleAddScene = () => {
    apply((draft) => {
      addScene(draft, `Scene ${draft.scenes.length + 1}`);
    });
  };

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-medium">{project.name}</h1>
        <Button onClick={handleAddScene} disabled={readOnly}>
          <Plus />
          Add scene
        </Button>
      </div>

      {project.scenes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Clapperboard />
            </EmptyMedia>
            <EmptyTitle>No scenes yet</EmptyTitle>
            <EmptyDescription>Add a scene to start dressing a set.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={handleAddScene} disabled={readOnly}>
              <Plus />
              Add scene
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {project.scenes.map((scene) => (
            <li key={scene.id}>
              <Link to={`/p/${projectId}/scene/${scene.id}`}>
                <Card>
                  <CardHeader>
                    <CardTitle>{scene.name}</CardTitle>
                    <CardDescription>
                      {scene.shots.length} {scene.shots.length === 1 ? "shot" : "shots"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 overflow-x-hidden">
                      {scene.shots.length === 0 ? (
                        <Badge variant="outline">Empty set</Badge>
                      ) : (
                        scene.shots
                          .slice(0, 4)
                          .map((shot: Shot) => (
                            <BoardShotThumbnail key={shot.id} blobKey={shot.thumb?.blobKey} />
                          ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] Run `npx vitest run "src/app/routes/BoardPage.test.tsx"`. Expected pass: 2 passed, 0 failed.

- [ ] Run the full check: `npm run typecheck && npm run lint && npm test`. Expected: all three succeed, no errors.

- [ ] Commit:

```bash
cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/viewport/thumbnail-queue.ts src/viewport/thumbnail-queue.test.ts src/viewport/thumbnails.ts src/viewport/ThumbnailWorker.tsx src/viewport/StageCanvas.tsx src/app/components/ShotStrip.tsx src/app/routes/BoardPage.tsx && git commit -m "$(cat <<'EOF'
feat: shot thumbnails

Adds shotsNeedingThumbs, a synchronous renderShotPixels plus an async
pixelsToPngBlob composed as renderShotThumbnail, and a ThumbnailWorker
component mounted inside the canvas by a two-line StageCanvas edit. It
renders each stale shot by temporarily overriding the live scene's own
objects and helper nodes, reading pixels synchronously, then restoring
everything before the PNG encode runs, so the visible frame never shows
the wrong shot. The strip and the board now read thumbnails from the blob
store through object URLs revoked on unmount.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 22: Shortcuts, undo and export UI, full smoke test, docs, S1 verification

**Files:**
- Create: `src/app/hooks/useKeyboardShortcuts.ts`
- Create: `src/app/hooks/useKeyboardShortcuts.test.tsx`
- Create: `src/app/components/UndoRedoButtons.tsx`
- Create: `src/app/components/UndoRedoButtons.test.tsx`
- Create: `src/app/components/ExportImportButtons.tsx`
- Create: `src/app/components/ExportImportButtons.test.tsx`
- Modify: `src/app/routes/ProjectLayout.tsx`
- Modify: `e2e/smoke.spec.ts`
- Modify: `README.md`
- Modify: `AGENTS.md`

**Interfaces:**

Consumes:
```ts
// src/state/document-store.ts
export const useDocumentStore: UseBoundStore<StoreApi<DocumentState>>; // undo, redo, canUndo, canRedo, apply, applyTransient

// src/state/editor-store.ts
export const useEditorStore: UseBoundStore<StoreApi<EditorState>>; // setGizmoMode, selectedObjectId, select

// src/state/object-actions.ts
export function deleteObject(draft: Project, sceneId: string, objectId: string): void;

// src/domain/lookup.ts
export function findShot(project: Project, shotId: string): { scene: Scene; shot: Shot } | null;

// src/storage/export-import.ts
export function exportProjectJson(project: Project): Blob;
export function exportFileName(project: Project): string;
export function importProjectJson(file: Blob): Promise<Project>;

// src/storage/project-repo.ts
export function saveProject(project: Project): Promise<void>;

// src/components/super-ai/shortcuts-sheet.tsx (installed by Task 2)
export function ShortcutsSheet(props: {
  sections: ShortcutSection[];
  title?: string;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}): JSX.Element;
export type ShortcutSection = { title: string; shortcuts: { label: string; keys: string[] }[] };

// src/app/components/ThemeToggle.tsx (produced by Task 2)
export function ThemeToggle(): JSX.Element;
```

Produces:
```ts
// src/app/hooks/useKeyboardShortcuts.ts
export function useKeyboardShortcuts(options: { onOpenShortcuts: () => void }): void;

// src/app/components/UndoRedoButtons.tsx
export function UndoRedoButtons(): JSX.Element;

// src/app/components/ExportImportButtons.tsx
export function ExportImportButtons(): JSX.Element;
```

`ShortcutsSheet` is driven by controlled `open`/`onOpenChange` state from `ProjectLayout`, not by its `trigger` prop, so this task never has to reach into how the installed component wires its Dialog trigger internally.

- [ ] Write the failing test for the shortcuts hook, `src/app/hooks/useKeyboardShortcuts.test.tsx`:

```tsx
import "fake-indexeddb/auto";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, Routes, Route, MemoryRouter, useParams } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject, createPrimitive } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { addScene, addShot } from "@/state/shot-actions";
import { addObject } from "@/state/object-actions";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function Harness({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  useKeyboardShortcuts({ onOpenShortcuts });
  return <input aria-label="Somewhere else" />;
}

function renderHarness(initialPath: string, onOpenShortcuts = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/p/:projectId/scene/:sceneId" element={<Harness onOpenShortcuts={onOpenShortcuts} />} />
        <Route path="/p/:projectId" element={<Harness onOpenShortcuts={onOpenShortcuts} />} />
      </Routes>
    </MemoryRouter>
  );
  return onOpenShortcuts;
}

beforeEach(async () => {
  await resetDbForTests();
  useEditorStore.setState({ gizmoMode: "translate", selectedObjectId: null });
});

describe("useKeyboardShortcuts", () => {
  it("switches gizmo mode on W, E, R", () => {
    renderHarness("/p/proj1");

    fireEvent.keyDown(window, { key: "e" });
    expect(useEditorStore.getState().gizmoMode).toBe("rotate");
    fireEvent.keyDown(window, { key: "r" });
    expect(useEditorStore.getState().gizmoMode).toBe("scale");
    fireEvent.keyDown(window, { key: "w" });
    expect(useEditorStore.getState().gizmoMode).toBe("translate");
  });

  it("opens the shortcuts sheet on ?", () => {
    const onOpenShortcuts = renderHarness("/p/proj1");
    fireEvent.keyDown(window, { key: "?" });
    expect(onOpenShortcuts).toHaveBeenCalledTimes(1);
  });

  it("ignores shortcuts while typing in an input", () => {
    renderHarness("/p/proj1");
    const input = screen.getByLabelText("Somewhere else");
    fireEvent.keyDown(input, { key: "e" });
    expect(useEditorStore.getState().gizmoMode).toBe("translate");
  });

  it("deletes the selected object on Delete", async () => {
    const project = createProject("Job Smith");
    let sceneId = "";
    let objectId = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      const box = createPrimitive("box");
      objectId = box.id;
      addObject(draft, sceneId, box);
    });
    useEditorStore.setState({ selectedObjectId: objectId });

    renderHarness(`/p/${project.id}/scene/${sceneId}`);
    fireEvent.keyDown(window, { key: "Delete" });

    expect(useDocumentStore.getState().project!.scenes[0].set.objects).toHaveLength(0);
  });

  it("moves to the next and previous shot with ] and [", async () => {
    const project = createProject("Job Smith");
    let sceneId = "";
    let shot1Id = "";
    let shot2Id = "";
    useDocumentStore.getState().load(project, {});
    useDocumentStore.getState().apply((draft) => {
      sceneId = addScene(draft, "Kitchen");
      shot1Id = addShot(draft, sceneId);
      shot2Id = addShot(draft, sceneId);
    });

    function ShotScreenRoute() {
      const { shotId } = useParams<{ shotId: string }>();
      useKeyboardShortcuts({ onOpenShortcuts: () => {} });
      return <div>{shotId === shot2Id ? "Shot two" : "Shot one"}</div>;
    }

    const router = createMemoryRouter(
      [{ path: "/p/:projectId/shot/:shotId", element: <ShotScreenRoute /> }],
      { initialEntries: [`/p/${project.id}/shot/${shot1Id}`] }
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByText("Shot one")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "]" });
    expect(await screen.findByText("Shot two")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "[" });
    expect(await screen.findByText("Shot one")).toBeInTheDocument();
  });
});
```

- [ ] Run `npx vitest run "src/app/hooks/useKeyboardShortcuts.test.tsx"`. Expected failure: fails to resolve `./useKeyboardShortcuts`.

- [ ] Write `src/app/hooks/useKeyboardShortcuts.ts`:

```ts
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";

import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { deleteObject } from "@/state/object-actions";
import { findShot } from "@/domain/lookup";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function useKeyboardShortcuts(options: { onOpenShortcuts: () => void }) {
  const navigate = useNavigate();
  const { projectId, sceneId, shotId } = useParams<{
    projectId: string;
    sceneId?: string;
    shotId?: string;
  }>();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;
      if (isTypingTarget(event.target)) return;

      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          useDocumentStore.getState().redo();
        } else {
          useDocumentStore.getState().undo();
        }
        return;
      }
      if (meta) return;

      if (event.key === "?") {
        event.preventDefault();
        options.onOpenShortcuts();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const { selectedObjectId } = useEditorStore.getState();
        const project = useDocumentStore.getState().project;
        const activeSceneId = sceneId ?? (shotId && project ? findShot(project, shotId)?.scene.id : undefined);
        if (!selectedObjectId || !project || !activeSceneId) return;
        event.preventDefault();
        useDocumentStore.getState().apply((draft) => {
          deleteObject(draft, activeSceneId, selectedObjectId);
        });
        useEditorStore.getState().select(null);
        return;
      }

      if (event.key === "w" || event.key === "W") {
        useEditorStore.getState().setGizmoMode("translate");
        return;
      }
      if (event.key === "e" || event.key === "E") {
        useEditorStore.getState().setGizmoMode("rotate");
        return;
      }
      if (event.key === "r" || event.key === "R") {
        useEditorStore.getState().setGizmoMode("scale");
        return;
      }

      if ((event.key === "[" || event.key === "]") && shotId) {
        const project = useDocumentStore.getState().project;
        const found = project ? findShot(project, shotId) : null;
        if (!found) return;
        const index = found.scene.shots.findIndex((shot) => shot.id === shotId);
        if (index === -1) return;
        const nextIndex = event.key === "[" ? index - 1 : index + 1;
        const nextShot = found.scene.shots[nextIndex];
        if (nextShot) {
          event.preventDefault();
          navigate(`/p/${projectId}/shot/${nextShot.id}`);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, projectId, sceneId, shotId, options]);
}
```

- [ ] Run `npx vitest run "src/app/hooks/useKeyboardShortcuts.test.tsx"`. Expected pass: 5 passed, 0 failed.

- [ ] Write the failing test for undo and redo, `src/app/components/UndoRedoButtons.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { UndoRedoButtons } from "./UndoRedoButtons";

describe("UndoRedoButtons", () => {
  it("undo is disabled until a change is applied, then undoes it", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});

    render(<UndoRedoButtons />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    useDocumentStore.getState().apply((draft) => {
      draft.name = "Renamed";
    });
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(useDocumentStore.getState().project?.name).toBe("Job Smith");
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
  });
});
```

- [ ] Run `npx vitest run "src/app/components/UndoRedoButtons.test.tsx"`. Expected failure: fails to resolve `./UndoRedoButtons`.

- [ ] Write `src/app/components/UndoRedoButtons.tsx`:

```tsx
import { Button } from "@weeeha/ui/components/button";
import { ButtonGroup } from "@weeeha/ui/components/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@weeeha/ui/components/tooltip";
import { Undo2, Redo2 } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";

export function UndoRedoButtons() {
  const canUndo = useDocumentStore((s) => s.canUndo);
  const canRedo = useDocumentStore((s) => s.canRedo);
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);

  return (
    <ButtonGroup>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Undo" disabled={!canUndo} onClick={undo}>
            <Undo2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Redo" disabled={!canRedo} onClick={redo}>
            <Redo2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo</TooltipContent>
      </Tooltip>
    </ButtonGroup>
  );
}
```

- [ ] Run `npx vitest run "src/app/components/UndoRedoButtons.test.tsx"`. Expected pass: 1 passed, 0 failed.

- [ ] Write the failing test for export and import, `src/app/components/ExportImportButtons.test.tsx`:

```tsx
import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDbForTests } from "@/storage/db";
import { createProject } from "@/domain/factories";
import { useDocumentStore } from "@/state/document-store";
import { ExportImportButtons } from "./ExportImportButtons";

beforeEach(async () => {
  await resetDbForTests();
});

describe("ExportImportButtons", () => {
  it("exports the project and records lastExportedAt", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});
    expect(useDocumentStore.getState().project?.lastExportedAt).toBeUndefined();

    render(<ExportImportButtons />);
    await user.click(screen.getByRole("button", { name: "Export project" }));

    expect(useDocumentStore.getState().project?.lastExportedAt).toBeDefined();
  });

  it("imports a project from a file as a new project", async () => {
    const user = userEvent.setup();
    const project = createProject("Job Smith");
    useDocumentStore.getState().load(project, {});

    const { exportProjectJson } = await import("@/storage/export-import");
    const source = createProject("Exported film");
    const blob = exportProjectJson(source);
    const file = new File([await blob.text()], "exported-film.sb3d.json", {
      type: "application/json",
    });

    render(<ExportImportButtons />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    const { listProjects } = await import("@/storage/project-repo");
    const summaries = await listProjects();
    expect(summaries.some((summary) => summary.name === "Exported film")).toBe(true);
  });
});
```

- [ ] Run `npx vitest run "src/app/components/ExportImportButtons.test.tsx"`. Expected failure: fails to resolve `./ExportImportButtons`.

- [ ] Write `src/app/components/ExportImportButtons.tsx`:

```tsx
import { useRef } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";

import { Button } from "@weeeha/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@weeeha/ui/components/tooltip";
import { Download, Upload } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { exportProjectJson, exportFileName, importProjectJson } from "@/storage/export-import";
import { saveProject } from "@/storage/project-repo";

export function ExportImportButtons() {
  const project = useDocumentStore((s) => s.project);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const applyTransient = useDocumentStore((s) => s.applyTransient);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (!project) return;
    const blob = exportProjectJson(project);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName(project);
    link.click();
    URL.revokeObjectURL(url);
    applyTransient((draft) => {
      draft.lastExportedAt = new Date().toISOString();
    });
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = await importProjectJson(file);
      await saveProject(imported);
      toast.success(`Imported as a new project: ${imported.name}`);
    } catch {
      toast.error("That file could not be imported.");
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Export project"
            disabled={!project}
            onClick={handleExport}
          >
            <Download />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export project</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Import project"
            disabled={readOnly}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Import project</TooltipContent>
      </Tooltip>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportChange}
      />
    </>
  );
}
```

- [ ] Run `npx vitest run "src/app/components/ExportImportButtons.test.tsx"`. Expected pass: 2 passed, 0 failed.

- [ ] Modify `src/app/routes/ProjectLayout.tsx` to add the global toolbar (breadcrumb, undo/redo, export/import, shortcuts) and wire `useKeyboardShortcuts`. Full contents:

```tsx
import { useEffect, useRef, useState } from "react";
import { Outlet, useParams, Link } from "react-router";

import { loadProject, saveProject } from "@/storage/project-repo";
import { acquireProjectLock } from "@/storage/project-lock";
import { createAutosaver } from "@/storage/autosave";
import { useDocumentStore, setAutosaver } from "@/state/document-store";

import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@weeeha/ui/components/empty";
import { Skeleton } from "@weeeha/ui/components/skeleton";
import { Button } from "@weeeha/ui/components/button";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@weeeha/ui/components/breadcrumb";
import { Tooltip, TooltipContent, TooltipTrigger } from "@weeeha/ui/components/tooltip";
import { FolderOpen, Keyboard } from "lucide-react";

import { SaveBanner } from "@/app/components/SaveBanner";
import { ReadOnlyNotice } from "@/app/components/ReadOnlyNotice";
import { UndoRedoButtons } from "@/app/components/UndoRedoButtons";
import { ExportImportButtons } from "@/app/components/ExportImportButtons";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { useKeyboardShortcuts } from "@/app/hooks/useKeyboardShortcuts";
import { ShortcutsSheet } from "@/components/super-ai/shortcuts-sheet";
import type { ShortcutSection } from "@/components/super-ai/shortcuts-sheet";

let persistRequested = false;

type LoadState = "loading" | "not-found" | "ready";

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: "Editing",
    shortcuts: [
      { label: "Undo", keys: ["⌘", "Z"] },
      { label: "Redo", keys: ["⇧", "⌘", "Z"] },
      { label: "Delete selection", keys: ["Delete"] },
    ],
  },
  {
    title: "Gizmo",
    shortcuts: [
      { label: "Move", keys: ["W"] },
      { label: "Rotate", keys: ["E"] },
      { label: "Scale", keys: ["R"] },
    ],
  },
  {
    title: "Shots",
    shortcuts: [
      { label: "Previous shot", keys: ["["] },
      { label: "Next shot", keys: ["]"] },
    ],
  },
  {
    title: "Help",
    shortcuts: [{ label: "Shortcuts", keys: ["?"] }],
  },
];

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const [state, setState] = useState<LoadState>("loading");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const releaseRef = useRef<(() => void) | null>(null);

  const project = useDocumentStore((s) => s.project);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const saveStatus = useDocumentStore((s) => s.saveStatus);
  const saveFailures = useDocumentStore((s) => s.saveFailures);

  useKeyboardShortcuts({ onOpenShortcuts: () => setShortcutsOpen(true) });

  useEffect(() => {
    if (!projectId) {
      setState("not-found");
      return;
    }

    let cancelled = false;
    let autosaver: ReturnType<typeof createAutosaver> | null = null;

    async function open() {
      const loaded = await loadProject(projectId!);
      if (cancelled) return;
      if (!loaded) {
        setState("not-found");
        return;
      }

      const lock = await acquireProjectLock(projectId!);
      if (cancelled) {
        lock.release();
        return;
      }
      releaseRef.current = lock.release;

      autosaver = createAutosaver({
        save: saveProject,
        onStatus: (status, failures) => {
          useDocumentStore.setState({ saveStatus: status, saveFailures: failures });
        },
      });
      setAutosaver(autosaver);

      useDocumentStore.getState().load(loaded, { readOnly: lock.readOnly });
      setState("ready");

      if (!persistRequested) {
        persistRequested = true;
        void navigator.storage?.persist?.();
      }
    }

    open();

    const flush = () => {
      autosaver?.flush();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
      autosaver?.flush();
      autosaver?.dispose();
      setAutosaver(null);
      releaseRef.current?.();
      releaseRef.current = null;
      useDocumentStore.getState().close();
    };
  }, [projectId]);

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (state === "not-found") {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen />
          </EmptyMedia>
          <EmptyTitle>Project not found</EmptyTitle>
          <EmptyDescription>
            This project does not exist in this browser.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/">Back to projects</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="flex h-dvh flex-col">
      {saveStatus === "error" ? <SaveBanner failures={saveFailures} project={project} /> : null}
      {readOnly ? <ReadOnlyNotice /> : null}
      <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2">
          <UndoRedoButtons />
          <ExportImportButtons />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Keyboard shortcuts"
                onClick={() => setShortcutsOpen(true)}
              >
                <Keyboard />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Keyboard shortcuts</TooltipContent>
          </Tooltip>
          <ThemeToggle />
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
      <ShortcutsSheet
        sections={SHORTCUT_SECTIONS}
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </div>
  );
}
```

- [ ] Run `npx vitest run "src/app/routes/ProjectLayout.test.tsx"`. Expected pass: 4 passed, 0 failed (unchanged from Task 19, since none of its assertions touch the new header).

- [ ] Modify `e2e/smoke.spec.ts` to cover the S1 flow instead of the S0 placeholder. Full contents:

```ts
import { test, expect } from "@playwright/test";

test("S1 walking skeleton: create a project, dress a set, shoot, and reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No projects yet")).toBeVisible();

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("Job Smith");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByText("No scenes yet")).toBeVisible();
  await page.getByRole("button", { name: "Add scene" }).click();
  await page.getByRole("link", { name: /Scene 1/ }).first().click();

  await expect(page.getByText("The set is empty")).toBeVisible();
  await page.getByRole("button", { name: "Add box" }).click();
  await expect(page.getByText("The set is empty")).toHaveCount(0);

  await page.getByRole("button", { name: "Add shot" }).click();
  await page.getByRole("button", { name: "Add shot" }).click();
  await expect(page.getByRole("link", { name: /Shot 1, Shot 01/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Shot 2, Shot 02/ })).toBeVisible();

  await page.getByRole("link", { name: /Shot 1, Shot 01/ }).click();
  await expect(page.getByLabel("Name")).toHaveValue("Shot 01");

  await page.getByRole("link", { name: /Shot 2, Shot 02/ }).click();
  await expect(page.getByLabel("Name")).toHaveValue("Shot 02");

  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(page.getByLabel("Name")).toHaveValue("Shot 02");

  await page.getByRole("link", { name: "Set" }).click();
  await expect(page.getByText("The set is empty")).toHaveCount(0);
});
```

- [ ] Run `npx playwright test` from `/Users/nickv/ClaudeCode Projects/scene-builder-3d`. Expected pass: 1 passed (Chromium), 1 passed (WebKit).

- [ ] Modify `README.md`: replace the status line and add a short "What is built" section. This step shows the exact before and after text, rather than the whole file, because Task 3 (S0) may already have touched the status line and this task must not silently overwrite work from a task it does not own; every other line in the file is left untouched.

Change:
```md
> **Status:** exploration · **Stage:** design, no app code yet · **Live URL:** none yet
```
to:
```md
> **Status:** S1 walking skeleton shipped · **Stage:** browser app, domain through app layers built · **Live URL:** see the Vercel project's Preview deployment for this branch
```

Add, right after the "Sketches, sitemap and concept map" line and before "## Next":
```md
## What is built

S0 (scaffold) and S1 (walking skeleton) are done: create a project, dress a
set with primitives and dolls, add and frame shots, move between them in one
click on a canvas that never remounts, autosave, undo and redo, JSON export
and import. See `docs/superpowers/specs/2026-09-18-scene-builder-3d-design.md`
for what S2 (props) adds next.
```

- [ ] Modify `AGENTS.md`: fill in the stack and add a commands table. This step also shows the exact before and after text for the same reason as the README edit above.

Change:
```md
## Stack

Not decided here. The design spec in `docs/superpowers/specs/` decides it. Both
predecessors use Next.js 16 + React 19 + react-three-fiber + Zustand, so that is
the default to beat, not a given.
```
to:
```md
## Stack

Decided in `docs/superpowers/specs/2026-09-18-scene-builder-3d-design.md` and
built in S0 and S1: Vite 7, React 19, TypeScript 5, react-three-fiber 9, drei
10, three 0.185, Zustand 5 with Immer, React Router 7 (library mode), Tailwind
CSS 4, `@weeeha/ui` (Nick's Minimal Design System, vendored into `packages/ui`),
Super AI Components (`kbd`, `field-row`, `choice-chips`, `shortcuts-sheet`),
`idb` 8, Zod 4, Vitest 4, Playwright, ESLint 9. No Next.js: this is a static,
browser-only app with no server.

## Commands

Run from `/Users/nickv/ClaudeCode Projects/scene-builder-3d`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run e2e` | Playwright against `npm run preview` |
```

- [ ] Run the full check from `/Users/nickv/ClaudeCode Projects/scene-builder-3d`: `npm run typecheck && npm run lint && npm test && npm run build && npm run e2e`. Expected: all five succeed, no errors.

- [ ] Commit:

```bash
cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git add src/app/hooks/useKeyboardShortcuts.ts src/app/hooks/useKeyboardShortcuts.test.tsx src/app/components/UndoRedoButtons.tsx src/app/components/UndoRedoButtons.test.tsx src/app/components/ExportImportButtons.tsx src/app/components/ExportImportButtons.test.tsx src/app/routes/ProjectLayout.tsx e2e/smoke.spec.ts README.md AGENTS.md && git commit -m "$(cat <<'EOF'
feat: keyboard shortcuts, undo/export toolbar, S1 smoke test, docs

Adds Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Delete, W/E/R, [ and ] and the ? shortcuts
sheet, plus a project-wide toolbar with undo/redo and export/import. Extends
the smoke test to the S1 flow: create, dress, shoot, reload. Updates README
and AGENTS.md to record what S0 and S1 shipped.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

- [ ] Push the branch, which updates the PR opened in Task 3, and confirm the Vercel preview redeploys:

```bash
cd "/Users/nickv/ClaudeCode Projects/scene-builder-3d" && git push origin feat/s0-s1-walking-skeleton
```

Expected: the push succeeds, and the existing PR from Task 3 picks up the new commits; open the PR (or the Vercel dashboard) and copy the Preview URL it posts as a deployment check.

- [ ] S1 verification. Open the preview URL from the step above. Walk the spec's five S1 "Done when" items by hand, once in Chrome and once in Safari, and in each browser once in light mode and once in dark mode (toggle with the `Toggle theme` button in the header, or the `d` key from `ThemeProvider`'s hotkey, outside any text field):

  - [ ] 1. Create a project and a scene, place a box and a doll, add three shots, frame each one differently (open each shot, use Orbit to move the camera, confirm the framing sticks per shot).
  - [ ] 2. Any strip item opens in one click. (The canvas-identity half of this is already proven by `StageLayout.test.tsx`; here, confirm by eye that switching shots never blanks or flashes the viewport.)
  - [ ] 3. With target "This shot", move the doll in shot 02: shots 01 and 03 stay put. Switch target to "Set" and move it again: it moves in every shot that has no override for it.
  - [ ] 4. Reload the page: the document is exactly as left. Press Cmd+Z twenty times, then Shift+Cmd+Z twenty times: the document matches what it was before the twenty undos.
  - [ ] 5. Export the project, delete it from the Projects page, import the exported file: the reopened copy matches the original apart from its project id and timestamps.
  - [ ] Confirm the states: no projects (fresh browser profile or after deleting all projects), an empty scene (new scene, nothing placed), a scene with no shots (strip shows only `Set` and `+`), a save failure banner (block IndexedDB in devtools, make an edit, wait about 7 seconds for three retries), and a second tab opened to the same project shows the read-only notice.
  - [ ] Report the preview URL to Nick.
