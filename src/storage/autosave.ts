import type { Project } from "@/domain/types";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

// Delay before a retry, indexed by the consecutive-failure count that just
// occurred (RETRY_DELAYS_MS[0] follows the 1st failure). The autosaver
// stops scheduling automatic retries once MAX_CONSECUTIVE_FAILURES is
// reached, reporting "error" instead and waiting for the caller's next
// schedule() call; reaching that cap only ever consumes the first two
// entries. The third entry is kept for a possible future higher cap.
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const MAX_CONSECUTIVE_FAILURES = 3;

export function createAutosaver(opts: {
  save: (project: Project) => Promise<void>;
  delayMs?: number;
  onStatus: (status: SaveStatus, failures: number) => void;
}): { schedule(project: Project): void; flush(): Promise<void>; dispose(): void } {
  const delayMs = opts.delayMs ?? 500;
  let pending: Project | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let disposed = false;

  // True for exactly the span of one opts.save(...) call (from just before
  // it is invoked to just after it settles). A debounce or retry timer that
  // fires while this is true must not start a second, concurrent attempt -
  // see startAttempt/needsRerun below.
  let inFlight = false;
  let inFlightPromise: Promise<void> | null = null;
  // Set when something wanted a fresh attempt to start while one was
  // already in flight (a firing timer, or dispose()). Consumed at the end
  // of runAttempt, once the in-flight save has settled, so the caller
  // never sees two opts.save calls running at once.
  let needsRerun = false;

  function clearDebounce() {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function clearRetry() {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  async function runAttempt(project: Project): Promise<void> {
    opts.onStatus("saving", failures);
    try {
      await opts.save(project);
      inFlight = false;
      failures = 0;
      pending = null;
      if (!disposed) {
        opts.onStatus("saved", 0);
      }
    } catch {
      inFlight = false;
      failures += 1;
      if (disposed || failures >= MAX_CONSECUTIVE_FAILURES) {
        opts.onStatus("error", failures);
      } else {
        opts.onStatus("pending", failures);
        const delay = RETRY_DELAYS_MS[failures - 1];
        retryTimer = setTimeout(() => {
          retryTimer = null;
          startAttempt();
        }, delay);
      }
    }
    // A newer edit (or dispose) asked for a save while this one was still
    // in flight. It is safe to start now: the previous attempt has fully
    // settled, so this can never overlap it.
    if (needsRerun) {
      needsRerun = false;
      startAttempt();
    }
  }

  // The single place that starts an attempt for the current `pending`.
  // schedule's debounce timer, a retry backoff timer, flush, and dispose
  // all funnel through here, so two opts.save calls are never in flight
  // together - a call that arrives while one is already running just
  // marks needsRerun instead of starting a second one.
  function startAttempt(): void {
    if (pending === null) {
      return;
    }
    if (inFlight) {
      needsRerun = true;
      return;
    }
    clearRetry();
    inFlight = true;
    const project = pending;
    inFlightPromise = runAttempt(project);
  }

  return {
    schedule(project: Project) {
      if (disposed) {
        return;
      }
      pending = project;
      failures = 0;
      opts.onStatus("pending", 0);
      clearDebounce();
      clearRetry();
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        startAttempt();
      }, delayMs);
    },
    async flush() {
      if (disposed) {
        return;
      }
      clearDebounce();
      startAttempt();
      while (inFlight) {
        await inFlightPromise;
      }
    },
    // Tears down the autosaver. Any edit still sitting in `pending` - not
    // yet saved, whether it is waiting out the debounce or a retry backoff
    // - is fired as one best-effort save before the timers are cleared, so
    // closing or navigating away never silently drops it; a failure from
    // that save is still reported as status "error" rather than swallowed,
    // but dispose itself does not wait for the result and schedules no
    // further retry.
    dispose() {
      disposed = true;
      startAttempt();
      clearDebounce();
      clearRetry();
    },
  };
}
