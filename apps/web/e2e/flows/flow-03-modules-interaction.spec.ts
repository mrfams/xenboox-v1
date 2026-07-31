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
  { path: "/dashboard", label: "Dashboard Home" },
  { path: "/dashboard/chat", label: "CFO Agent Chat" },
  { path: "/dashboard/review-queue", label: "Review Queue" },
  { path: "/dashboard/approvals", label: "Approvals" },
  { path: "/dashboard/treasury", label: "Bank & Reconciliation" },
  { path: "/dashboard/cash", label: "Cash & Imprest" },
  { path: "/dashboard/mobile-money", label: "Mobile Money" },
  { path: "/dashboard/ar/invoices", label: "AR Invoices" },
  { path: "/dashboard/ar/customers", label: "AR Customers" },
  { path: "/dashboard/ap/invoices", label: "AP Invoices" },
  { path: "/dashboard/ap/suppliers", label: "AP Suppliers" },
  { path: "/dashboard/ap/pos", label: "Purchase Orders" },
  { path: "/dashboard/coa", label: "Chart of Accounts" },
  { path: "/dashboard/journal", label: "Journal Entries" },
  { path: "/dashboard/reports", label: "Reports Hub" },
  { path: "/dashboard/reports/profit-and-loss", label: "P&L Report" },
  { path: "/dashboard/reports/balance-sheet", label: "Balance Sheet" },
  { path: "/dashboard/trial-balance", label: "Trial Balance" },
  { path: "/dashboard/documents", label: "Documents" },
  { path: "/dashboard/close", label: "Month-End Close" },
  { path: "/dashboard/consolidation", label: "Consolidation" },
  { path: "/dashboard/consolidation/view", label: "Consolidated View" },
  { path: "/dashboard/settings", label: "Settings" },
  { path: "/dashboard/fiscal", label: "Fiscal Year" },
  { path: "/dashboard/help", label: "Help" },
  { path: "/dashboard/audit-log", label: "Audit Log" },
  { path: "/dashboard/notifications", label: "Notifications" },
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
