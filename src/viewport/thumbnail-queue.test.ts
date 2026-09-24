import { describe, expect, it } from "vitest";

import { createScene, createShot } from "@/domain/factories";
import { shotsNeedingThumbs } from "./thumbnail-queue";

describe("shotsNeedingThumbs", () => {
  it("includes a shot with no thumb", () => {
    const scene = createScene("Kitchen");
    const shot = createShot("Shot 01");
    scene.shots.push(shot);

    expect(shotsNeedingThumbs(scene, { [shot.id]: "abc" })).toEqual([shot.id]);
  });

  it("includes a shot whose thumb hash is stale", () => {
    const scene = createScene("Kitchen");
    const shot = createShot("Shot 01");
    shot.thumb = { blobKey: "thumb:1", stateHash: "old" };
    scene.shots.push(shot);

    expect(shotsNeedingThumbs(scene, { [shot.id]: "new" })).toEqual([shot.id]);
  });

  it("excludes a shot whose thumb hash is fresh", () => {
    const scene = createScene("Kitchen");
    const shot = createShot("Shot 01");
    shot.thumb = { blobKey: "thumb:1", stateHash: "current" };
    scene.shots.push(shot);

    expect(shotsNeedingThumbs(scene, { [shot.id]: "current" })).toEqual([]);
  });
});
