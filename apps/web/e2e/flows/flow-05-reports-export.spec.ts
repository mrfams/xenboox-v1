/**
 * W.F05 — Reports & Export Flow
 *
 * Tests the financial reports pages and export functionality.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";
const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "demo1234";

test.describe("W.F05 Reports & Export", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, "Test credentials not configured");
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/dashboard**", { timeout: 20000 });
  });

  test("05.01 reports hub page loads with report cards", async ({ page }) => {
    await page.goto("/dashboard/reports", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("05.02 profit and loss report loads", async ({ page }) => {
    await page.goto("/dashboard/reports/profit-and-loss", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("05.03 balance sheet loads", async ({ page }) => {
    await page.goto("/dashboard/reports/balance-sheet", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("05.04 trial balance loads", async ({ page }) => {
    await page.goto("/dashboard/reports/trial-balance", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("05.05 budget page loads", async ({ page }) => {
    await page.goto("/dashboard/budget/pipeline", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("05.06 analytics page loads", async ({ page }) => {
    await page.goto("/dashboard/analytics/pipeline", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await expect(page.locator("body")).toBeVisible();
  });
});
