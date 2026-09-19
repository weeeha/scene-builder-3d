# THROWAWAY: VR camera feel spike

> **Status:** exploration. Throwaway code. This branch is never merged.
> Spec: `docs/superpowers/specs/2026-09-18-vr-operator-design.md`, section 4.

A WebXR page that answers five questions about holding a virtual film camera in a Quest:
frame rate, steadiness, viewfinder legibility, takes stored as poses, and the dev loop.
The answers go into section 4.10 of the spec. The code stays here.

## Provenance

`src/stage/` is copied as-is from `weeeha/Film-Planner-` at commit `58987e2`
(`film-planner/src/stage/`). Do not edit those files here.

The camera uses `src/camera/fov.ts`, which derives the field of view from sensor, format and lens.
"85 mm" here means a real 85 mm on full frame, cropped to 21:9.

## Run

    pnpm install
    pnpm test
    pnpm dev:http     # http://localhost:5173 on this Mac (flat page, emulator in Chrome)
    pnpm dev          # https on the LAN, for the headset

Flat page: `/`. Replay page: `/#/replay`.

## Getting it onto the headset

WebXR needs a secure context, and on the Quest `localhost` means the Quest itself.

1. **Wi-Fi, HTTPS (first choice).** Mac and Quest on the same network. Run `pnpm dev`. Vite prints a
   `Network: https://<mac-ip>:5173/` line. Open that URL in the Quest browser. It warns about the
   self-signed certificate: choose Advanced, then Proceed. Takes you record are saved into `takes/` on the Mac.
2. **USB, adb (fallback).** Quest in developer mode, cable connected, then:

       adb devices
       adb reverse tcp:5173 tcp:5173
       pnpm dev:http

   Open `http://localhost:5173` in the Quest browser. The port is forwarded to the Mac, and localhost counts as secure.
3. **Vercel preview (only after Nick says yes).** A static build as its own Vercel project, preview only,
   labeled exploration. No dev server runs there, so takes are not saved: use "Download last take" on the
   flat page and load the file on the replay page.

## Controls in the headset

| Input | Action |
| --- | --- |
| Right grip | Grab the camera when the hand is within 0.25 m of it. Release and it floats in place. |
| Right trigger | Start and stop recording. |
| Right stick left / right | Previous / next lens: 18, 24, 35, 50, 85, 135 mm. |
| Right stick up / down | Viewfinder size up / down: 640x274, 960x412, 1280x548. |
| A | Replay the last take. |
| B | Run the 10 s jitter test. |
| Left trigger | Teleport: aim the arc, release to jump. |
| Left stick left / right | Snap turn, 45 degrees. |
| Left hand | Holds the second monitor, with the debug panel above it. |
| Left grip | Mic probe: asks for the microphone while the session runs. |
| X | Cycle smoothing: off, light, medium, heavy. |
| Y | Show or hide the debug panel. |

Flat-page keys: `R` record or stop, `P` replay, `[` `]` lens, `S` smoothing, `-` `=` viewfinder size,
`J` jitter test, `D` panel, `M` mic probe.

## Headset checklist

Work top to bottom. It takes about 20 minutes. Write the results into the table at the end.

If the panel says `handheld pass-through`, the smoothing levels do nothing yet. Write the body of
`src/camera/handheld.ts` first (about ten lines, trade-offs are in the file), or ask for the reference version.

**Question 5, dev loop (do this first, it is how you get in).** Which loop got the page onto the headset:
Wi-Fi HTTPS, adb, or Vercel? Change a colour in `src/spike-scene.ts`, save, reload the page in the headset:
how many seconds from saving to seeing it?

**Question 1, frame rate.** Enter VR. Line 2 of the panel shows `target NN Hz`. Grab the camera, pull the right
trigger, operate for 30 seconds (the strip under the picture counts), pull the trigger again. Read line 1:
`take avg` and `worst`. It passes when `take avg` is within 1 of the target and `worst` stays under
27.8 ms at 72 Hz, or 22.2 ms at 90 Hz. Do it once per viewfinder size (right stick up and down).
Write down the largest size that passes.

**Question 2, steadiness.** Flick the lens to 85 mm. Frame the doll's head and shoulders. For each smoothing
level (X cycles them): press B, hold as still as you can until the countdown ends, write down the jitter line.
Then judge the picture itself: at which level does an 85 mm hold read as handheld footage instead of an
earthquake? Repeat once at 50 mm. It passes when at least one level is usable at 85 mm.

**Question 3, legibility.** Hold the camera at chest height. On the monitor on the camera body: can you judge
headroom and see what sits at the frame edges? Same question for the monitor in your left hand.
Which one would you keep? Does a larger viewfinder size change the answer?

**Question 4, takes as poses.** Record a 10 second take with a clear move: walk in on the doll, then pan to the
column. Take the headset off. On the Mac open `/#/replay`, click the take. Is it the move you made, from start
to end, on the same lens?

**Probe, speech and microphone.** Read the last two panel lines: which speech APIs exist? In VR press the LEFT
grip: does a permission prompt appear, does the session survive it, and what does the `mic:` line say afterwards?

| # | Question | Result | Notes |
| --- | --- | --- | --- |
| 1 | Frame rate: largest passing viewfinder size, avg fps, worst ms | | |
| 2 | Steadiness: usable smoothing level at 85 mm, its jitter numbers | | |
| 3 | Legibility: monitor you would keep, and its size | | |
| 4 | Takes as poses: replay matches the move (yes / no) | | |
| 5 | Dev loop: which loop, seconds per iteration | | |
| P | Probe: speech APIs, mic inside the session | | |
