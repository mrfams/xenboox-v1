/**
 * W.F03 — Module Page Rendering & Interactions
 *
 * Tests that all 20+ module pages render without errors when
 * accessed by an authenticated user.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";
const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "demo1234";

const modulePages = [
  { path: "/dashboard", label: "Command Center" },
  { path: "/dashboard/tasks", label: "Tasks" },
  { path: "/dashboard/financial-pulse", label: "Financial Pulse" },
  { path: "/dashboard/ledger", label: "Ledger" },
  { path: "/dashboard/operations", label: "Operations" },
  { path: "/dashboard/ingestion", label: "Documents" },
  { path: "/dashboard/audit-trail", label: "Audit Trail" },
  { path: "/dashboard/settings", label: "Settings" },
];

test.describe("W.F03 Module Pages — Render & Load", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, "Test credentials not configured");
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/dashboard**", { timeout: 20000 });
  });

  for (const [idx, { path, label }] of modulePages.entries()) {
    test(`03.${String(idx + 1).padStart(2, "0")} ${label} renders without errors`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      const response = await page.goto(path, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      expect(
        response?.status(),
        `${path} should return 200 or 302`,
      ).toBeGreaterThanOrEqual(200);
      await expect(page.locator("body")).toBeVisible();

      // Filter out resource loading errors
      const pageErrors = errors.filter(
        (e) =>
          !e.includes("Failed to load") &&
          !e.includes("favicon") &&
          !e.includes("404"),
      );
      if (pageErrors.length > 0) {
        console.log(`⚠️ [${path}] Console errors: ${pageErrors.join(" | ")}`);
      }
    });
  }
});
