# VR Director's calls: design spec (M8)

> **Status:** exploration · **Stage:** draft for review, written 2026-09-25
> **Milestone:** M8 in the [roadmap](../../roadmap.md), size S, gated on M7 (VR Rigs)
> **Builds approved by this document:** none until Nick approves it. Anything published from this work starts unlisted and is labeled `exploration`.
> **Related:** [main spec](2026-09-18-scene-builder-3d-design.md) (architecture, storage, error handling, testing style) · [VR operator spec](2026-09-18-vr-operator-design.md) (piece V4, sections 5.5, 6, 7, 9, 11) · [camera and motion spec](2026-09-25-camera-and-motion-design.md) (M3: `Take`, `cameraAt`, `playbackStore`, `commitRecordedTake`) · [roadmap](../../roadmap.md) (M5 to M8 ownership map) · spike findings: `spikes/vr-camera-feel/src/xr/probe.ts`, `spikes/vr-camera-feel/README.md`

## TL;DR

M8 adds "action" and "cut" on top of the M6 recorder: a small state machine
gates two events, one from the controller trigger and one from voice, so
either source starts and stops the same recording. The trigger is the
baseline that always works. Voice is a second, switchable source with its
own permission flow and a keyword detector still to be chosen, because the
Quest spike never ran on a headset and its speech probe answered nothing.
This spec treats every claim about Quest Browser speech support as unverified
and writes it into a Spike gate instead of the body of the design. Slate,
take numbering, blocking playback from `t = 0`, pre-roll, audio cues and
misfire handling are all designed against M3's contracts (`Take.number`,
`cameraAt`, `playbackStore`) and M6's recorder, with no new document fields:
a take produced this way is exactly the `Recording` M6 already defines,
tagged with how it started.

## Problem

M6 gives the operator a trigger to start and stop a recording. Calling
"action" and "cut" instead is closer to how a set actually runs, and it frees
the operator's hands to hold the camera through the whole take instead of
reaching for a trigger at both ends. The VR operator spec named this in
section 2 (decision 1) and section 5.5 laid out the shape: one clock, two
events, gated by state, voice as a second source that can be switched off.
What is missing is the actual state machine, how a keyword gets detected on
a Quest, the permission flow, what plays during the take, and what happens
when a call is heard at the wrong time or not heard at all.

## Decisions

| # | Question | Choice | Why |
|---|---|---|---|
| D1 | Event shape | Two events, `action` and `cut`, from a `CallSource` of `"trigger"` or `"voice"`. Both sources feed one dispatcher. | VR spec 5.5: "the controller trigger and the voice detector emit the same two events." |
| D2 | State machine states | `idle`, `armed`, `rolling`, `saving` (VR spec 5.5's four states, named). | Matches the spec's own vocabulary; four states cover every gate rule below with no extra state needed. |
| D3 | Keyword detector | Default to the browser's `SpeechRecognition` / `webkitSpeechRecognition` API when present, with an on-device keyword model reserved as a fallback design. Confirm at milestone start (Spike gate SG1). | The spike detected which constructors exist in a desktop browser only; it never ran in the headset, so Quest Browser support is unconfirmed. See Spike gate. |
| D4 | Keyword set | Two words, `"action"` and `"cut"`, matched by substring on the recognizer's final transcript, case-insensitive. No wake word. | Fewer false triggers than continuous listening for arbitrary phrases; matches the two-verb VR spec vocabulary exactly. |
| D5 | Mic permission | Asked once, from a settings toggle, not automatically on session start. Denial or "not now" falls back to trigger-only with a panel note, matching VR spec 7 ("Mic permission denied: trigger only, with a note on the panel"). | The M6 spike already probes the mic optimistically; a previsualisation tool should not ask for a mic before the operator has chosen to use voice. |
| D6 | Take numbering by voice | Voice never assigns a number itself. `commitRecordedTake` still assigns `Take.number` (M3 6.2: "one above the highest ever used in the shot"). A spoken slate ("Take four, action") is read back as audio and text for confirmation; the read number is not what gets saved if it disagrees with the store's count. | M3 owns `Take.number` and hands out numbers monotonically; a voice slate that could disagree with the store would let the two drift. |
| D7 | Blocking during a take | The M3 object tracks and pose spans for the active shot play back from `t = 0` on `playbackStore`, the same clock the M3 spec already drives from `useFrame` (6.4). "Action" is `play({ from: 0, loop: false })`; the camera operator moves freely relative to the animating set. | VR spec 5.5 says "action" is `clock.play()` from 0; M3 6.4 already describes exactly this call for the VR track. Reusing it means M8 adds no new clock. |
| D8 | Pre-roll | A 3-second countdown between the call and the first recorded sample, audible as three descending beeps plus a visible ring on the viewfinder monitor. Default; confirm at milestone start (Reserved for Nick, since it is a five-line constant plus a beep asset choice). | Real sets slate before rolling; a countdown lets the operator settle the frame and warns nearby collaborators (spoken or trigger-driven) that recording is about to start. |
| D9 | Voice off by default | The settings toggle for voice starts off. Trigger works from the first session with no setup. | Matches D5's "asked, not automatic" mic flow, and VR spec 7's "trigger always works" fallback rule. |
| D10 | Misfire handling | State gating is the primary defense (armed only listens for "action", rolling only for "cut"); a heard word that is not a real match against the confidence threshold is dropped silently, with no audio cue and no console noise beyond a debug log. | VR spec 7: "Voice misfire: State gating (5.5). The trigger always works." A silent drop keeps a misheard "action" from interrupting an unrelated conversation on set. |

## Alternatives considered

- **A continuous open-listening detector with an arbitrary phrase set.** Rejected: harder to gate against misfires, and nothing in the VR spec asks for more than two words.
- **An on-device wasm keyword model (e.g. openWakeWord-style) as the only detector, skipping the browser API.** Rejected as the default: it needs a bundled model file and a WebAssembly build step that the spike never touched, so it is a heavier bet than trying the browser API first. Kept as the documented fallback in the Spike gate.
- **Voice replaces the trigger** rather than running alongside it. Rejected: VR spec 7 requires the trigger to always work, and D9 needs a safe default with zero setup.
- **Taking the take number from the spoken slate ("take four") as the source of truth.** Rejected: `Take.number` is owned by M3's `commitRecordedTake` and assigned from the store's own count; letting speech assign it risks a number that disagrees with what actually gets saved (D6).
- **No pre-roll, recording starts on the word.** Rejected as default: real operators expect a beat between the call and rolling to settle the frame; kept adjustable in Reserved for Nick.

## 1. The state machine

### 1.1 States

```ts
// src/xr/director/state-machine.ts
export type CallState = "idle" | "armed" | "rolling" | "saving";
```

| State | Meaning | Entered from | Camera |
|---|---|---|---|
| `idle` | No shot camera grabbed, or grabbed but director's calls not armed. | Session start, or `cut` completing while the camera is released. | Free to hand off, no listening. |
| `armed` | Camera is grabbed and ready. Waiting for "action" (voice or trigger). | `idle` when the camera is grabbed; `saving` once the take is stored. | Grabbed, playback stopped, clock at 0. |
| `rolling` | Pre-roll or recording in progress. Waiting for "cut". | `armed`, on an `action` event. | Grabbed, playback playing from 0, recorder sampling once pre-roll ends. |
| `saving` | `commitRecordedTake` in flight. | `rolling`, on a `cut` event. | Grabbed, playback paused, recorder stopped. |

### 1.2 Events and the gate

```ts
export type CallSource = "trigger" | "voice";
export type CallEvent = { kind: "action" | "cut"; source: CallSource; atSec: number };

export type CallGate = (state: CallState, event: CallEvent) => boolean;
```

| From state | Event | Gate | Result |
|---|---|---|---|
| `idle` | `action` | Refused. No camera grabbed. | No-op; VR spec 7's "trigger always works" is about a grabbed camera, not an ungrabbed one. |
| `armed` | `action` (trigger or voice) | Accepted. | `armed` → `rolling`. Pre-roll starts (2.4). |
| `armed` | `cut` | Refused, not rolling. | No-op. |
| `rolling` (pre-roll) | `action` | Refused, already rolling. | No-op. A second "action" during the countdown does not restart it. |
| `rolling` (pre-roll or recording) | `cut` (trigger or voice) | Accepted. | `rolling` → `saving`. Recording (if started) stops; `commitRecordedTake` runs (2.5). A `cut` during pre-roll, before the first sample, discards the pre-roll and returns to `armed` with nothing saved (2.6). |
| `saving` | `action` or `cut` | Refused, save in flight. | No-op. The trigger and voice detector are disabled while `saving`; see 5. |
| any | camera released (grip let go) | Forced transition to `idle`. `rolling` or `saving` in progress is treated as `cut` first (VR spec 7: "session ends mid-take... treated as cut, the take is saved"). | Matches M6's release handling; V4 adds no new release rule, only voice. |

Exactly one function performs the gate check and the transition, so the
trigger handler and the voice handler call the same code and can never
disagree about what state the machine is in:

```ts
export function dispatchCall(
  machine: CallMachineState,
  event: CallEvent,
): CallMachineState;
```

`CallMachineState` holds `state: CallState` plus enough to drive the UI:
`armedAt: number | null`, `rollingAt: number | null`, `preRollEndsAt: number | null`.
The function is pure, unit-tested with no React and no XR, per this repo's
domain-testing convention (M3 section 4, main spec Testing).

## 2. Trigger and voice as two sources of the same events

### 2.1 Trigger source

`src/xr/director/TriggerCalls.tsx` reads the right controller trigger the
same way M6's recorder does (grab detection, trigger press) but emits
`dispatchCall(machine, { kind: "action", source: "trigger", atSec })` on
press while `armed`, and `{ kind: "cut", source: "trigger" }` on press while
`rolling`, instead of M6's toggle-on-every-press. The trigger is mounted
whenever the camera is grabbed, voice on or off, so it is never the piece
that can be disabled by a permission problem.

### 2.2 Voice source

`src/xr/director/VoiceCalls.tsx` wraps whichever detector D3 resolves to
behind one interface, so the state machine and the rest of the shell never
know which detector is running:

```ts
export type KeywordDetector = {
  start(): void;
  stop(): void;
  onHeard(cb: (word: "action" | "cut", confidence: number) => void): () => void;
  readonly supported: boolean;
};
```

`VoiceCalls` listens only while the settings toggle is on, the mic
permission is granted, and the machine is in `armed` (for "action") or
`rolling` (for "cut"); it calls `detector.stop()` at every other transition,
so the recognizer is never running while the browser tab is not expecting a
match. A heard word below the confidence threshold (2.4 in D3's fallback
detector, or the browser API's own low-confidence result when it reports
one) is dropped, matching D10.

### 2.3 Two detector shapes behind the interface

Both are designs against the same `KeywordDetector` interface; which one
ships is Spike gate SG1.

**Browser `SpeechRecognition` adapter** (default candidate). Continuous
recognition (`continuous = true`, `interimResults = false`), restarted on
every `onend` while the detector is meant to be listening (the API stops
itself after a pause on some browsers). `onresult`'s final transcript is
lower-cased and checked for `"action"` or `"cut"` as a substring; the
browser's own `result.confidence` is passed through when present, else `1`.
`supported` is `"SpeechRecognition" in window || "webkitSpeechRecognition" in window`,
the same check as the spike's `detectSpeechApis` (`spikes/vr-camera-feel/src/xr/probe.ts`).

**On-device keyword model adapter** (fallback design, not built unless SG1
says the browser API fails). A small wasm keyword-spotting model listening
for exactly two keywords, run on a rolling audio buffer from
`getUserMedia`. No specific model is chosen here: picking one is out of
scope for this spec and is listed under Reserved for Nick if SG1 sends the
milestone this way, because a model choice is a real trade-off (bundle size
against accuracy) worth five to ten lines of comparison, not a default to
guess at.

### 2.4 Pre-roll

On `armed` → `rolling`, `preRollEndsAt = now + 3` (D8's default). The
viewfinder shows a ring counting down from 3 to 0 and the audio cue plays
three descending beeps, one per second (5). `playbackStore.play({ from: 0,
loop: false })` and the recorder's sample loop both start only once
`preRollEndsAt` passes, so the blocking and the recorded track share the
same `t = 0`. A `cut` heard during the countdown (2.6) cancels the pre-roll
before any sample is taken.

### 2.5 "Cut" and the save path

`cut` while actually recording calls the same path M6 already defines:
`playbackStore.pause()`, the recorder's `Recording` (M3 6.2's type:
`samples`, `sampleRateHz`, `bodyId`, `formatId`, `lensMm`, `rig`) is handed
to `commitRecordedTake(shotId, rec)`. V4 adds one field to how the operator
sees the result, not to the stored type: the slate readback (2.6) states the
`Take.number` `commitRecordedTake` returns, so "Take four" is not asserted
until the store has actually assigned it.

### 2.6 Slate and take numbering by voice

The slate is spoken feedback, not a new input channel. On `armed`, entering
that state (camera grabbed, ready), the panel and an audio cue state what
take number *would* be assigned next: `nextTakeNumber = highest existing
number in this shot's takes, plus one` (mirrors M3 6.2's `addTake` rule
without writing anything). On a successful `cut` → `saving` → done, the
audio cue and the panel state the number `commitRecordedTake` actually
returned. If another take was added elsewhere (the flat editor, in another
session sharing the project) between arming and cutting, the spoken and
committed numbers can differ; the panel always shows the committed number
last, and it is the one written to the document. No voice command changes
`Take.number` directly; there is no `setTakeNumber` action, and this spec
adds none.

A `cut` heard during the pre-roll countdown (before the first sample) is
treated as an abort, not a take: the machine returns to `armed`, the
countdown ring and cue stop, and no `Recording` object is ever built, so
`commitRecordedTake` is never called and no take number is spent.

## 3. Mic permission flow

1. The voice toggle lives in the VR settings panel (mounted from M5's
   viewfinder monitor shell), default off (D9).
2. Turning it on calls `navigator.mediaDevices.getUserMedia({ audio: true })`
   once, the same call the spike's `runMicProbe` makes
   (`spikes/vr-camera-feel/src/xr/probe.ts`), tagged in the panel with
   whether the request happened in or out of an XR session, since the spike
   found that worth recording separately.
3. **Granted.** The stream's tracks are stopped immediately (the detector
   opens its own stream when it starts listening); the toggle stays on, and
   `VoiceCalls` becomes active the next time the machine reaches `armed`.
4. **Denied, or dismissed without an answer.** The toggle reverts to off,
   the panel shows "Voice off: microphone permission denied" (browser
   `NotAllowedError`) or "Voice off: no answer" for a dismissal, and the
   session proceeds trigger-only. Matches VR spec 7's "Mic permission
   denied: trigger only, with a note on the panel."
5. Re-enabling later re-asks; permission is a per-page-load, per-browser
   decision the app does not try to remember (no localStorage flag), since a
   remembered "denied" would hide the real toggle state from a operator who
   changed the OS-level Quest microphone permission between sessions.

## 4. Playing the blocking during a take

The take's shot already carries `shot.tracks.objects` and `shot.tracks.poses`
(M3 3.4). "Action" starts `playbackStore.play({ from: 0, loop: false })`
(D7), the same call M3 6.4 documents for the VR track. `TrackApplier` (M3
7.6) is already mounted by the flat viewport's shared components and, per VR
spec item 2 in section 6 ("Scene rendering is a function of data... so
`xr/` can mount it"), the XR shell mounts the same `SceneContents` and
`TrackApplier` M5 already uses for Scout's read-only playback. V4 adds
nothing new here: it is the first piece to call `play` from a voice or
trigger event instead of from the flat transport, but the function it calls
is M3's.

While `rolling`, if `playbackStore.time` reaches `durationSec` before "cut"
is heard (a shot shorter than the operator's take): with `loop: false` (D7
always passes this), the clock stops at the end and blocking holds its last
pose, but the camera recorder keeps sampling past that point if the
operator has not called "cut" yet, exactly as M6 already allows a handheld
take to run longer than its shot (M3 7.5's "longer than shot" badge covers
the result once it lands as a take). V4 does not force "cut" at the shot's
end.

## 5. Audio feedback cues

One cue per event, played through the XR session's audio context so it is
audible in the headset:

| Event | Cue |
|---|---|
| Entering `armed` | A single short tone, plus the spoken slate number (2.6). |
| Pre-roll countdown | Three descending beeps, one per second, synced to the viewfinder ring (2.4). |
| First recorded sample (pre-roll ends) | A single rising tone, distinct from the countdown beeps, so "we are now rolling" is unambiguous even with eyes on the frame, not the ring. |
| `cut` accepted, recording in progress | A single short tone, lower than the "armed" tone. |
| `cut` accepted, still in pre-roll (abort) | A double short tone, distinct from every other cue, so an aborted pre-roll never sounds like a saved take. |
| Take saved (`commitRecordedTake` resolves) | The spoken slate number (2.6), read back. |
| Take failed to save | A low buzz, matching the panel's error text (7). |
| Voice misfire, dropped | No cue (D10). |

All cues are short (under 400 ms except the spoken numbers) so they never
mask "action" or "cut" being heard again immediately after.

## 6. Voice switched off

With the settings toggle off (default, D9) or the mic permission denied
(3.4): `VoiceCalls` never calls `detector.start()`, `TriggerCalls` is
unaffected, and the panel shows "Voice off" instead of a listening
indicator. Every state transition in section 1 still works from the
trigger alone. Turning voice off mid-session while `rolling` does not
interrupt the take; it takes effect from the next `armed` state, so a
"cut" already in flight through the recognizer is not silently dropped by
the toggle changing under it. Concretely: `VoiceCalls` reads the toggle
once per state entry, not on every recognizer callback.

## 7. Error handling

| Failure | Behaviour |
|---|---|
| `SpeechRecognition` constructor absent (`detector.supported` is false) | Voice toggle is disabled with the note "Voice: not supported in this browser." Trigger unaffected. |
| Mic permission denied or dismissed | 3.4: toggle reverts off, panel note, trigger-only. |
| Recognizer's `onerror` fires mid-session (e.g. `network`, `no-speech` timeout on some implementations) | `VoiceCalls` restarts the recognizer once; a second consecutive error within 5 s turns voice off for the rest of the session with the panel note "Voice: lost connection, switched off. Reconnect from Settings," and the operator keeps the trigger. |
| Heard word below the confidence threshold | Dropped silently (D10, section 2.3). Logged to console only, `[director-calls] dropped low-confidence match`. |
| "Action" or "cut" heard while the gate refuses it (wrong state) | No-op per the table in 1.2. No cue (misfires stay silent by design), matching VR spec 7. |
| `cut` heard during pre-roll | Treated as an abort (2.6), not a failure: double-tone cue, return to `armed`. |
| `commitRecordedTake` rejects (blob write fails, M3 error table) | Same as M6's failure path: the recording stays as "Unsaved take" with Retry and Download; the state machine returns to `armed` so the operator can try again without re-grabbing the camera. The low-buzz cue plays (5). |
| Camera released mid-`rolling` or mid-`saving` | Forced `cut` first (1.2), then `idle`. Matches VR spec 7's "session ends mid-take: treated as cut, the take is saved." |
| Controller tracking lost mid-take (VR spec 7) | Unchanged from M6/M7: hold the last good pose, a gap over 0.5 s ends the take. V4 adds no new handling; a lost-tracking "cut" is still a real `cut` event through the trigger path only, since a lost controller cannot also be heard. |
| Two "action" events in the same frame (trigger and voice both fire) | `dispatchCall` is called twice; the second call sees `state === "rolling"` already and is refused per the gate table. No double pre-roll. |
| Blocking track missing or empty for the active shot | `TrackApplier` already handles an empty `tracks.objects`/`tracks.poses` as "nothing to animate" (M3); a take still records normally with a static set. |
| Voice toggled on with no mic hardware present | `getUserMedia` rejects with `NotFoundError`; treated the same as denied (3.4), with the panel note "Voice off: no microphone found." |

## 8. Testing

Matches the main spec's testing style (domain unit tests first, in Node,
before any XR shell code) and the VR operator spec's "XR shell: the WebXR
emulator in desktop Chrome" rule (section 8).

**State machine unit tests** (`state-machine.test.ts`, pure, no React, no XR):

- Every row of the gate table in 1.2: from each state, each event from each
  source, asserting the resulting state and whether it was a no-op.
- A `cut` during pre-roll (before `preRollEndsAt`) returns to `armed`, not
  `saving`.
- A forced camera-release transition from `rolling` and from `saving` both
  land on `idle` after passing through a `cut`.
- `nextTakeNumber` (2.6) matches M3's `addTake` numbering rule against a
  fixture shot with gaps from prior deletes (mirrors M3's "take numbers
  never reused after a delete" test).
- Property test: for any sequence of up to 20 random `CallEvent`s from
  either source, the machine never reaches an undefined state and
  `rolling`'s recorder only ever runs between an accepted `action` (post
  pre-roll) and the next accepted `cut`.

**Fake detector.** `createFakeDetector(): KeywordDetector & { say(word) }` in
`src/xr/director/fake-detector.ts`, used by both unit and shell tests. It
implements the same interface as the two real detectors, so `VoiceCalls` is
tested without a browser speech API or a wasm model:

- `VoiceCalls` calls `dispatchCall` with `source: "voice"` when
  `fake.say("action")` fires while listening, and does nothing while not
  listening (toggle off, permission denied, or wrong state).
- Confidence below the fake detector's configured threshold is dropped
  (D10) and logged, not dispatched.
- Toggling voice off mid-`rolling` does not stop an in-progress take (6).

**XR shell tests**, WebXR emulator in desktop Chrome, per the VR spec's
established pattern:

- Grabbing the camera, then a trigger press, then another trigger press
  round-trips through `armed` → `rolling` → `saving` and produces exactly
  one `commitRecordedTake` call.
- With the fake detector wired to `VoiceCalls`, `fake.say("action")` then
  `fake.say("cut")` produces the same round trip with no trigger press.
- Releasing the camera during `rolling` triggers exactly one `commitRecordedTake`
  call (the forced-cut path), not zero and not two.
- The pre-roll ring and beep sequence advance on three simulated one-second
  ticks and the recorder's first sample lands after the third.

**Flat regression**, per the VR spec's "every VR PR" rule: flat pages
render in Chrome and Safari with `navigator.xr` absent, and none of
`src/xr/director/` is imported from any flat-editor path (a `grep`-style
lint check on the flat bundle's import graph, matching M5's dynamic-import
isolation for `xr/`).

**Headset checklist**, run by Nick, since voice and comfort cannot be
automated (VR spec section 8, "a headset checklist per V-piece"): the
trigger round trip; if SG1 lands on the browser API, the voice round trip
with "action" and "cut" spoken at a normal conversational volume and again
across the room; a misfire test, saying "action" while `idle` (no camera
grabbed) and confirming nothing happens; the mic permission prompt inside an
active XR session, confirming the session survives it (the same question
the spike's probe checklist asked and never got an answer to, README
"Probe, speech and microphone").

## Build slices

M8 is size S, built as two slices, each with its own implementation plan and
PR. Each slice ends with a Vercel preview link verified in Chrome and
Safari, per this repo's finishing rule. The gate is M7 closed, and SG1 to
SG3 answered before V4.2 starts (Spike gate).

### V4.1 Trigger-only director's calls (S)

The state machine (section 1), the trigger source (2.1), pre-roll (2.4),
blocking playback from `t = 0` (section 4), the slate readback against
`commitRecordedTake`'s actual number (2.6), and every audio and visual cue
except the ones gated on voice. No detector code yet; the voice toggle
exists in the panel but is disabled with "Voice: not available yet."

- **Done when:**
  1. Grab the shot camera, pull the trigger: pre-roll counts down 3, 2, 1
     with beeps and the ring, then recording starts and the shot's blocking
     plays from the top. Pulling the trigger again saves a take; the panel
     reads back the number `commitRecordedTake` returned.
  2. Pulling the trigger during the countdown a second time does nothing
     (gate table, 1.2).
  3. Pulling the trigger to "cut" during the countdown, before the first
     sample, returns to `armed` with no take saved and the double-tone cue.
  4. Releasing the camera mid-recording saves a take (forced cut) and
     returns to `idle`.
  5. The state machine's unit tests and property test (section 8) pass in
     CI with no XR shell mounted.
- **States covered:** idle with no camera grabbed, armed, rolling in
  pre-roll, rolling and recording, saving, forced cut on release, a shot
  whose blocking finishes before "cut" is heard.

### V4.2 Voice source (S)

Gated on the Spike gate (SG1 to SG3). The chosen `KeywordDetector` adapter
(2.3), the mic permission flow (section 3), `VoiceCalls` (2.2), the fake
detector for tests (section 8), voice on/off in the settings panel, and the
error-table rows specific to voice (section 7).

- **Done when:**
  1. Turning the voice toggle on asks for the microphone once; granting it
     enables listening the next time the camera is grabbed and `armed`.
  2. Saying "action" while armed starts the same pre-roll and recording as
     the trigger; saying "cut" while rolling saves the same shape of take.
  3. Saying "action" while `idle` (camera not grabbed) does nothing, no cue.
  4. Denying the mic permission reverts the toggle and shows the panel note;
     the trigger still works for the whole session.
  5. Two consecutive recognizer errors turn voice off with the panel note
     from the error table, and the trigger keeps working.
  6. The fake-detector shell tests (section 8) pass with no real microphone
     or headset.
- **States covered:** voice on and granted, voice on and denied, voice on
  with no microphone hardware, voice off, voice turned off mid-`rolling`,
  a misfire below the confidence threshold.

## Spike gate

R10 marks anything the Quest spike measures as a default to confirm here.
The spike's probe (`spikes/vr-camera-feel/src/xr/probe.ts`,
`detectSpeechApis` and `runMicProbe`) only checked which constructors exist
and whether `getUserMedia` resolves; section 4.10 of the VR operator spec
still reads `pending` on every row, voice and mic included, because the
headset run has not happened. Nothing below is asserted as fact; each row
names the default this spec ships with until the run answers it.

| # | Question | Default in this spec | What the headset run must confirm |
|---|---|---|---|
| SG1 | Does `SpeechRecognition` or `webkitSpeechRecognition` exist and produce results inside an immersive WebXR session in the Meta Quest Browser? | Yes, use the browser adapter (D3). No public, dated source confirms Quest Browser's speech recognition support as of 2026-09-25; this is the spike's job, not a citation. | Run the spike's probe in-session (README "Probe, speech and microphone") and read the `mic:` and speech-API lines after pulling the left grip. If `SpeechRecognition` is absent, or present but never fires a result in-session, fall back to the on-device keyword model design in 2.3 and reopen this spec's detector choice before M8 starts. |
| SG2 | Does requesting the microphone mid-session (3) show a prompt, and does the XR session survive it? | Assumed to work, matching how the spike's mic probe was designed to be tested from inside VR. | Same headset run, same probe. If the session drops or the prompt never appears, the mic permission flow in section 3 needs a pre-session request instead, and that is a spec change, not a workaround. |
| SG3 | Recognition accuracy for "action" and "cut" at a normal speaking distance and across a real room, with the Quest's built-in microphones. | Assumed usable at conversational volume within about 2 m, matching D4's plain substring match design. | The headset checklist's misfire and round-trip tests (section 8). If accuracy is poor, D4's confidence threshold (2.3) may need raising, or SG1's fallback detector becomes the real default. |
| SG4 | Pre-roll duration and beep cues (D8) feel right at Quest audio latency. | 3 s, three beeps, per D8. | Nick's headset checklist judgement, the same kind of call as VR spec 4.1's steadiness and legibility questions. |

No V4 build starts until SG1 through SG3 are answered and, if the browser
API fails, the detector choice in D3 is revisited before implementation.
SG4 is a feel check that can be tuned after M8 starts without reopening the
spec, since it changes only a constant.

## Reserved for Nick

Sessions run in learning mode, as in the main spec and the M3 spec. Small
decisions with real trade-offs, left for Nick to write during
implementation:

- **Pre-roll duration and cue style** (D8, SG4): 3 seconds and three
  descending beeps as drafted, or a shorter 2-second count, or a single
  sustained tone instead of three discrete beeps. About five lines
  (a constant plus which cue function runs on each tick).
- **On-device keyword model choice**, only if SG1 sends the milestone to the
  fallback in 2.3: which model and how it is bundled. This is a real
  trade-off between download size and accuracy that needs a short comparison
  before picking one, not a default.
- **Confidence threshold for a dropped match** (D10, section 2.3): the fake
  detector's tests use a placeholder threshold; the real number depends on
  what the chosen detector actually reports, known only after SG1 and SG3.

## Out of scope

- Voice-directed blocking (VR operator spec section 2, decision 1, and
  section 10): calling out actions for characters to perform. V4 is only
  "action" and "cut" on the camera's own recording.
- Multi-word slates beyond the take number readback ("scene two, take four,
  marker"): out of scope, matches VR spec section 10's "no scoring or
  progression" framing; the slate here is a status readout, not an input
  channel.
- Any keyword besides "action" and "cut" (VR spec decision 1 restricts the
  vocabulary to those two verbs).
- Continuous open-form voice commands or a wake word before "action"/"cut".
- Take compare, delete, re-select or re-shoot by voice: that is M6/M7 take
  management, unaffected by this spec.
- Multi-user sessions, hand tracking (VR operator spec section 10, whole
  track).
- Changing `Take.number` after the fact by voice (D6): renumbering is not
  designed here or anywhere in the roadmap.
- A native on-device wake-word always-listening mode with no arm gate: state
  gating (D1, D2) is the only listening model this spec designs.

## Open questions

Each has a default, already written into the sections above. Nick's answer,
and the Spike gate's headset findings, override it.

1. **Keyword detector.** Default: the browser `SpeechRecognition` API
   (D3, SG1). Reopens to the on-device model in 2.3 if the headset run
   fails SG1.
2. **Pre-roll length and cue style.** Default: 3 s, three descending beeps
   (D8, Reserved for Nick).
3. **Confidence threshold for a dropped match.** Default: deferred to
   whichever detector ships (Reserved for Nick, D10).
4. **Whether a spoken slate can ever override the store's take number.**
   Default: no, never (D6). The committed number from `commitRecordedTake`
   is always the one written and the one read back last.
5. **Whether voice permission is remembered across sessions.** Default: no,
   re-asked every load (section 3, point 5), since the OS-level Quest
   microphone permission can change underneath a remembered app-level flag.
6. **What happens when a shot's blocking finishes before "cut" is heard.**
   Default: the clock stops at the end (`loop: false`), the camera keeps
   recording until "cut" (section 4). M6's "longer than shot" handling
   covers the resulting take.

## Changelog

- 2026-09-25: initial spec. Builds the "action"/"cut" state machine on the
  M3 playback clock and M6's recorder, treats the Quest spike's speech and
  mic probe as unrun (Spike gate SG1 to SG4), and defaults the detector
  choice, pre-roll and misfire handling accordingly.
