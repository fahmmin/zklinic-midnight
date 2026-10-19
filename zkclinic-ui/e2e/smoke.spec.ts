import { test, expect } from "@playwright/test";

test.describe("ZKClinic UI (app shell)", () => {
  test("landing: marketing shell, then app after launch", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("landing-page")).toBeVisible();
    await expect(page.getByTestId("nav-launch-app")).toBeVisible();

    await page.getByTestId("nav-launch-app").click();
    await expect(page).toHaveURL(/\/app\/patient$/);
    await expect(page.getByTestId("zkclinic-app")).toBeVisible();
    await expect(page.getByTestId("brand-title")).toContainText("ZK");
    await expect(page.getByTestId("app-architecture")).toBeVisible();
    await expect(page.getByTestId("hero-lead")).toBeVisible();
    await expect(page.getByTestId("btn-connect")).toBeVisible();
    await expect(page.getByTestId("footer")).toContainText("Midnight");
    await page.screenshot({ path: "test-results/screenshots/01-landing.png", fullPage: true });
  });

  test("tabs: patient default, doctor, trials, contract gates", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-launch-app").click();
    await expect(page.getByTestId("tab-patient")).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("patient-gate")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/02-patient-tab.png", fullPage: true });

    await page.getByTestId("tab-trials").click();
    await expect(page.getByTestId("trial-manager-gate")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/06-trials-tab.png", fullPage: true });

    await page.getByTestId("tab-doctor").click();
    await expect(page.getByTestId("doctor-gate")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/03-doctor-tab.png", fullPage: true });

    await page.getByTestId("tab-contract").click();
    await expect(page.getByTestId("section-contract-gate")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/04-contract-tab.png", fullPage: true });

    await page.getByTestId("tab-patient").click();
    await expect(page.getByTestId("patient-gate")).toBeVisible();
  });

  test("screenshot: header strip (review)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-launch-app").click();
    const header = page.locator("header.zk-header");
    await expect(header).toBeVisible();
    await header.screenshot({ path: "test-results/screenshots/05-header-strip.png" });
  });
});
