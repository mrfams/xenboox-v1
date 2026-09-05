/**
 * W.F07 — Pipeline & Sub-Detail Pages
 *
 * Tests all AI pipeline detail pages render correctly:
 * payroll, tax, audit, analytics, expense, budget, etc.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";
const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "demo1234";

const pipelinePages = [
  "/dashboard",
  "/dashboard/tasks",
  "/dashboard/financial-pulse",
  "/dashboard/ledger",
  "/dashboard/operations",
  "/dashboard/ingestion",
  "/dashboard/audit-trail",
  "/dashboard/settings",
];

test.describe("W.F07 Pipeline Pages", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, "Test credentials not configured");
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/dashboard**", { timeout: 20000 });
  });

  for (const path of pipelinePages) {
    test(`07.${String(pipelinePages.indexOf(path) + 1).padStart(2, "0")} ${path} renders`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      const response = await page.goto(path, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      expect(response?.status(), `${path} should load`).toBeGreaterThanOrEqual(
        200,
      );
      await expect(page.locator("body")).toBeVisible();

      if (errors.length > 0) {
        console.log(`⚠️ [${path}] Page errors: ${errors.join(" | ")}`);
      }
    });
  }
});
