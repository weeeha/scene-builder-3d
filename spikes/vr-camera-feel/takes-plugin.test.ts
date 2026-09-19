import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { yawQuat } from "./src/camera/pose";
import { makeTake, pushSample, serializeTake } from "./src/camera/take";
import { listTakes, readTakeJson, saveTakeJson } from "./takes-plugin";

function takeJson(id: string, number: number, createdAt: number): string {
  const samples: number[] = [];
  pushSample(samples, 0, { position: [0, 1, 0], rotation: yawQuat(0) });
  pushSample(samples, 1.5, { position: [1, 1, 0], rotation: yawQuat(20) });
  return serializeTake(makeTake({ id, number, createdAt, lensMm: 50, smoothing: 0.66, samples }));
}

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "takes-"));
});

describe("saveTakeJson", () => {
  it("writes <id>.json and returns the id", () => {
    expect(saveTakeJson(dir, takeJson("take-1-100", 1, 100))).toEqual({ id: "take-1-100" });
    expect(fs.existsSync(path.join(dir, "take-1-100.json"))).toBe(true);
  });

  it("creates the folder when it is missing", () => {
    const nested = path.join(dir, "not-there-yet");
    saveTakeJson(nested, takeJson("take-1-100", 1, 100));
    expect(fs.existsSync(path.join(nested, "take-1-100.json"))).toBe(true);
  });

  it("rejects invalid takes and unsafe ids without writing anything", () => {
    expect(() => saveTakeJson(dir, "{}")).toThrow(/^Invalid take:/);
    const unsafe = takeJson("take-1-100", 1, 100).replace("take-1-100", "../escape");
    expect(() => saveTakeJson(dir, unsafe)).toThrow(/^Invalid take:/);
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});

describe("listTakes", () => {
  it("returns an empty list for a missing folder", () => {
    expect(listTakes(path.join(dir, "missing"))).toEqual([]);
  });

  it("lists summaries newest first and skips files that are not takes", () => {
    saveTakeJson(dir, takeJson("take-1-100", 1, 100));
    saveTakeJson(dir, takeJson("take-2-200", 2, 200));
    fs.writeFileSync(path.join(dir, "junk.json"), "not a take");
    fs.writeFileSync(path.join(dir, "notes.txt"), "ignore me");
    expect(listTakes(dir)).toEqual([
      { id: "take-2-200", number: 2, lensMm: 50, durationSec: 1.5, createdAt: 200 },
      { id: "take-1-100", number: 1, lensMm: 50, durationSec: 1.5, createdAt: 100 },
    ]);
  });
});

describe("readTakeJson", () => {
  it("returns the stored JSON, or null when the take does not exist", () => {
    const json = takeJson("take-1-100", 1, 100);
    saveTakeJson(dir, json);
    expect(readTakeJson(dir, "take-1-100")).toBe(json);
    expect(readTakeJson(dir, "take-9-900")).toBeNull();
  });

  it("refuses ids that could leave the folder", () => {
    fs.writeFileSync(path.join(dir, "secret.json"), "{}");
    expect(readTakeJson(path.join(dir, "sub"), "../secret")).toBeNull();
  });
});
