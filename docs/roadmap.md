# scene-builder-3d: Roadmap

**Status:** exploration
**Date:** 2026-09-25
**Related:** [main spec](superpowers/specs/2026-09-18-scene-builder-3d-design.md) (S0-S2) · [VR operator spec](superpowers/specs/2026-09-18-vr-operator-design.md) (VR track) · draft PR #3 (`feat/s0-s1-walking-skeleton`)

## TL;DR

S0 and S1 are built on draft PR #3. One end-to-end test fails in Chromium in
CI while WebKit passes; that is the one thing blocking M1. After M1 closes,
the roadmap runs nine more milestones in a fixed order: props, then camera
and motion, then outputs, then four VR milestones (Scout, Operate, Rigs,
Director's calls), then an AI video bridge, then a portfolio release. A
Quest headset spike runs in parallel and has to finish before the first VR
milestone starts. Camera and motion (M3) absorbs a data model change: a shot
moves from single keyframe arrays to takes, decided 2026-09-25 and detailed
below. No milestone carries a date; each is sized S, M or L and gated on the
milestone before it.

## End state, three horizons

1. **Now: his own previs tool.** A browser-only app Nick uses to block scenes,
   place characters, frame shots and play them back, on the desktop and then
   in VR with a Quest.
2. **Then: a front end for AI video generation.** The tool packages a shot
   (guide clip, first frame, camera path, prompt) for a provider like Seedance
   instead of rendering final video itself.
3. **Then: a portfolio piece.** A public, unlisted-until-go demo with a seeded
   sample project and a case study on vyhouski.com, once the tool and the AI
   bridge work end to end.

## Milestones, M1 to M10

| # | Goal | Size | Gate | Spec | Done when |
|---|---|---|---|---|---|
| M1 | Close S1: fix the smoke test, verify the preview, merge PR #3 | S | none, in progress | [main spec](superpowers/specs/2026-09-18-scene-builder-3d-design.md) S1 | The five S1 done-when checks pass in Chrome and Safari on the Vercel preview, and PR #3 is merged to `main`. |
| M2 | S2 Props: GLB import, starter kit, palette placement | M | M1 | [main spec](superpowers/specs/2026-09-18-scene-builder-3d-design.md) S2 | The five S2 done-when checks pass: import and thumbnail, unit-fix offer, rejected corrupt/`.fbx` files, zip round trip, missing-blob placeholder. |
| M3 | Camera and motion: takes, lens formula, timeline, playback | L | M2 | [camera and motion design](superpowers/specs/2026-09-25-camera-and-motion-design.md) | A shot holds takes with one selected take, `cameraAt(take, t)` drives the viewport for both flat and dense tracks, the per-shot timeline plays a take back. |
| M4 | Outputs: deterministic clip render, storyboard export | L | M3 | [outputs design](superpowers/specs/2026-09-25-outputs-design.md) | A shot's selected take renders a deterministic clip, and storyboard export produces a PDF plus a zip of PNG frames. |
| M5 | VR Scout (V1): enter VR, stand in the set, view shots read-only | M | M4, and the Quest spike gate | [VR Scout design](superpowers/specs/2026-09-25-vr-scout-design.md) | From the headset, a shot opens at 1:1 scale with its frame visible on a viewfinder monitor, and jumping between shots works with no editing. |
| M6 | VR Operate handheld (V2): grab the camera, record a take | M | M5 | [VR Operate design](superpowers/specs/2026-09-25-vr-operate-design.md) | A handheld take recorded in the headset lands on the shot as a new take and replays correctly on the flat page. |
| M7 | VR Rigs (V3): tripod, dolly, crane, drone | M | M6 | [VR Rigs design](superpowers/specs/2026-09-25-vr-rigs-design.md) | Each rig constrains the camera to its invariant (tripod position fixed, dolly on its track, crane at its arm length, drone flying free) and a take recorded on a rig carries its `RigSetup`. |
| M8 | VR Director's calls (V4): "action" and "cut" by voice | S | M7 | [VR Director's calls design](superpowers/specs/2026-09-25-vr-directors-calls-design.md) | Saying "action" starts playback and recording and saying "cut" stops both and saves the take, with the controller trigger as a working fallback throughout. |
| M9 | AI video bridge: package a shot for a provider | M | M8 | [AI video bridge design](superpowers/specs/2026-09-25-ai-video-bridge-design.md) | A shot exports a zip with a grey guide clip, first frame, camera path and prompt, in a provider-neutral format with Seedance as the first named target. |
| M10 | Portfolio release: public demo plus case study | M | M9 | [portfolio release design](superpowers/specs/2026-09-25-portfolio-release-design.md) | The public demo runs on a seeded sample project in its own local storage namespace with no sign-in, and a case study draft exists for vyhouski.com. Both stay unlisted until Nick says go. |

## Parallel track: the Quest spike

The VR camera-feel spike (code in `spikes/vr-camera-feel/`, merged to `main`
in PR #2) is a parallel track, not a milestone in the M1-M10 line. It is a
throwaway headset run answering five questions: frame rate, steadiness,
legibility, takes as poses, and dev loop, plus a free probe on speech and mic
support. Its findings already landed in the VR operator spec section 4.11
(library gotchas) via PR #4. The remaining piece is the headset run itself,
recording results into that spec's section 4.10, which today reads `pending`
on every row.

The spike gates M5: VR Scout cannot start building until the headset run
answers whether the platform holds (a pass) or the fallback (a native Quest
app, VR operator spec section 2) has to be reopened first. It runs alongside
M1 through M4 and does not block any of them, since none of M1-M4 touch
WebXR.

## Dependency graph

```
M1 (close S1)
  └─ M2 (Props)
       └─ M3 (Camera and motion, merges VR piece F)
            └─ M4 (Outputs)
                 └─ M5 (VR Scout) ◄── Quest spike (parallel, gates M5 only)
                      └─ M6 (VR Operate)
                           └─ M7 (VR Rigs)
                                └─ M8 (VR Director's calls)
                                     └─ M9 (AI video bridge)
                                          └─ M10 (Portfolio release)
```

Every milestone gates strictly on the one before it. The Quest spike is the
only branch: it runs beside M1-M4 and only has to land before M5 begins.

## M1 detail: close S1

**Where things stand.** S0 and S1 are built on draft PR #3
(`feat/s0-s1-walking-skeleton`), not yet merged. CI on that PR is red in one
place: the Playwright smoke test in `e2e/smoke.spec.ts` fails in Chromium,
timing out around line 27 on the click of the "Shot 2, Shot 02" strip link,
while the same test passes in WebKit. The failure is browser-specific, which
points at a Chromium timing or selector issue rather than a broken feature,
since the identical assertion and click sequence succeeds in WebKit.

**Steps to close M1:**

1. Debug the Chromium timeout at that click. Read the test around line 27 in
   `e2e/smoke.spec.ts` on `origin/feat/s0-s1-walking-skeleton`, and check
   whether the strip link is present but not yet interactive, covered by
   another element, or racing the same autosave debounce the test's own
   comment already calls out for the reload step further down.
2. Fix the test or the underlying UI timing, whichever is at fault. Confirm
   both Chromium and WebKit pass in CI on the PR.
3. Open the Vercel preview for PR #3 and check it by hand in Chrome and
   Safari against the five S1 done-when checks in the main spec:
   create a project and three shots and frame them differently; any strip
   item opens the same canvas element in one click; write target "This shot"
   versus "Set" behaves correctly; reload restores the document and twenty
   undo/redo steps round-trip; export, delete, import yields an equal
   project apart from id, blob keys and timestamps.
4. Merge PR #3 to `main` once CI is green and the preview checks pass in
   both browsers.

## Roadmap decision log

| # | Decision | Made |
|---|---|---|
| R1 | No calendar dates. Milestones are sized S/M/L and gated on predecessors, not scheduled. | 2026-09-25 |
| R2 | Timeline is per shot: time runs 0 to the shot's duration, and the timeline sits under the viewport on the shot page. | 2026-09-25 |
| R3 | In the flat editor, editing keys changes the selected take in place. A "New take" button duplicates it. A VR recording always makes a new take. | 2026-09-25 |
| R4 | Dense VR tracks live in the IndexedDB blob store. Take metadata stays in the project document, to keep the 500 ms whole-document autosave small. | 2026-09-25 |
| R5 | The animatic player is its own route, `/p/:projectId/scene/:sceneId/play`, playing each shot's selected take back to back. | 2026-09-25 |
| R6 | Storyboard export is a PDF plus a zip of PNG frames. No share link. | 2026-09-25 |
| R7 | The AI bridge is package-first: export a zip with a grey guide clip, first frame, camera path and prompt, for manual upload. No server, consistent with D6 in the main spec. | 2026-09-25 |
| R8 | The AI package format is provider-neutral. Seedance is the first named target, since both predecessor repos had Seedance packaging. | 2026-09-25 |
| R9 | Portfolio release ships a public demo with a seeded sample project in a separate local-only storage namespace, no sign-in, plus a case study drafted for vyhouski.com. Both stay unlisted until Nick says go. | 2026-09-25 |
| R10 | The VR specs are written in full now. Anything the Quest spike measures (fps budget, viewfinder resolution, smoothing level, monitor placement, voice detector) is a default to confirm, listed in that spec's "Spike gate" section. | 2026-09-25 |

**Confirmed after the cross-spec review, 2026-09-25:**

| # | Decision | Spec |
|---|---|---|
| R11 | New shots default to the 21:9 format. | camera and motion, question 2 |
| R12 | The v1 to v2 migration keeps each S1 shot's picture: 35 mm becomes 22.5 mm with the same framing. | camera and motion, question 1 |
| R13 | Keys and exports run on a 24 fps frame grid. | camera and motion, question 3 |
| R14 | M4 ships all four slices and is sized L. | outputs, question 10 |
| R15 | A take recorded in VR that runs past its shot extends the shot automatically. The flat editor keeps "Fit shot to take". | VR operate, question 4 |
| R16 | M10 keeps its gate on M9: the demo ships with the AI bridge. | portfolio release, question 1 |
| R17 | Rendered clips stay out of the project zip by default, with a checkbox to include them. | outputs, question 7 |

**Camera model, dated 2026-09-25:** a shot holds a list of takes and one
selected take (VR operator spec section 5.1). Each take carries a body,
format, lens, rig and a camera track made of keyframes. Flat editing in the
suite produces sparse keys; a VR recording produces dense keys; one function,
`cameraAt(take, t)`, samples either. S1 data migrates to one take holding one
key. This replaces two things at once: the VR spec's `CameraMove` union
(`framings` versus `path`) and the main spec's `Shot.camera` keyframe arrays
become the single take model above.

**Lens, dated 2026-09-25:** FOV is computed from body, format and lens using
the formula in the VR operator spec section 5.3. S1 ported Film Planner's
`lensToVFovDeg`, which assumes a full-frame 24 mm sensor height and ignores
format; M3 replaces that function with the body-and-format-aware formula.

**Milestone order, dated 2026-09-25:** after S1 closes, the order is M2 Props,
M3 Camera and motion (which merges VR operator spec piece F with the main
spec's S3), M4 Outputs (S4), M5 VR Scout (V1), M6 VR Operate handheld (V2),
M7 VR Rigs (V3), M8 VR Director's calls (V4), M9 AI video bridge, M10
Portfolio release. The Quest headset spike is a parallel track that has to
finish before M5.

## Long-term risks

| Risk | Notes |
|---|---|
| Feel in VR (jitter, legibility, frame rate) is unproven until the headset spike runs | The spike's five questions gate M5; a no-go reopens the platform choice (VR operator spec section 2, the Unity fallback) before any V-piece build starts, and each VR spec's Spike gate defaults get confirmed or revised |
| Voice support in the Quest browser is unconfirmed | The spike's free probe on `SpeechRecognition` and `getUserMedia` decides which detector M8 uses; the controller trigger is the fallback throughout |
| Recorded takes bloat the project document | A 10 s recorded take is about 100 KB as JSON, and the whole document is re-saved 500 ms after every edit; R4 keeps recorded samples in the IndexedDB blob store as a binary file of about 29 KB per 10 s at 90 Hz |
| `@react-three/xr` API drift across the four VR milestones | Pinned library versions and a thin XR shell, per the VR operator spec's risk table |
| The camera model change in M3 is a breaking migration | Every S1 shot's single keyframe pair has to migrate cleanly to one take with one key before M3 can build on it |
| AI provider packaging formats are a moving target | R8 keeps the package provider-neutral so a change at Seedance does not force a rewrite of the bridge |
| Scope creep from the VR track's game-like framing | VR operator spec section 9 rules out scoring or progression unless a future spec says otherwise |

## Long-term out of scope

From the main spec: full three-axis rotation and non-uniform prop scale,
lights, AI-generated props, a prop library shared across projects, importing
props or scenes from Film Planner, sequences, collaboration, accounts, any
server.

From the VR operator spec: voice-directed blocking, multi-user VR sessions,
hand tracking, zoom lenses within a single take, in-headset video capture, a
native VR client, and scoring or progression in the VR track.

## Keeping this roadmap current

Nick owns this file. It gets updated when a milestone gate is crossed (a
milestone moves from planned to in progress, or closes), when a roadmap
decision (R1-R10 or the camera-model and order decisions above) changes, or
when a new spec file under `docs/superpowers/specs/` supersedes one of the
planned names in the milestone table above. Each of the nine linked spec
files is the source of truth for its own milestone's internals; this file
only tracks gates, order and the cross-cutting decisions that span more than
one milestone. When a spec's own decisions conflict with something written
here, the spec wins and this file gets corrected to match.

