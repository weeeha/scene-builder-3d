# Agent instructions - scene-builder-3d

Persistent context for Claude Code sessions in this repo.

## Project overview

**scene-builder-3d** is a shot-first 3D previs tool for the browser: build a set
from props, place characters, frame shots with a camera, play the scene back.
Status: exploration, design stage. There is no app code yet. Read `README.md`
for the decisions made so far and the two predecessor repos.

Repo: `github.com/weeeha/scene-builder-3d` (private). Local path on the Mac:
`/Users/nickv/ClaudeCode Projects/scene-builder-3d`. The folder, the GitHub repo
and the package share one name on purpose.

## Stack

Not decided here. The design spec in `docs/superpowers/specs/` decides it. Both
predecessors use Next.js 16 + React 19 + react-three-fiber + Zustand, so that is
the default to beat, not a given.

## Conventions

- Branch per task, PR per change. Never push to `main`.
- Specs before builds: nothing is built without an approved spec in `docs/superpowers/specs/`.
- Port, do not re-invent. When a piece exists in a predecessor repo, copy it from
  the real source with its tests, then adapt. The predecessors are listed in `README.md`.
- Commits use the GitHub noreply address `1083934+weeeha@users.noreply.github.com`.
  The Gmail address is rejected on push (GH007).
- Everything published starts unlisted or preview, labeled `exploration`.

## Finishing a task

Verify the page renders and the interaction works in Chrome and Safari before
calling it done. A green build proves neither. Then give a link: a preview URL
or the local URL.
