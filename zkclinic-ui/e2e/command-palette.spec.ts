import { test, expect } from "@playwright/test";

test.describe("Command palette", () => {
  test("opens with Ctrl+K, filters, navigates and closes with Escape", async ({ page }) => {
    await page.goto("/app/patient");
    await expect(page.getByTestId("zkclinic-app")).toBeVisible();
    await expect(page.getByTestId("command-palette")).toHaveCount(0);

    await page.keyboard.press("Control+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await expect(page.getByTestId("command-palette-input")).toBeFocused();

    await page.getByTestId("command-palette-input").fill("trial");
    await expect(page.getByTestId("palette-item-trials")).toBeVisible();
    await expect(page.getByTestId("palette-item-doctor")).toHaveCount(0);

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/app\/trials$/);
    await expect(page.getByTestId("command-palette")).toHaveCount(0);

    if (await page.getByTestId("btn-open-palette").isVisible()) {
      await page.getByTestId("btn-open-palette").click();
    } else {
      await page.keyboard.press("Control+k");
    }
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("command-palette")).toHaveCount(0);
  });

  test("theme command toggles dark mode", async ({ page }) => {
    await page.goto("/app/patient");
    await expect(page.getByTestId("zkclinic-app")).toBeVisible();
    await page.keyboard.press("Control+k");
    await page.getByTestId("palette-item-theme").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
