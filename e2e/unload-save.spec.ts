import { test, expect } from "@playwright/test";

// The autosaver waits 500 ms after the last edit before it writes to
// IndexedDB (src/storage/autosave.ts). This reloads straight after the
// edit, inside that window, so the edit can only survive through the
// unload path: an async IndexedDB write started in pagehide never commits
// in Chromium or WebKit, so ProjectLayout stashes the unsaved document in
// localStorage instead, and the next load replays it.
test("an edit made right before a reload survives it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("Unload");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("No scenes yet")).toBeVisible();

  await page.getByRole("button", { name: "Add scene" }).click();
  await page.reload();

  await expect(page.getByRole("link", { name: /Scene 1/ }).first()).toBeVisible();
  await expect(page.getByText("No scenes yet")).toHaveCount(0);
});

// The same, on the stage page, where the edit's first frame keeps the main
// thread busy for seconds under software WebGL and delays the debounce.
test("an edit on the stage page made right before a reload survives it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("Reload check");
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("button", { name: "Add scene" }).click();
  await page.getByRole("link", { name: /Scene 1/ }).first().click();
  await page.getByRole("button", { name: "Add shot" }).click();
  await page.reload();

  await expect(page.getByRole("link", { name: /Shot 1, Shot 01/ })).toBeVisible();
});
