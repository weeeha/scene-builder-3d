// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProject } from "@/domain/factories";
import { createAutosaver } from "@/storage/autosave";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createAutosaver", () => {
  it("debounces: three quick schedule calls produce one save with the last project after 500 ms", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const onStatus = vi.fn();
    const autosaver = createAutosaver({ save, onStatus });

    const projectA = createProject("A");
    const projectB = createProject("B");
    const projectC = createProject("C");

    autosaver.schedule(projectA);
    await vi.advanceTimersByTimeAsync(100);
    autosaver.schedule(projectB);
    await vi.advanceTimersByTimeAsync(100);
    autosaver.schedule(projectC);
    await vi.advanceTimersByTimeAsync(500);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(projectC);
  });

  it("flush saves immediately without waiting for the debounce", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const onStatus = vi.fn();
    const autosaver = createAutosaver({ save, onStatus });
    const project = createProject("Flush me");

    autosaver.schedule(project);
    await autosaver.flush();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(project);
    expect(onStatus).toHaveBeenCalledWith("saved", 0);
  });

  it("retries a failing save at 1 s then 2 s, and reports error with failures: 3", async () => {
    const save = vi.fn().mockRejectedValue(new Error("disk full"));
    const onStatus = vi.fn();
    const autosaver = createAutosaver({ save, onStatus });
    const project = createProject("Doomed");

    autosaver.schedule(project);
    await vi.advanceTimersByTimeAsync(500); // debounce elapses, attempt 1 fails
    expect(save).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenLastCalledWith("pending", 1);

    await vi.advanceTimersByTimeAsync(1000); // backoff 1 s, attempt 2 fails
    expect(save).toHaveBeenCalledTimes(2);
    expect(onStatus).toHaveBeenLastCalledWith("pending", 2);

    await vi.advanceTimersByTimeAsync(2000); // backoff 2 s, attempt 3 fails
    expect(save).toHaveBeenCalledTimes(3);
    expect(onStatus).toHaveBeenLastCalledWith("error", 3);
  });

  it("a later successful schedule resets failures to 0 and reports saved", async () => {
    const save = vi.fn().mockRejectedValue(new Error("disk full"));
    const onStatus = vi.fn();
    const autosaver = createAutosaver({ save, onStatus });
    const project = createProject("Recovers");

    autosaver.schedule(project);
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    expect(onStatus).toHaveBeenLastCalledWith("error", 3);

    save.mockResolvedValue(undefined);
    autosaver.schedule(project);
    await vi.advanceTimersByTimeAsync(500);

    expect(onStatus).toHaveBeenLastCalledWith("saved", 0);
  });

  it("dispose fires a best-effort save of a pending edit instead of dropping it", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const onStatus = vi.fn();
    const autosaver = createAutosaver({ save, onStatus });
    const project = createProject("Closing early");

    autosaver.schedule(project);
    await vi.advanceTimersByTimeAsync(100); // well inside the 500 ms debounce window
    autosaver.dispose();
    await vi.advanceTimersByTimeAsync(1000);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(project);
  });

  it("dispose with nothing pending does not call save", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const onStatus = vi.fn();
    const autosaver = createAutosaver({ save, onStatus });

    autosaver.dispose();
    await vi.advanceTimersByTimeAsync(1000);

    expect(save).not.toHaveBeenCalled();
  });

  it("never runs two saves concurrently, and settles on saved when an in-flight failure is followed by a queued success", async () => {
    const onStatus = vi.fn();
    let rejectA!: (err: Error) => void;
    let resolveB!: () => void;
    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            rejectA = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveB = resolve;
          }),
      );
    const autosaver = createAutosaver({ save, onStatus });

    const projectA = createProject("A");
    const projectB = createProject("B");

    autosaver.schedule(projectA);
    await vi.advanceTimersByTimeAsync(500); // debounce elapses, A's save starts and stays in flight
    expect(save).toHaveBeenCalledTimes(1);

    autosaver.schedule(projectB);
    await vi.advanceTimersByTimeAsync(500); // B's own debounce fires while A is still in flight
    expect(save).toHaveBeenCalledTimes(1); // no concurrent second save started

    rejectA(new Error("disk full"));
    await vi.advanceTimersByTimeAsync(0); // let A's rejection settle and the queued B start
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenNthCalledWith(2, projectB);

    resolveB();
    await vi.advanceTimersByTimeAsync(0);

    expect(onStatus).toHaveBeenLastCalledWith("saved", 0);

    // No stray retry timer left over from A's failure should fire later.
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  describe("an edit scheduled while an earlier save is in flight and then succeeds", () => {
    function setup() {
      const onStatus = vi.fn();
      let resolveA!: () => void;
      const save = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              resolveA = resolve;
            }),
        )
        .mockResolvedValue(undefined);
      const autosaver = createAutosaver({ save, onStatus });
      return { save, onStatus, autosaver, resolveA: () => resolveA() };
    }

    it("is saved once its own debounce elapses after the earlier save settles", async () => {
      const { save, autosaver, resolveA } = setup();
      const projectA = createProject("A");
      const projectB = createProject("B");

      autosaver.schedule(projectA);
      await vi.advanceTimersByTimeAsync(500); // debounce elapses, A's save starts and stays in flight
      autosaver.schedule(projectB); // edited while A is still being written

      resolveA();
      await vi.advanceTimersByTimeAsync(0); // A settles; B's debounce is still counting down
      await vi.advanceTimersByTimeAsync(500); // B's debounce elapses

      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenLastCalledWith(projectB);
    });

    it("is saved right after the earlier save settles when its debounce already fired during it", async () => {
      const { save, autosaver, resolveA } = setup();
      const projectA = createProject("A");
      const projectB = createProject("B");

      autosaver.schedule(projectA);
      await vi.advanceTimersByTimeAsync(500); // debounce elapses, A's save starts and stays in flight
      autosaver.schedule(projectB);
      await vi.advanceTimersByTimeAsync(500); // B's debounce fires while A is still in flight
      expect(save).toHaveBeenCalledTimes(1);

      resolveA();
      await vi.advanceTimersByTimeAsync(0); // A settles and the queued rerun starts

      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenLastCalledWith(projectB);
    });

    it("keeps the status at pending, not saved, until that newer edit is written", async () => {
      const { onStatus, autosaver, resolveA } = setup();

      autosaver.schedule(createProject("A"));
      await vi.advanceTimersByTimeAsync(500); // A's save starts and stays in flight
      autosaver.schedule(createProject("B"));

      resolveA();
      await vi.advanceTimersByTimeAsync(0); // A settles; B is still unsaved
      expect(onStatus).toHaveBeenLastCalledWith("pending", 0);

      await vi.advanceTimersByTimeAsync(500); // B's debounce elapses and B is written
      expect(onStatus).toHaveBeenLastCalledWith("saved", 0);
    });
  });
});
