# VR Rigs: design spec (M7, piece V3)

> **Status:** exploration · **Stage:** draft for review, written 2026-09-25
> **Milestone:** M7 in the [roadmap](../../roadmap.md), size M, gated on M6 (VR Operate handheld)
> **Builds approved by this document:** none until Nick approves it. Anything published from this work starts unlisted and is labeled `exploration`.
> **Related:** [VR operator spec](2026-09-18-vr-operator-design.md) (section 5.4, the `Rig<S>` sketch) · [camera and motion spec](2026-09-25-camera-and-motion-design.md) (M3, `RigSetup`, `Take`, `commitRecordedTake`) · [the M5 XR shell](2026-09-25-vr-scout-design.md) (`src/xr/` foundation) · [the M6 recorder](2026-09-25-vr-operate-design.md) (grabbing the camera, `Recording`, take management) · [main spec](2026-09-18-scene-builder-3d-design.md)

## TL;DR

- M7 gives the operator four rigs beyond the M6 recorder's handheld: tripod,
  dolly, crane and drone. Each is a pure function, `Rig<S>`, that turns the
  operator's hand pose and stick input into a `CameraPose` under one
  invariant per rig (fixed position, on a track, at a fixed distance from a
  pivot, flying free). The `RigSetup` variants for all five rigs already
  exist in M3 section 3.1; this spec adds no new variant.
- Placing a rig is a short in-VR flow: point, confirm, and for the crane an
  extra step to set the arm length. Each rig gets a visual (legs, a rail, an
  arm) so the operator sees what constrains the camera before they grab it.
- A take always carries the `RigSetup` it was shot on (M3 3.1). Re-shooting
  loads that setup back into its rig, so the operator can grab and go, or
  move it before recording a new take (takes are always new in VR, per R3).
- The flat editor never authors a rig. Every take made in the flat editor
  keeps `{ rig: "none" }`, as it already does from M3. Rig placement and
  rig-constrained recording are a VR-only path.
- The drone ignores the hand, matching the VR spec's own rig table. It flies
  on stick input alone, stays level (no roll, no pitch), and never moves the
  operator's own view, only the shot camera on the viewfinder monitor.
- `Rig<S>` needs a second stick axis for the drone's yaw and altitude, which
  the VR spec's sketch does not carry. This spec extends `RigInput` with one
  field, `stick2`, and lists it as a contract addition.

## 1. Problem

M6 gets one rig working end to end: grab the camera, hold it, record a
handheld take. The VR spec's rig table (section 5.4) names four more, each
with a real invariant a crew would recognize: a tripod that never moves, a
dolly that stays on its rail, a crane that stays at arm's length from its
pivot, a drone that flies free of the operator's hand. None of the four
exist yet. `RigSetup` already has a shape for all five in M3, and `Take`
already carries a `rig` field so a re-shoot can put the camera back where it
was. What is missing is the solver for each rig, the in-VR flow to place
one, its visual, and the rules for switching between them and for re-shooting
a take on the one it was recorded on.

## 2. Decisions

Decisions fixed elsewhere and cited here. They are not reopened by this spec.

| # | Decision | Source | Made |
|---|---|---|---|
| D6 | Browser-only, no server. | Roadmap R-log via main spec | 2026-09-18 |
| R3 | Takes are edited in place in the flat editor; a VR recording always makes a new take. | Roadmap | 2026-09-25 |
| R10 | VR specs are written in full now; anything the Quest spike measures is a default in a Spike gate section. | Roadmap | 2026-09-25 |
| C1, C15 | `RigSetup` (five constrained variants plus `none`) lives on `Take`, is kept for re-shooting, and is immutable: duplicating a take that shares a rig shares its meaning, not its data. | Camera and motion spec, 3.1 | 2026-09-25 |
| VR 5.4 | A rig is `{ init(setup, current): S; solve(input, state, dt): { pose, state } }`, and each rig's invariant is the thing its property tests check. | VR operator spec, 5.4 | 2026-09-18 |
| VR 7 | Comfort: nothing moves the operator's own view except head, teleport and snap turn; the drone flies the camera and leaves the operator standing still. | VR operator spec, 7 | 2026-09-18 |

Decisions this spec makes. Each is a default Nick can overturn in review; the
ones with a real trade-off are repeated in section 11.

| # | Decision | Why |
|---|---|---|
| G1 | `RigSetup` needs no new variant. Tripod, dolly, crane and drone in M3 3.1 already carry exactly the fields their solvers need (`position`; `from`, `to`; `pivot`, `armLength`; and a bare `{ rig: "drone" }`). | Checked against every solver below before writing this spec; none needed a field M3 does not have. |
| G2 | `RigInput` (VR spec 5.4) gains one field, `stick2: [number, number]`, read only by the drone. Every other rig ignores it. | The drone needs four axes (forward, strafe, yaw, altitude) and the VR spec's sketch has one stick. Extending the shared input type is simpler than giving the drone its own `solve` signature. |
| G3 | Tripod and dolly recompute orientation fresh every frame from the hand, with no smoothing filter. | A smoothed slerp between two "roll always zero" orientations does not itself stay exactly at zero roll partway through (`lookRotation`'s "closest up" convention is not preserved by slerp). Recomputing fresh keeps the invariant exact, not approximate, and keeps the solver a true function of the current frame's input alone. |
| G4 | The crane's orientation passes the hand's rotation straight through: full pan, tilt and roll. Only its position is constrained. | A boom operator's remote head rotates freely; the arm is what limits reach, not aim. Tripod and dolly instead lock roll (G3), because a fluid head does not roll. |
| G5 | The drone ignores `input.hand` for both position and orientation, matching the VR spec's own rig table. Position comes from `stick` and `stick2`; orientation is level (roll and pitch pinned at 0), yaw from `stick2.x`. | The VR spec already says "the hand is ignored" for this rig. A level horizon is also the comfort default (section 7). |
| G6 | Flat editing never sets a rig other than `{ rig: "none" }`. No flat "assign a rig" command is added. | `setLens`, `setBody` and `setFormat` (M3 6.2) already leave `rig` untouched; a keyed take's rig only ever changes by being VR-recorded over. Building a mouse-driven placement UI to match the VR one would duplicate this whole spec for a workflow the roadmap does not ask for. |
| G7 | Placing a rig is point-confirm, twice for the dolly (two ends) and with an extra arm-length step for the crane. Canceling before confirmation returns to handheld. | Mirrors the teleport arc-and-release gesture the VR spec's spike already uses (4.5), so the operator learns one gesture shape for both. |
| G8 | Switching from one constrained rig to another always goes through placement again. There is no "move the existing tripod." | A crane's pivot and a dolly's rail are physical facts about a set; changing them is placing a new one, not nudging a number. Keeps the placement flow the only way a `RigSetup`'s geometry is ever set, in VR or on re-shoot. |
| G9 | Re-shooting a take loads its stored `RigSetup` as an already-confirmed placement. The operator can grab and record immediately, or re-run placement to move it, before the new take records. | A re-shoot's whole point is repeating the same move; forcing placement again on every re-shoot would make "shoot it again, closer" slower than a fresh setup. |
| G10 | The dolly refuses a placement where the two ends are the same point (within 1 cm); the crane refuses an arm length under 0.3 m. Both are caught at confirmation, not at record time. | A zero-length track or a near-zero arm is not a usable rig, and catching it at placement means the operator never grabs a camera that cannot move. |

### Alternatives considered

- **A single generic constrained-rig type** with a shape and some parameters,
  instead of four named `RigSetup` variants. Rejected: M3 already shipped
  the four variants with fields particular to each rig's geometry, and a
  generic shape would need per-rig interpretation anyway, just moved into
  code instead of the type.
- **Damping tripod and dolly pan-tilt** the way handheld damps position and
  rotation together (M6). Rejected for M7's default (G3): the "roll stays
  zero" invariant the VR spec asks to test would only hold approximately
  under a filtered slerp. A damped variant is listed as a follow-up in
  section 11.
- **Full physical simulation for the crane** (arm mass, momentum, cable
  sway). Rejected: previs value is in the constraint (distance from pivot),
  not in simulating a boom's inertia, and a spring-mass model adds a tuning
  surface with no test that can pin it down the way "distance equals
  `armLength`" can.
- **Gimbal-style hand aim for the drone**, treating the hand as an in-flight
  camera operator riding along. Rejected: the VR spec's own rig table
  already says the hand is ignored for this rig (5.4), and a level,
  hand-independent flight is also the simpler comfort story (section 7).
- **Letting the flat editor place rigs too**, so a tripod shot could be
  blocked out with a mouse before ever putting on the headset. Rejected as
  the default (G6, and the open question this task asked about directly):
  it is real scope, a second placement UI in 2D, for a feature whose value
  is in operating a camera with your body. Reconsider once M6 and M7 ship
  and Nick has actually used both.

## 3. `Rig<S>` and `RigInput`

Pure, in `src/domain/rigs/`, unit-tested in Node, no React and no three.js,
following the same rule M3 3 sets for the rest of `src/domain`. `Rig<S>` and
`RigInput` are the VR spec's 5.4 sketch, kept under the names it gives them,
with `RigInput` extended (G2).

```ts
// src/domain/rigs/rig.ts
import type { CameraPose, RigSetup, Vec3 } from "../types";

export type RigInput = {
  hand: CameraPose;          // the grabbing controller's pose, world space
  stick: [number, number];   // right stick: x = strafe/pan rate, y = forward/tilt rate
  stick2: [number, number];  // left stick: read only by the drone. x = yaw rate, y = vertical rate. Extension, G2.
  grip: boolean;              // held while the camera is grabbed
};

export type Rig<S> = {
  init(setup: RigSetup, current: CameraPose): S;
  solve(input: RigInput, state: S, dtSec: number): { pose: CameraPose; state: S };
};
```

`solve` runs once per XR frame, the same cadence `cameraAtInto` runs at in
the flat viewport (M3 4.2), and must never allocate more than one `CameraPose`
and one state object, for the same reason M3's `cameraAtInto` avoids
allocation: it runs inside `useFrame` at 72 to 90 Hz.

`init` is called once, when the camera is grabbed onto a confirmed rig
(section 5) or when a take is loaded for re-shoot (section 6). Every rig
that does not read `state` across frames beyond what `init` set (tripod,
dolly) still returns a `state` from `solve`, unchanged, so every rig has the
same shape and the recorder (M6) can hold `state` generically without a
switch on rig kind.

`{ rig: "none" }` and `{ rig: "handheld" }` have no `Rig<S>` here: `none` is
never grabbed in VR (G6), and handheld's `Rig<S>` is M6's, built around
`handheld()` in the spike's `camera/handheld.ts`, which M6 finishes and
ports. This spec's four rigs share the module's helpers with it
(`src/domain/rigs/shared.ts`: `forwardOf(rotation)`, `lookLevel(position,
aim)`, a thin wrapper over M3's `lookRotation(position, aim, 0)`) but do not
depend on `handheld()` itself, so `src/domain/rigs` never imports from M6's
recorder module (G3's note on why: this rig's family does not want
handheld's combined position-and-rotation filter).

## 4. The four rigs

Each rig's file exports its state type, `init` and `solve`, and a constants
block for anything with a tunable feel. Fixture numbers below use
`p = [0, 0, 10]` for the hand's position and world `+Y` up unless stated.

### 4.1 Tripod (`src/domain/rigs/tripod.ts`)

**Behavior.** Position is fixed at the setup's point for the rig's whole
life. The hand pans and tilts the head; roll stays locked at zero.

```ts
export type TripodState = { position: Vec3 };

export function tripodInit(setup: Extract<RigSetup, { rig: "tripod" }>, _current: CameraPose): TripodState {
  return { position: setup.position };
}

export function tripodSolve(input: RigInput, state: TripodState, _dtSec: number): { pose: CameraPose; state: TripodState } {
  const aim = addVec3(input.hand.position, forwardOf(input.hand.rotation));
  const rotation = lookLevel(state.position, aim); // lookRotation(position, aim, 0)
  return { pose: { position: state.position, rotation }, state };
}
```

**Invariant, from VR spec 5.4.** Position never changes. Roll is zero.

**Property tests.** For 200 random hand poses and setup positions
(`fast-check`, matching M3's property-test style, section 8): `pose.position`
deep-equals `state.position` deep-equals `setup.position`. `pose.rotation`
equals `lookLevel(state.position, aim)` computed independently in the test,
which by `lookRotation`'s own construction (M3 4.2) carries zero roll. A
degenerate fixture, the hand aimed straight up, uses `lookRotation`'s own
pole fallback (M3 4.2) and stays finite.

### 4.2 Dolly (`src/domain/rigs/dolly.ts`)

**Behavior.** Position is the hand projected onto the segment from the
setup's `from` to `to`, clamped to the segment. The hand pans and tilts;
roll stays locked at zero, the same as the tripod, because a dolly's head is
a fluid head too.

```ts
export type DollyState = { from: Vec3; to: Vec3 };

export function dollyInit(setup: Extract<RigSetup, { rig: "dolly" }>, _current: CameraPose): DollyState {
  return { from: setup.from, to: setup.to };
}

export function dollySolve(input: RigInput, state: DollyState, _dtSec: number): { pose: CameraPose; state: DollyState } {
  const u = projectClamped01(input.hand.position, state.from, state.to);
  const position = lerpVec3(state.from, state.to, u);
  const aim = addVec3(input.hand.position, forwardOf(input.hand.rotation));
  const rotation = lookLevel(position, aim);
  return { pose: { position, rotation }, state };
}
```

`projectClamped01(p, from, to)` is
`clamp01(dot(sub(p, from), sub(to, from)) / lengthSq(sub(to, from)))`. A
segment shorter than 1 cm never reaches `dollySolve`: placement refuses it
(G10, section 5.2).

**Invariant, from VR spec 5.4.** Position is always on the segment.

**Property tests.** For 200 random `from`, `to` (at least 1 cm apart) and
hand positions: `position` equals `lerpVec3(from, to, u)` for some `u` in
`[0, 1]`, checked by recomputing `u` from the returned position and asserting
it is within `[0, 1]` and collinear with the segment to within 1e-6 m. Roll
is zero, by the same construction as the tripod.

### 4.3 Crane (`src/domain/rigs/crane.ts`)

**Behavior.** Position stays on the sphere of radius `armLength` around the
pivot, in the direction from the pivot to the hand. Orientation is the
hand's rotation, unmodified: full pan, tilt and roll (G4).

```ts
export type CraneState = { pivot: Vec3; armLength: number; lastDir: Vec3 }; // lastDir starts [0, 0, 1]

export function craneInit(setup: Extract<RigSetup, { rig: "crane" }>, current: CameraPose): CraneState {
  const dir = normalizeOrDefault(subVec3(current.position, setup.pivot), [0, 0, 1]);
  return { pivot: setup.pivot, armLength: setup.armLength, lastDir: dir };
}

export function craneSolve(input: RigInput, state: CraneState, _dtSec: number): { pose: CameraPose; state: CraneState } {
  const raw = subVec3(input.hand.position, state.pivot);
  const dir = normalizeOrDefault(raw, state.lastDir); // the hand at the pivot keeps the last direction
  const position = addVec3(state.pivot, scaleVec3(dir, state.armLength));
  return { pose: { position, rotation: input.hand.rotation }, state: { ...state, lastDir: dir } };
}
```

`normalizeOrDefault(v, fallback)` returns `fallback` when `length(v)` is
under 1 mm, so a hand passing exactly through the pivot never produces a
`0/0` direction. `armLength` under 0.3 m is refused at placement (G10),
so `craneSolve` never sees a near-zero radius.

**Invariant, from VR spec 5.4.** Distance to the pivot equals the arm
length.

**Property tests.** For 200 random pivots, arm lengths (0.3 to 8 m) and hand
positions, including the hand exactly at the pivot: `distance(position,
pivot)` is within 1e-6 m of `armLength`, and `pose.rotation` is a unit
quaternion (a rig never has to renormalize the hand's own pose, but the test
checks the pass-through does not corrupt it).

### 4.4 Drone (`src/domain/rigs/drone.ts`)

**Behavior.** The hand is ignored (G5, matching VR spec 5.4's own table).
`stick` flies forward and strafes, `stick2` yaws and climbs. Roll and pitch
stay at zero; only yaw and altitude change the camera's facing and height.
Velocity is a critically damped filter toward the commanded direction, so
letting go of both sticks glides the camera to a stop instead of snapping it.

```ts
export const DRONE_MAX_SPEED_MPS = 3;        // slow, cinematic default. Reserved for Nick, section 11.
export const DRONE_MAX_YAW_RATE_DEG_S = 45;  // Reserved for Nick, section 11.
export const DRONE_TAU_SEC = 0.35;           // velocity filter time constant. Reserved for Nick, section 11.

export type DroneState = { position: Vec3; velocity: Vec3; yawRad: number };

export function droneInit(_setup: Extract<RigSetup, { rig: "drone" }>, current: CameraPose): DroneState {
  return { position: current.position, velocity: [0, 0, 0], yawRad: yawOf(current.rotation) };
}

export function droneSolve(input: RigInput, state: DroneState, dtSec: number): { pose: CameraPose; state: DroneState } {
  const yawRad = state.yawRad + clamp(input.stick2[0], -1, 1) * degToRad(DRONE_MAX_YAW_RATE_DEG_S) * dtSec;
  const forward = [Math.sin(yawRad), 0, Math.cos(yawRad)] as Vec3;
  const right = [Math.cos(yawRad), 0, -Math.sin(yawRad)] as Vec3;
  const desired = addVec3(
    addVec3(scaleVec3(forward, -input.stick[1] * DRONE_MAX_SPEED_MPS), scaleVec3(right, input.stick[0] * DRONE_MAX_SPEED_MPS)),
    [0, input.stick2[1] * DRONE_MAX_SPEED_MPS, 0],
  );
  const alpha = 1 - Math.exp(-dtSec / DRONE_TAU_SEC);
  const velocity = lerpVec3(state.velocity, desired, alpha);
  const position = addVec3(state.position, scaleVec3(velocity, dtSec));
  const rotation = yawOnlyRotation(yawRad); // quaternion about world +Y; roll and pitch are 0
  return { pose: { position, rotation }, state: { position, velocity, yawRad } };
}
```

**Invariant, from VR spec 5.4.** With zero stick input the velocity decays
to zero.

**Property tests.** For 200 random starting velocities and 5 s of `tick(1/72)`
calls with `stick` and `stick2` at `[0, 0]`: `length(velocity)` is
monotonically non-increasing and under 1 mm/s by the end. `rotation` always
decomposes to zero roll and zero pitch (only yaw). `position` never depends
on `input.hand`: two runs with the same stick sequence but different, even
wildly different, hand poses produce identical position and rotation
sequences, a test that would fail if a later change accidentally wired the
hand back in.

## 5. Rig placement in VR

Lives in `src/xr/rigs/`, inside the M5 XR shell's `src/xr/` folder (M5 owns
that layout; this spec adds a subfolder to it, not a new top-level one). All
placement components talk to the domain rigs and to `commands.ts` (M3 6.2)
only, per the VR spec's "VR is isolated" rule (5.6): the flat editor imports
nothing from `src/xr/rigs/`.

### 5.1 The flow

A hand menu (built on the M5 shot strip's hand menu, VR spec 5.6) offers
"Handheld" (M6, always available), "Tripod", "Dolly", "Crane" and "Drone".
Picking one that needs placement (every rig but handheld and drone, which
starts wherever the camera currently is) starts a point-confirm flow using
the same teleport arc gesture the VR spec's spike already has for locomotion
(4.5): aim the arc at a surface, the trigger confirms the point it lands on.

- **Tripod.** One point. Confirm sets `setup.position` to where the arc
  lands. The tripod visual (5.3) appears there immediately, camera not yet
  attached.
- **Dolly.** Two points, `from` then `to`, each confirmed the same way. A
  rail visual grows from the first point toward the aim while the second is
  being placed. Confirming a second point within 1 cm of the first is
  refused (G10): the arc stays live and a toast asks for a different point.
- **Crane.** One point for the pivot, then an arm-length step: holding the
  trigger and moving the hand away from the pivot grows a visible arm; a
  second trigger press confirms the length at the hand's current distance
  from the pivot. A confirmed length under 0.3 m is refused (G10) and the
  arm-length step stays live.
- **Drone.** No placement. Picking it from the menu attaches the camera at
  its current pose (`droneInit` reads `current`), and the operator flies
  from wherever it already was.

Canceling at any point (a menu "Cancel" entry, or pressing the same
hand-menu button that opened the flow) discards the in-progress placement
and leaves the previous rig, or handheld if there was none, attached (G7).
Nothing is written to the document until the rig is confirmed and a take is
recorded (`commitRecordedTake`, M3 6.2, unchanged by this spec): placement
state lives in a session-only XR store, `src/xr/rigs/placement-store.ts`,
never persisted, never undoable, the same lifetime class as `editorStore`'s
`selectedKey` (M3 6.1).

### 5.2 Grabbing onto a placed rig

Grabbing the camera (M6's grip gesture) while a rig is confirmed but not yet
attached calls that rig's `init(setup, current)` and mounts its `solve` in
the recorder's per-frame loop in place of handheld's. Grabbing while nothing
is confirmed defaults to handheld, exactly as M6 already behaves with no
rig chosen. A placement that is not yet confirmed cannot be grabbed onto
(section 8, error table): the grip does nothing until the flow finishes.

### 5.3 Rig visuals

`src/xr/rigs/RigVisuals.tsx`, one component per rig, mounted whenever a rig
is placed or grabbed, so the operator sees the constraint even before
picking up the camera:

- **Tripod.** Three thin legs from the floor up to the head position, and a
  small disc at the head. Drawn from the single confirmed point; leg
  spread is cosmetic, computed from the point and the floor normal, not
  stored.
- **Dolly.** A line from `from` to `to`, with a small marker at the current
  `u` position while the rig is grabbed (M3's camera ghost path, 7.6, is the
  closest existing idea, rebuilt here for a straight segment instead of a
  keyed camera path).
- **Crane.** A line from the pivot to the current camera position, redrawn
  every frame at the rig's own output, so the "arm" visibly swings as the
  operator moves their hand around the pivot.
- **Drone.** No fixed geometry to draw, since nothing is fixed. A small
  trailing line behind the camera's last second of flight helps the operator
  read their own motion, the same idea as M3's object paths (7.6) but built
  from the last N drone samples in memory, not from the document.

All four use the set's existing materials and line width conventions from
the M5 shell's viewfinder and locomotion visuals (teleport arc, snap-turn
indicator), so a new visual style is not introduced here.

### 5.4 Switching rigs

Only offered while idle: not grabbed and not recording, the same gating the
VR spec 5.5 already uses for the voice "action" trigger. Choosing a
different rig from the hand menu while one is attached releases the camera
from its current rig (it stays floating at its last pose, exactly as
releasing the grip already does, M6) and starts that rig's placement flow
(G8). There is no direct "tripod to dolly" shortcut that skips placement:
every constrained rig's geometry is set the same one way.

## 6. Re-shooting a take on its stored `RigSetup`

Take management, comparing, re-selecting and deleting takes, is M6's (VR
spec 11). This spec adds one more action available from a take's row in the
VR take list (M6's UI): "Re-shoot this rig."

1. Reads the take's `rig: RigSetup` (M3 3.1). For `tripod`, `dolly` and
   `crane`, this is a fully confirmed setup already, so the placement store
   is filled directly from it, skipping the point-confirm flow (G9): the
   rig's visual appears at the stored geometry immediately.
2. The operator can grab and record straight away (a literal repeat), or
   reopen placement from the hand menu to move the tripod, redraw the dolly
   rail or repivot the crane before recording, exactly as picking a fresh
   rig would.
3. Recording, per R3, always makes a new take (`commitRecordedTake`, M3
   6.2), never overwrites the one re-shot. Its `Recording.rig` is whatever
   the rig ended up at when the operator called "cut": the stored setup
   unchanged if they never touched placement, or a new one if they did.
4. A stored `RigSetup` whose pivot, track or point now sits inside moved or
   deleted set geometry is used exactly as stored, with no validation
   against the current set: a prop moving does not invalidate a number in a
   take, the same rule M3 3.6 and the main spec's "a lost blob never breaks
   a shot" already follow for other kinds of drift.

Handheld re-shoot needs no rig-geometry step at all (there is nothing to
place); "Re-shoot" on a handheld take is already M6's "grab and record
again."

## 7. Comfort rules for the drone

The drone is the one rig whose camera moves independently of the operator's
body, so it gets its own comfort section, on top of the VR spec's general
rule (7) that nothing moves the operator's own view except head, teleport
and snap turn.

- **The operator's own view never moves.** The drone flies the shot camera,
  shown on the viewfinder monitor (M5); the operator's headset view is
  whatever they are standing in, unchanged. VR spec 7 already states this
  as the rule for this rig by name.
- **Level flight only.** Roll and pitch stay at zero (G5); only yaw and
  altitude change orientation. This keeps the viewfinder's horizon level
  through the whole take, which is both a comfort default for watching a
  monitor that moves and the simplest way to keep the rig's own invariant
  (position and yaw only) easy to test.
- **Speed and yaw rate are capped** (`DRONE_MAX_SPEED_MPS`,
  `DRONE_MAX_YAW_RATE_DEG_S`, section 4.4). These are a legibility default,
  not a vection-safety measure: watching a fast, jerky shot on a small
  monitor is unpleasant and hard to frame with, independent of whether it
  can make anyone dizzy. The constants are marked Reserved for Nick
  (section 11) because the right speed is a feel question the Quest spike
  never asked (section 12).
- **No collision handling.** A drone flown through a wall or a prop passes
  through it. Previs is the point; a boom operator's real arm has limits a
  crane rig enforces (its distance invariant), but a drone in the real world
  can also fly through open space a physical previs stage cannot represent,
  so no attempt is made to stop it here. Out of scope (section 13) notes
  this is worth reconsidering once the tool has real sets with walls tall
  enough to matter.

## 8. Error handling

| Failure | Behaviour |
|---|---|
| Placement arc finds no surface (aimed at the sky, or off the set) | The trigger confirms nothing; the arc stays live until it lands somewhere. |
| Dolly's second point lands within 1 cm of the first (G10) | Refused. Toast: "Track needs two different points." The arc stays live for another try; the first point is kept. |
| Crane arm length confirmed under 0.3 m (G10) | Refused. Toast: "Arm too short." The arm-length step stays live. |
| Grip pressed near the camera while a rig is placed but not yet confirmed | No-op. The camera is not attached to anything until placement confirms. |
| Rig switch requested while grabbed or recording | Refused (5.4's idle gating). The hand-menu entry is present but does nothing; a toast repeats the "cut first" message M6 already shows for other actions gated the same way. |
| Placement flow canceled mid-flow | Discarded. The camera keeps whatever rig it had, or handheld if none (G7). Nothing is written to the document. |
| Hand tracking lost mid-take on a constrained rig | Held at the rig's last good input, per VR spec 7's general rule; a gap over 0.5 s ends the take exactly as it does for handheld. No rig-specific handling: `solve` just keeps receiving the same `input.hand` value the recorder last had. |
| Crane's hand exactly at the pivot | `normalizeOrDefault` (4.3) keeps the last direction. No NaN, no snap. |
| Dolly's `from` equals `to` after import or a hand-authored fixture that bypassed placement (should not happen through the UI, but the domain function must not crash) | `projectClamped01` returns `0`; the rig behaves like a fixed point at `from`. Not an error at the domain layer, only at placement (G10), which is the one path that can create a `RigSetup` in the first place. |
| A re-shot take's stored `RigSetup` geometry now sits inside moved or deleted set dressing | Used exactly as stored. No validation against current set geometry (section 6, point 4). |
| `Recording.rig` at `commitRecordedTake` names a rig this spec did not init (a future rig kind added later without updating the recorder) | Same failure path M3 already defines for any bad `Recording`: the blob write is attempted and the take is added if it succeeds; rig identity is metadata, not something `commitRecordedTake` validates against a known list. A schema check (9) catches a genuinely malformed `RigSetup` on load or import, same as any other invariant. |
| Drone flown far outside the set's normal bounds | Not refused. The set has no hard boundary (out of scope, 7); a drone can fly anywhere its stick input takes it, same as a real drone in open air. |

## 9. Testing

Domain tests are written first and run in Node, following M3's style
(section 10 there) and its `fast-check` dependency for the property tests,
200 runs each in CI.

**Domain unit tests**

- `rig.test.ts`: `RigInput` and `Rig<S>` are type-only, so this file holds
  the shared helpers instead: `forwardOf`, `lookLevel` against `lookRotation`
  with roll forced to `0` (M3 4.2 already tests `lookRotation` itself; this
  file only checks the wrapper calls it correctly), `normalizeOrDefault` at
  and away from zero length, `projectClamped01` at both ends and the
  midpoint of a segment.
- `tripod.test.ts`: `tripodInit` copies `setup.position`; `tripodSolve`
  never changes it across 50 different hand poses; a hand aimed straight up
  or down hits `lookRotation`'s own pole fallback and stays finite.
- `dolly.test.ts`: `dollyInit`/`dollySolve` fixtures at `u = 0`, `0.5`, `1`,
  and hand positions past either end (clamped, not extrapolated); a
  near-degenerate segment (1.5 cm, just above the 1 cm refusal threshold)
  still solves without dividing by a near-zero length badly enough to
  produce a non-finite `u`.
- `crane.test.ts`: `craneSolve` at several pivots and arm lengths; the
  hand exactly at the pivot keeps `lastDir`; two consecutive frames with the
  hand on opposite sides of the pivot swing the arm through, not around, the
  short way (matches whatever `normalizeOrDefault` returns, no wrap-around
  logic needed since there is no interpolation between frames).
- `drone.test.ts`: `droneSolve` fixtures for each stick axis in isolation
  (forward, strafe, yaw, altitude) confirming the expected direction of
  motion under yaw `0`; yaw accumulates correctly over several frames; the
  hand's pose has zero effect on the output (asserted directly, not just
  by omission, per G5's test in 4.4).

**Property tests**, one item each maps to the invariant column in the VR
spec's 5.4 table:

1. Tripod: `position` is invariant under any hand pose (4.1).
2. Dolly: `position` is always on the segment (4.2).
3. Crane: `distance(position, pivot)` equals `armLength` within 1e-6 m for
   any hand position, pivot and arm length in [0.3, 8] m (4.3).
4. Drone: with zero stick input for 5 s of ticks, `velocity` magnitude is
   monotonically non-increasing and ends under 1 mm/s (4.4).
5. Drone: `position` and `rotation` are independent of `input.hand` for any
   fixed stick sequence (4.4, the "hand is ignored" check).
6. Every rig: `solve` never returns a non-finite `Vec3` or a `Quat` whose
   length is more than 1e-6 from 1, for 200 random inputs including the
   degenerate ones named above (hand at the pivot, hand aimed at a pole,
   near-zero dolly segment).
7. Tripod and dolly: `pose.rotation` always decodes to zero roll, checked by
   rebuilding the rotation from `lookRotation(position, aim, 0)`
   independently in the test and comparing.

**Placement-store tests** (`src/xr/rigs/placement-store.ts`, plain Zustand
store logic, no React, testable in Node like `editorStore`): starting a
placement flow, confirming each point, the dolly's same-point refusal, the
crane's short-arm refusal, canceling mid-flow, and re-shoot's "load a
confirmed setup directly" path (section 6, point 1) never touching the
document.

**XR shell tests.** Deferred to the WebXR emulator setup the M5 spec owns
(VR operator spec 8: "XR shell: the WebXR emulator in desktop Chrome, from a
written checklist at first"). This spec's own checklist additions: placing
each of the three geometry-based rigs, grabbing onto a placed rig, switching
rigs mid-idle, canceling a placement, re-shooting a take on each rig kind.

**Headset checklist**, run by Nick, since feel cannot be automated (VR
operator spec 8): does a tripod pan feel like a fluid head or too stiff with
no damping (G3, and the follow-up in section 11); is the crane's full-roll
pass-through comfortable to operate or does the wrist roll fight the frame;
do the drone's default speed and yaw-rate constants feel usable, too fast or
too slow (section 11).

## 10. Porting map

Nothing in either predecessor repo has a VR rig concept; Film Planner and
Scene Builder v2 are both flat editors. The one file M7 leans on is the
spike's own handheld work, which stays M6's:

| Into | From | Source | How |
|---|---|---|---|
| Shared helpers in `src/domain/rigs/shared.ts` | This repo | `src/domain/camera.ts` (`lookRotation`), M3 4.2 | Reused, not copied: `lookLevel` is a one-line wrapper calling `lookRotation(position, aim, 0)`. |
| Not ported | VR spike | `spikes/vr-camera-feel/src/camera/handheld.ts` | Stays M6's. `src/domain/rigs/` does not import it (G3's rationale: a different filter shape is wanted here). |
| Not ported | Neither predecessor has a rig concept | n/a | Every solver in section 4 is new code, written against the VR spec 5.4 sketch and this spec's invariants, not ported from anywhere. |

Rule for every port, from the main spec: copy from the real source with its
tests, confirm the tests pass unchanged, then adapt. Nothing in this spec
has a real source to copy from, so it is written and tested fresh, per the
rule's own "port, do not re-invent" logic having nothing to port here.

## 11. Build slices

M7 is size M, built as two slices, each with its own implementation plan and
PR, gated on M6 (the recorder that calls `Rig<S>.solve` and produces
`Recording`s exists first).

### M7.1 Rig solvers (S)

`src/domain/rigs/`: `rig.ts`, `shared.ts`, `tripod.ts`, `dolly.ts`,
`crane.ts`, `drone.ts`, every unit and property test in section 9's domain
list. No UI, no XR shell code. `RigInput`'s `stick2` field is added here,
unused by anything until M7.2 wires a controller to it.

- **Done when:**
  1. Every property test in section 9 passes 200 runs in CI.
  2. Every fixture in section 4 (tripod position invariant, dolly segment
     clamp, crane distance, drone hand-independence) is asserted, not just
     described.
  3. `Rig<S>` compiles against all four rigs with one shared type parameter
     per rig's own state, with no `any`.
- **States covered:** each rig at rest (zero input), each rig under extreme
  input (hand far from a crane's pivot, drone sticks pinned to ±1, a dolly
  segment at the 1 cm refusal boundary), the shared degenerate cases (hand
  at a crane's pivot, hand aimed at a pole).

### M7.2 Placement, visuals, switching, re-shoot (M)

`src/xr/rigs/`: the placement store, the point-confirm flow for tripod,
dolly and crane, the arm-length step, `RigVisuals`, the hand-menu entries,
grabbing onto a placed rig, rig switching's idle gate, and the "Re-shoot
this rig" action added to M6's take list.

- **Done when:**
  1. In the WebXR emulator, placing a tripod, a dolly and a crane each
     produces the visual in section 5.3 at the confirmed geometry, and
     grabbing the camera afterward constrains it per that rig's invariant
     (checked against the domain layer's own property tests holding at
     runtime, not re-derived by hand).
  2. Picking the drone from the hand menu attaches it at the camera's
     current pose with no placement step, and stick input flies it level.
  3. Recording a take on each of the four rigs (handheld already works from
     M6) produces a `Take` whose `rig` field matches what was placed, and
     the take replays correctly on the flat page (M3's `cameraAt`, unaware
     of rigs, samples the recorded dense track the same as any other).
  4. "Re-shoot this rig" on a take recorded on a tripod, a dolly and a
     crane loads each one's geometry back with no placement flow, and
     recording from there produces a new take (never overwrites the
     original, per R3).
  5. Canceling a placement, confirming a same-point dolly, and confirming a
     too-short crane arm all behave exactly as the error table in section 8
     says, checked in the emulator.
  6. Flat-editor regression: a project with VR-recorded takes on every rig
     kind still opens, plays and exports in Chrome and Safari with
     `navigator.xr` absent, per the VR operator spec's "flat regression on
     every VR PR" rule (8).
- **States covered:** no rig placed (handheld default), each rig placed but
  not grabbed, each rig grabbed and recording, a rig switch mid-idle, a
  canceled placement, a re-shoot on each rig kind, the flat page with a
  rig-recorded take selected.

## Reserved for Nick

Sessions run in learning mode, as in the main spec and M3. Two small
decisions are left for Nick to write during implementation, five to ten
lines each:

- **Whether tripod and dolly pan-tilt get a light damping filter**, once M6's
  `handheld()` is written and its feel is known from the headset checklist.
  G3's default in this spec is no filter, for an exact invariant; a follow-up
  could wrap `lookLevel`'s output in a rotation-only version of the same
  time-constant filter shape handheld uses, tested only for "stays close to
  the undamped answer, never introduces roll," not for an exact zero.
- **The drone's `DRONE_MAX_SPEED_MPS`, `DRONE_MAX_YAW_RATE_DEG_S` and
  `DRONE_TAU_SEC`** (4.4). The defaults here are a guess at a slow,
  legible, cinematic drone; Nick tunes the three numbers after flying it in
  the headset, the same way `handheld.ts`'s smoothing curve is his call.

## 12. Out of scope

- Flat-editor rig authoring (G6, and the alternative in section 2). A
  future spec, not this one, if Nick wants it after using M6 and M7.
- Collision or bounds checking for the drone, or for any rig's placement
  point (section 7). A previs tool, not a physics sim.
- Damped tripod and dolly pan-tilt (Reserved for Nick, above). Ships
  undamped first.
- Zoom lenses on any rig, and changing lens, body or format mid-take. Both
  already out of scope from M3 (13) and unaffected by rigs.
- A rig's placement or geometry participating in `hashShotState` (M3 4.4).
  The hash already covers a take's rig only insofar as `renderTake` includes
  the whole take; a rig's own placement never changes what renders (the
  `RigSetup` only shapes how a take was recorded, not what plays back), so
  no change to the hash table is needed here.
- More than one operator, or more than one camera rig active at once.
  Multi-user VR is out of scope for the whole track (VR operator spec 10).
- A rig for a stunt or motion-capture use case beyond the five named here.

## 13. Open questions

Each has a default, already written into the sections above. Nick's answer
overrides it.

1. **Damped or instant tripod and dolly pan-tilt.** Default: instant, no
   filter (G3), for an exact roll-zero invariant. See Reserved for Nick.
2. **Crane orientation: full hand pass-through, or roll-locked like tripod
   and dolly.** Default: full pass-through (G4), on the theory a remote
   head rotates freely and only the arm constrains reach.
3. **Drone flight constants.** Default: 3 m/s max speed, 45°/s max yaw,
   0.35 s velocity time constant (4.4). Confirm at milestone start, in the
   headset checklist; not something the Quest spike measured (section 14).
4. **Flat-editor rig authoring.** Default: no (G6). Reconsider after M6 and
   M7 ship.
5. **Placement refusal thresholds**: 1 cm for a dolly's two points, 0.3 m
   for a crane's arm (G10). Defaults chosen to be clearly degenerate, not
   tuned against real footage.
6. **`RigInput.stick2`'s existence.** Default: added as an extension to the
   VR spec's sketch (G2), read only by the drone. Confirm the field name
   and axis mapping (x = yaw, y = altitude) before M7.2 wires a controller
   to it.

## 14. Spike gate

Per R10, anything the Quest spike (VR operator spec 4) measures is listed
here as a default to confirm once section 4.10 of that spec fills in. As of
this writing, 4.10 still reads `pending` on every row: the headset run
itself has not happened yet.

- **Frame budget for rig visuals alongside the viewfinder.** The spike's
  question 1 (frame rate) was measured with no rig geometry on screen, only
  the handheld camera and the viewfinder passes (VR spec 4.1, 4.2). Section
  5.3's four visuals (legs, a rail, an arm, a trail) add a small amount of
  extra geometry; whether that fits inside the per-set performance budget
  M5 sets from the spike's numbers is unconfirmed until that budget exists.
  Confirm at milestone start.
- **Whatever smoothing level the spike's question 2 settles on** (VR spec
  4.1: "at some smoothing level an 85 mm static hold reads as handheld
  footage") is the reference this spec's Reserved-for-Nick damping
  follow-up (section 11) would start from, if Nick adds damping to tripod
  and dolly later. Confirm at milestone start.
- **The drone's flight feel is not covered by the spike at all.** The
  spike's scope (VR spec 4.2) explicitly excludes every rig but handheld.
  The constants in section 4.4 are new defaults with no spike data behind
  them, confirmed only by this milestone's own headset checklist (section
  9), not by the shared spike run.
- **The spike gates M5, not M7 directly** (roadmap: "The spike gates M5:
  VR Scout cannot start design until the headset run answers whether the
  platform holds"). By the time M7's build slices start, M5 and M6 have
  already shipped on whatever the spike's go or no-go decided, so this
  section only tracks numbers this spec borrows from that run, not the
  platform decision itself.

## Changelog

- 2026-09-25: initial spec. Rig solvers as pure functions against the VR
  spec's 5.4 sketch, `RigSetup` reused unchanged from M3 3.1, placement and
  visuals in the M5 XR shell's `src/xr/` layout, re-shoot wired to the M6
  recorder's take management, comfort rules for the drone, and a Spike gate
  section per R10.
