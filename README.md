# scene-builder-3d

> **Status:** exploration · **Stage:** S1 walking skeleton in progress ([PR #3](https://github.com/weeeha/scene-builder-3d/pull/3)) · **Preview:** [Vercel preview](https://scene-builder-3d-g1fjvyg2k-nick-vyhouskis-projects.vercel.app) (Vercel login required, shows the S0 placeholder shell)
> Everything published from this repo starts unlisted and is labeled `exploration`.

A shot-first 3D previs tool for the browser. Build a set from props, place
characters, frame each shot with a camera, and watch the scene play back before
anything is filmed or generated. Reference product: [Previs Pro](https://www.previspro.com).

## Where it comes from

Two earlier codebases feed this one. Neither is the home for this work.

| Repo | Role | What gets ported |
| --- | --- | --- |
| [weeeha/Scene-Builder-v2](https://github.com/weeeha/Scene-Builder-v2) | Prototype, idle since 2026-07-27 | Editor ideas: 2D plan mode, camera move presets, framing overlays, coverage view, auto-key, timeline, pose spans, animatic |
| [weeeha/Film-Planner-](https://github.com/weeeha/Film-Planner-) | Film and world tool, stays separate | The tested stage domain layer in `film-planner/src/stage`: types, resolve order, state hash, poses, lens math, deterministic clip render |

## Decisions so far (2026-09-18)

1. Film, set and shot are all covered. The shot comes first.
2. This repo is the home. Film Planner stays the film and world tool. Scene Builder v2 stays the archived prototype.
3. Two pages, a scene page and a shot page, with a shot strip on both for one-click moves between shots.
4. The set is editable on both pages. The shot page has a "writes to: Set / This shot" switch.
5. First build: a walking skeleton (scene page, shot page, stage, shot strip), then props.

Sketches, sitemap and concept map: [FigJam board](https://www.figma.com/board/Vv6Q75mVAOujsE9qsJ0nrM/Job-Smith?node-id=0-1).

## Where it stands (2026-09-24)

| Piece | State | Where |
| --- | --- | --- |
| Design spec | Merged ([PR #1](https://github.com/weeeha/scene-builder-3d/pull/1)) | `docs/superpowers/specs/2026-09-18-scene-builder-3d-design.md` |
| S0 and S1 plan, 22 tasks | Merged ([PR #1](https://github.com/weeeha/scene-builder-3d/pull/1)) | `docs/superpowers/plans/2026-09-18-s0-s1-walking-skeleton.md` |
| S0 scaffold; S1 domain, storage, state, 3D canvas | Tasks 1 to 16 done, CI green | branch `feat/s0-s1-walking-skeleton`, draft [PR #3](https://github.com/weeeha/scene-builder-3d/pull/3) |
| S1 selection, framing, pages, shot strip, thumbnails, shortcuts | Tasks 17 to 22 in progress | same branch |
| VR operator mode | Spec merged, camera feel spike built ([PR #2](https://github.com/weeeha/scene-builder-3d/pull/2)) | `docs/superpowers/specs/2026-09-18-vr-operator-design.md`, `spikes/vr-camera-feel/` |
| VR headset run | Waiting on a Quest session | checklist in `spikes/vr-camera-feel/README.md` |

## Next

1. Finish S1 on PR #3 and check the preview in Chrome and Safari.
2. Run the spike on a Quest and record the results in section 4.10 of the VR spec.
3. S2: props, per the design spec.

## Working rules

- Branch per task, PR per change. The seed commit is the only direct commit to `main`.
- Specs before builds.
