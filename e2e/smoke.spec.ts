import { test, expect } from "@playwright/test";

test("the placeholder shell loads", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("scene-builder-3d")).toBeVisible();
});
