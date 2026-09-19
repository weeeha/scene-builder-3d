// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { acquireProjectLock } from "@/storage/project-lock";

type FakeLock = { name: string };
type FakeLockCallback = (lock: FakeLock | null) => Promise<void>;

/** A minimal single-holder navigator.locks stand-in: real APIs to touch it do not exist under Node or jsdom, so this stub implements just the ifAvailable semantics acquireProjectLock relies on. */
function makeFakeLockManager() {
  const held = new Set<string>();
  return {
    async request(name: string, options: { ifAvailable?: boolean }, callback: FakeLockCallback): Promise<void> {
      if (held.has(name) && options.ifAvailable) {
        await callback(null);
        return;
      }
      held.add(name);
      try {
        await callback({ name });
      } finally {
        held.delete(name);
      }
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("acquireProjectLock", () => {
  it("the first caller gets readOnly: false", async () => {
    vi.stubGlobal("navigator", { locks: makeFakeLockManager() });
    const lock = await acquireProjectLock("proj_1");
    expect(lock.readOnly).toBe(false);
    lock.release();
  });

  it("a second caller while the lock is held gets readOnly: true", async () => {
    vi.stubGlobal("navigator", { locks: makeFakeLockManager() });
    const first = await acquireProjectLock("proj_1");
    const second = await acquireProjectLock("proj_1");
    expect(first.readOnly).toBe(false);
    expect(second.readOnly).toBe(true);
    first.release();
  });

  it("with no Web Locks support, readOnly is false", async () => {
    vi.stubGlobal("navigator", {});
    const lock = await acquireProjectLock("proj_1");
    expect(lock.readOnly).toBe(false);
  });
});
