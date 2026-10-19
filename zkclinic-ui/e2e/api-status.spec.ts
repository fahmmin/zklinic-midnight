import { test, expect } from "@playwright/test";

test.describe("API status pill", () => {
  test("shows online when /health answers", async ({ page }) => {
    await page.route("**/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ ok: true })
      })
    );
    await page.goto("/app/patient");
    await expect(page.getByTestId("zkclinic-app")).toBeVisible();
    // The pill is hidden on narrow viewports by design.
    test.skip((page.viewportSize()?.width ?? 0) <= 720, "badge hidden on mobile");
    await expect(page.getByTestId("api-status")).toContainText("online");
  });

  test("shows waking up when /health fails", async ({ page }) => {
    await page.route("**/health", (route) => route.abort());
    await page.goto("/app/patient");
    await expect(page.getByTestId("zkclinic-app")).toBeVisible();
    test.skip((page.viewportSize()?.width ?? 0) <= 720, "badge hidden on mobile");
    await expect(page.getByTestId("api-status")).toContainText("waking up");
  });
});
