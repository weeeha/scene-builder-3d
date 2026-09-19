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

  async function attempt(project: Project): Promise<void> {
    opts.onStatus("saving", failures);
    try {
      await opts.save(project);
      failures = 0;
      pending = null;
      if (!disposed) {
        opts.onStatus("saved", 0);
      }
    } catch {
      failures += 1;
      if (disposed) {
        return;
      }
      if (failures >= MAX_CONSECUTIVE_FAILURES) {
        opts.onStatus("error", failures);
        return;
      }
      opts.onStatus("pending", failures);
      const delay = RETRY_DELAYS_MS[failures - 1];
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (pending !== null) {
          void attempt(pending);
        }
      }, delay);
    }
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
        if (pending !== null) {
          void attempt(pending);
        }
      }, delayMs);
    },
    async flush() {
      if (disposed) {
        return;
      }
      clearDebounce();
      clearRetry();
      if (pending !== null) {
        await attempt(pending);
      }
    },
    dispose() {
      disposed = true;
      clearDebounce();
      clearRetry();
    },
  };
}
