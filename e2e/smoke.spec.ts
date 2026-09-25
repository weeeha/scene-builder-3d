import { test, expect } from "@playwright/test";

test("S1 walking skeleton: create a project, dress a set, shoot, and reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No projects yet")).toBeVisible();

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("Job Smith");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByText("No scenes yet")).toBeVisible();
  await page.getByRole("button", { name: "Add scene" }).click();
  await page.getByRole("link", { name: /Scene 1/ }).first().click();

  await expect(page.getByText("The set is empty")).toBeVisible();
  await page.getByRole("button", { name: "Add box" }).click();
  await expect(page.getByText("The set is empty")).toHaveCount(0);

  await page.getByRole("button", { name: "Add shot" }).click();
  await page.getByRole("button", { name: "Add shot" }).click();
  await expect(page.getByRole("link", { name: /Shot 1, Shot 01/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Shot 2, Shot 02/ })).toBeVisible();

  await page.getByRole("link", { name: /Shot 1, Shot 01/ }).click();
  await expect(page.getByLabel("Name")).toHaveValue("Shot 01");

  await page.getByRole("link", { name: /Shot 2, Shot 02/ }).click();
  await expect(page.getByLabel("Name")).toHaveValue("Shot 02");

  // The autosaver debounces writes to IndexedDB by 500ms after the last
  // edit (src/storage/autosave.ts). Playwright drives the UI far faster
  // than that, so without this wait the reload below can race the pending
  // write: the two shots added above would not be durable yet, and the
  // reload would land on a document that has already forgotten them.
  // There is no visible "saved" indicator to assert on instead (only a
  // banner on save failure), so this waits out the known debounce window
  // directly rather than a locator.
  await page.waitForTimeout(800);

  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(page.getByLabel("Name")).toHaveValue("Shot 02");

  await page.getByRole("link", { name: "Set" }).click();
  await expect(page.getByText("The set is empty")).toHaveCount(0);
});
