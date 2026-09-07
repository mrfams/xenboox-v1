import { test, expect } from "@playwright/test";

/**
 * Onboarding gate — server-authoritative (user_settings.onboarding).
 *
 * Regression coverage for the production incident where the AI onboarding
 * agent popped up for already-set-up accounts and Skip didn't persist:
 *  - a brand-new account MUST see the onboarding agent (first run)
 *  - Skip MUST close the gate durably (server-side), surviving reloads
 *  - an already-set-up account MUST NOT see the wizard
 *
 * No localStorage seeding is involved anywhere: the gate reads the database,
 * so state is identical on every device.
 */

const STAMP = Date.now();
const testUser = {
  name: `E2E Onboarding ${STAMP}`,
  email: `e2e-onboarding-${STAMP}@xenboox.test`,
  password: "TestPassword123!",
  orgName: `E2E Onboarding Org ${STAMP}`,
};

const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "demo1234";

async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  if (page.url().includes("/login")) {
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page
      .waitForURL("**/dashboard**", { timeout: 20_000 })
      .catch(() => {});
  }
}

test.describe("Onboarding gate — server-authoritative", () => {
  test("first-run account sees the AI onboarding agent; Skip closes it durably", async ({
    page,
  }) => {
    // A first-run state can only come from a first-run account — register one.
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await page.locator('input[id="name"]').fill(testUser.name);
    await page.locator('input[id="email"]').fill(testUser.email);
    await page.locator('input[id="password"]').fill(testUser.password);
    await page.locator('input[id="orgName"]').fill(testUser.orgName);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(dashboard|welcome|onboarding)/, {
      timeout: 30_000,
    });

    // The AI onboarding agent is a modal on the dashboard.
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const wizard = page.getByRole("dialog", { name: /onboarding/i });
    await expect(wizard).toBeVisible({ timeout: 15_000 });

    // Skip setup → gate closes and persists SERVER-side.
    await wizard.getByRole("button", { name: /skip/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await expect(wizard).not.toBeVisible({ timeout: 10_000 });

    // Reload — the gate must STAY closed (nothing was stored in the browser).
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("dialog", { name: /onboarding/i }),
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("already-set-up account never sees the wizard", async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASSWORD);
    if (page.url().includes("/login")) {
      test.skip(true, "demo credentials not configured in this environment");
    }

    await expect(
      page.getByRole("dialog", { name: /onboarding/i }),
    ).not.toBeVisible({ timeout: 10_000 });
  });
});
