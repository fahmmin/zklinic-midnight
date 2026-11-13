import { test, expect } from "@playwright/test";

test.describe("Patient health card", () => {
  test("patient gate and guided banner visible in app", async ({ page }) => {
    await page.goto("/app/patient?demo=1");
    await page.getByTestId("explain-details").locator("summary").click();
    await expect(page.getByTestId("guided-flow-banner")).toBeVisible();
    await page.getByTestId("tab-patient").click();
    await expect(page.getByTestId("patient-gate")).toBeVisible();
  });

  test("patient tab shows no-credentials empty state", async ({ page }) => {
    await page.goto("/app/patient?demo=1");
    await page.getByTestId("tab-patient").click();
    await page.getByTestId("step-tab-3").click();
    await expect(page.getByTestId("patient-no-credentials")).toBeVisible();
  });
});
