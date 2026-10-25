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

<!-- BEGIN:generation-family -->
## Sibling repos

This repo is one of seven related repos for AI-generated film work: images, 3D models, 3D
previs, cloud video, local video, audio, and continuity repair. They stay separate on purpose
(different stacks, no shared code). The same block sits in all seven AGENTS.md files between
the `generation-family` markers; change it in all seven or in none.

| Repo | Local folder (always quote) | What it does | Stack |
|---|---|---|---|
| Film Design System | `~/ClaudeCode Projects/Image Generation Pipeline ` (trailing space) | Canon of characters, props and settings with curated reference images; image generation against it | Next.js, SQLite, Gemini |
| 3D Models | `~/ClaudeCode Projects/3D Models` | Text-to-3D through Meshy, a three.js viewer and gallery, Blender and procedural models | Next.js, react-three-fiber, Meshy API |
| Scene Builder 3D | `~/ClaudeCode Projects/scene-builder-3d` | Shot-first 3D previs: build a set, place characters, frame shots with a camera, play the scene back | Vite, React, three.js, browser-only |
| Video Generation Pipeline | `~/ClaudeCode Projects/Video Generation Pileline` ("Pileline" is the real folder name) | Seedance and Runway clients; reference packs in `library/` | Python CLI |
| Local Video Pipeline | `~/ClaudeCode Projects/Local-Video-Pipeline` | Local video generation on the Art PC (RTX 3090): Wan 2.2 and MiniMax H3 in ComfyUI, previz command on the Mac | PowerShell, Python CLI |
| Audio Generation Pipeline | `~/ClaudeCode Projects/Audio-Generation-Pipeline` | Speech (Qwen3-TTS, Higgs Audio v2), voice cloning, sound effects, on the Mac Studio and the Art PC | Python, shell, PowerShell |
| Continuity Lab | `~/ClaudeCode Projects/Video Lab` | Find and repair inconsistencies between generated video shots | Next.js, SQLite, ffmpeg |

GitHub, all under `weeeha/`: `Image-Generation-Pipeline-` (trailing dash), `scene-builder-3d`,
`Video-Generation-Pipeline` and `Audio-Generation-Pipeline` are public; `3d-models-playground`
(the 3D Models repo), `Video-Lab` and `Local-Video-Pipeline` are private.

### How they connect

No code or data path links them yet; files move by hand. Known, planned and wanted links:

- **Image → video (planned).** The Film Design System spec names Seedance reference-to-video
  as a later consumer of its canon. The video repo's `library/<category>/<name>/` packs
  (`refs/` + `card.md`) hold the same kind of thing as folders, so an export from the canon
  would land there.
- **3D Models → Scene Builder 3D and video (wanted).** 3D Models generates GLB files through
  Meshy, and Scene Builder 3D stores props as GLB. Nick wants generated models usable as
  previs props and as Seedance references; no step connects them yet. 3D Models also holds
  3D-printing work (toys, sculpture), which is unrelated to film.
- **Scene Builder 3D → video (planned).** Its roadmap milestone M9 exports a shot as a
  provider-neutral zip (grey guide clip, first frame, camera path, prompt) for manual upload,
  with Seedance as the first target. Its idle prototype, `weeeha/Scene-Builder-v2` (folder
  `Scene Builder V2 (3d editor)`), already packaged shots for Seedance.
- **Local video ↔ cloud video.** Local Video Pipeline is the local counterpart of Video
  Generation Pipeline: image-to-video from a first frame and a prompt, rendered on the Art PC
  GPU instead of through Seedance or Runway. Its `previz` command drops drafts in
  `~/Movies/Previz`; nothing moves them into the video repo or the Continuity Lab yet. MiniMax
  H3 drafts are for private previz only, so a distributed shot is made fresh with Wan or a
  cloud service.
- **Video → Continuity Lab.** The Lab imports existing clips into a project folder. Its own
  generation backend (`seedance-fal`, via fal.ai) is planned for its plan 5 and is separate
  from the BytePlus client in the video repo.
- **Audio → video (open).** Seedance 2.5 accepts audio references and the audio repo makes
  voices and effects, but no step connects them. The audio repo also serves OpenClaw's
  Speaker agent, which is unrelated to film work.

### Working across repos

- Read the sibling's own AGENTS.md (or README) before changing it. Spend rules differ: image,
  3D and cloud video generations cost money and need Nick's go; audio and local video run on
  the Art PC GPU and can pause llama-server while they run.
- Don't copy code between repos. When a shared format appears (a canon export, say),
  document it in both repos it connects and update this block.
- Branch per task in each repo; never push to `main`.
<!-- END:generation-family -->
