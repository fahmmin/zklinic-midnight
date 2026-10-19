import { test, expect } from "@playwright/test";

test.describe("Patient health card", () => {
  test("patient gate and guided banner visible in app", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-launch-app").click();
    await expect(page.getByTestId("guided-flow-banner")).toBeVisible();
    await page.getByTestId("tab-patient").click();
    await expect(page.getByTestId("patient-gate")).toBeVisible();
  });

  test("patient tab shows no-credentials empty state", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-launch-app").click();
    await page.getByTestId("tab-patient").click();
    await expect(page.getByTestId("patient-no-credentials")).toBeVisible();
  });
});
