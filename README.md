# scene-builder-3d

> **Status:** exploration · **Stage:** design, no app code yet · **Live URL:** none yet
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

## Next

The design spec lands in `docs/superpowers/specs/`. Nothing gets built before it is approved.

## Working rules

- Branch per task, PR per change. The seed commit is the only direct commit to `main`.
- Specs before builds.
