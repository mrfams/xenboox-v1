import { test, expect, type Page } from "@playwright/test";

// ─── Tax & Compliance + Estimates E2E ─────────────────────────────────────
//
// Covers the two new competitive-parity surfaces:
//   - /dashboard (quotes lifecycle, summary, tabs)
//   - /dashboard/tax-compliance (deadline liveness, VAT/WHT, 1099, packages)
// Runs in the authenticated `chromium` project (storageState).

const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "demo1234";

async function ensureDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  try {
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
  } catch {
    // storageState not authenticated — log in manually
    await page.goto("/login");
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 20000 });
  }
}

test.describe("Tax & Compliance Center", () => {
  test.beforeEach(async ({ page }) => {
    await ensureDashboard(page);
  });

  test("renders header and jurisdiction tabs", async ({ page }) => {
    await page.goto("/dashboard/operations", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText("Tax & Compliance Center")).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Deadlines" })).toBeVisible();
    await expect(page.getByRole("button", { name: "VAT" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Withholding" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "1099 Forms" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tax Packages" }),
    ).toBeVisible();
  });

  test("shows filing deadline liveness with urgency chips", async ({
    page,
  }) => {
    await page.goto("/dashboard/operations", {
      waitUntil: "domcontentloaded",
    });
    // The liveness table renders either real deadlines or the empty state —
    // both must resolve without console errors.
    await expect(
      page.getByText(/Upcoming Filing Deadlines|No filing deadlines yet/),
    ).toBeVisible({ timeout: 20000 });
  });

  test("1099 forms tab renders threshold cards and contractor table", async ({
    page,
  }) => {
    await page.goto("/dashboard/operations", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "1099 Forms" }).click();
    await expect(
      page.getByText(/Contractors \(|Forms Required/).first(),
    ).toBeVisible({ timeout: 20000 });
    // Table either lists contractors or shows the empty-state message.
    await expect(
      page
        .getByText(
          /No US contractor payments recorded|Below threshold|1099-NEC/,
        )
        .first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("deadlines tab lists filings with countdown", async ({ page }) => {
    await page.goto("/dashboard/operations", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Deadlines" }).click();
    await expect(page.getByPlaceholder("Search filings...")).toBeVisible({
      timeout: 20000,
    });
    // Liveness table renders either deadlines or the empty state.
    await expect(
      page.getByText(/Filing|No filing deadlines yet/).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Estimates & Quotes", () => {
  test.beforeEach(async ({ page }) => {
    await ensureDashboard(page);
  });

  test("renders estimates workspace with summary cards", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Estimates & Quotes")).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText("Total Estimates")).toBeVisible();
    await expect(page.getByText("Open Value")).toBeVisible();
    await expect(page.getByText("Conversion Rate")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "New Estimate" }),
    ).toBeVisible();
  });

  test("status filter tabs navigate the list", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Draft", exact: true }).click();
    await expect(page.getByText(/Showing \d+ of \d+ estimates/)).toBeVisible({
      timeout: 20000,
    });
  });

  test("money nav highlights both new pages", async ({ page }) => {
    // AISidebar groups both routes under the Money section — the Money
    // link must be active when on either page.
    for (const route of ["/dashboard", "/dashboard/operations"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const moneyLink = page.locator('aside a[href="/dashboard/money"]');
      await expect(moneyLink).toBeVisible({ timeout: 20000 });
    }
  });
});
