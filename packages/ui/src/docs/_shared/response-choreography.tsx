import * as React from "react"

import { Button } from "@weeeha/ui/components/button"
import { Skeleton } from "@weeeha/ui/components/skeleton"
import { Spinner } from "@weeeha/ui/components/spinner"
import { cn } from "@weeeha/ui/lib/utils"

/** A runnable score for the AI response cycle.
 *
 *  The other examples on this page show motion one element at a time. This one
 *  exists because the hard part isn't any single transition — it's what moves
 *  while something else is already moving. Press Run and watch the order, not
 *  the easing.
 *
 *  Every delay below is a token multiple, never a magic number: the beat is
 *  --motion-base, and the stagger is half of it. */
const BEAT = 200
const STAGGER = 100

/** Phases, in the order a real turn produces them. `hold` is what the phase
 *  waits before handing over — a wait, not a duration. */
const PHASES = [
  { key: "idle", label: "Idle", hold: 0 },
  { key: "commit", label: "Commit", hold: BEAT },
  { key: "waiting", label: "Waiting", hold: BEAT * 3 },
  { key: "thinking", label: "Thinking", hold: BEAT * 4 },
  { key: "answering", label: "Answering", hold: BEAT * 6 },
  { key: "settled", label: "Settled", hold: 0 },
] as const

type PhaseKey = (typeof PHASES)[number]["key"]

const INDEX: Record<PhaseKey, number> = {
  idle: 0,
  commit: 1,
  waiting: 2,
  thinking: 3,
  answering: 4,
  settled: 5,
}

/** Enter transition shared by everything that arrives. Deliberately one
 *  recipe: opacity plus a short rise, `ease-enter`, `duration-base`. Variety
 *  in *how* things enter reads as noise; variety in *when* reads as sequence. */
function Enters({
  show,
  delay = 0,
  className,
  children,
}: {
  show: boolean
  delay?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "duration-base ease-enter transition-all",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0",
        className,
      )}
      style={{ transitionDelay: show ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  )
}

export function ResponseChoreography() {
  const [phase, setPhase] = React.useState<PhaseKey>("idle")
  const [running, setRunning] = React.useState(false)
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([])

  React.useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
    },
    [],
  )

  const run = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setRunning(true)
    setPhase("idle")
    let at = 0
    for (let i = 1; i < PHASES.length; i++) {
      const previous = PHASES[i - 1]
      const next = PHASES[i]
      if (!previous || !next) continue
      at += previous.hold || BEAT
      timers.current.push(setTimeout(() => setPhase(next.key), at))
    }
    timers.current.push(setTimeout(() => setRunning(false), at + BEAT))
  }

  const at = INDEX[phase]
  const committed = at >= INDEX.commit
  const waiting = at === INDEX.waiting
  const thinking = at >= INDEX.thinking
  const answering = at >= INDEX.answering
  const settled = at >= INDEX.settled

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={running} size="sm">
          {running ? "Running…" : "Run the sequence"}
        </Button>
        <span className="text-text-tertiary text-xs" aria-live="polite">
          {PHASES[at]?.label}
        </span>
      </div>

      <div className="border-border bg-surface-card flex min-h-64 flex-col gap-4 rounded-xl border p-4">
        {/* The prompt. Commits in place — no travel, because the user's own
            words must not appear to be re-rendered by the system. */}
        <div
          className={cn(
            "border-border bg-surface-secondary duration-fast ease-standard self-end rounded-lg border px-3 py-2 text-sm transition-opacity",
            committed ? "opacity-60" : "opacity-100",
          )}
        >
          Summarise the permit conditions
        </div>

        {/* The wait. Ambient, and it never gates what follows — it is replaced,
            not waited on. */}
        <Enters show={waiting} className="self-start">
          <span className="text-text-secondary flex items-center gap-2 text-sm">
            <Spinner />
            Working
          </span>
        </Enters>

        {/* Reasoning arrives first and holds. It is scaffolding for the answer,
            so it leads — and then stops moving. */}
        <Enters show={thinking} className="self-start">
          <div className="border-border text-text-tertiary rounded-lg border border-dashed px-3 py-2 text-xs">
            Checked 3 sources · reasoning
          </div>
        </Enters>

        {/* The answer. Lines land; they do not slide. Reading surface is the
            one place motion is forbidden. */}
        <div className="flex flex-col gap-2 self-start" aria-busy={!settled}>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              {answering && !settled ? (
                <Skeleton className={cn("h-4", i === 2 ? "w-40" : "w-64")} />
              ) : (
                <p
                  className={cn(
                    "duration-fast text-text-primary text-sm transition-opacity",
                    settled ? "opacity-100" : "opacity-0",
                  )}
                >
                  {
                    [
                      "Axle spacing must be recorded before dispatch.",
                      "Night travel is prohibited on segment 4.",
                      "The escort requirement lapses after 30 days.",
                    ][i]
                  }
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Trailing furniture. Staggered, and only after the text is stable —
            controls that arrive while someone is still reading get missed. */}
        <div className="flex gap-2 self-start">
          {["Sources", "Copy", "Retry"].map((label, i) => (
            <Enters key={label} show={settled} delay={i * STAGGER}>
              <span className="border-border text-text-secondary rounded-md border px-2 py-1 text-xs">
                {label}
              </span>
            </Enters>
          ))}
        </div>
      </div>
    </div>
  )
}
