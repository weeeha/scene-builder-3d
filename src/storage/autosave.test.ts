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
});
