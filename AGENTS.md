# Agent instructions - scene-builder-3d

Persistent context for Claude Code sessions in this repo.

## Project overview

**scene-builder-3d** is a shot-first 3D previs tool for the browser: build a set
from props, place characters, frame shots with a camera, play the scene back.
Status: exploration. S0 (scaffold) and S1 (walking skeleton) are built and in
review on PR #3. Read `README.md` for the decisions made so far and the two
predecessor repos.

Repo: `github.com/weeeha/scene-builder-3d` (private). Local path on the Mac:
`/Users/nickv/ClaudeCode Projects/scene-builder-3d`. The folder, the GitHub repo
and the package share one name on purpose.

## Stack

Decided in `docs/superpowers/specs/2026-09-18-scene-builder-3d-design.md` and
built in S0 and S1: Vite 7, React 19, TypeScript 5, react-three-fiber 9, drei
10, three 0.186, Zustand 5 with Immer, React Router 8 (library mode), Tailwind
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
