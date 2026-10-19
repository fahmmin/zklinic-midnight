import { test, expect } from "@playwright/test";

test.describe("Mobile layout", () => {
  test("app shell and patient view usable on narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByTestId("nav-launch-app").click();
    await expect(page.getByTestId("zkclinic-app")).toBeVisible();
    await page.getByTestId("tab-patient").click();
    await expect(page.getByTestId("patient-view")).toBeVisible();
    await expect(page.getByTestId("patient-gate")).toBeVisible();
  });
});
