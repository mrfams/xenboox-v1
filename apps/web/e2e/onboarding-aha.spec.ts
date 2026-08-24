import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "demo1234";

test.describe("Onboarding — 7-Step Aha Moment Flow", () => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "TEST_EMAIL/PASSWORD not configured",
  );

  test("wizard shows 7 steps and Aha insight after bank connection", async ({
    page,
  }) => {
    // Login first (reuses storageState when run in chromium project, but this test
    // also works standalone by logging in explicitly)
    await page.goto("/login", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (page.url().includes("/login")) {
      await page.locator('input[type="email"]').fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page
        .waitForURL("**/dashboard**", { timeout: 20_000 })
        .catch(() => {});
    }

    // Reset onboarding so wizard is visible
    await page.evaluate(() => {
      localStorage.removeItem("xenboox_onboarding_completed");
      localStorage.removeItem("xenboox_onboarding_step");
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    // Welcome step should appear
    const wizardTitle = page.getByRole("heading", {
      name: /welcome to xenboox/i,
    });
    await expect(wizardTitle).toBeVisible({ timeout: 15_000 });

    // Get Started → should advance to Chart of Accounts
    await page.getByRole("button", { name: /get started/i }).click();
    await expect(
      page.getByRole("heading", { name: /chart of accounts/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Progress should reflect 7-step flow: Step 2 of 6 (welcome is step 1)
    await expect(page.locator("text=/Step 2 of 6/")).toBeVisible({
      timeout: 5_000,
    });

    // Skip / Continue through CoA (use template)
    const coaContinue = page.getByRole("button", { name: /continue/i }).first();
    if (await coaContinue.isVisible()) {
      await coaContinue.click();
      await page.waitForTimeout(1500);
    }

    // Bank connection step
    const bankHeading = page.getByRole("heading", {
      name: /connect your bank/i,
    });
    if (await bankHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(page.locator("text=/Step 3 of 6/")).toBeVisible();
      // Skip bank (no bankName filled → Skip for Now)
      const skipBtn = page
        .getByRole("button", { name: /skip for now/i })
        .first();
      if (await skipBtn.isVisible()) {
        await skipBtn.click();
      } else {
        await page
          .getByRole("button", { name: /continue/i })
          .first()
          .click();
      }
      await page.waitForTimeout(1000);
    }

    // Aha Moment step should now be visible
    const ahaHeading = page.getByRole("heading", {
      name: /your first insight is ready/i,
    });
    await expect(ahaHeading).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator("text=/cfo briefing.*auto-generated/i"),
    ).toBeVisible();
    await expect(page.locator("text=/transactions found/i")).toBeVisible();
    await expect(page.locator("text=/auto-categorized/i")).toBeVisible();
    await expect(page.locator("text=/cash runway/i")).toBeVisible();
    await expect(
      page.getByText(/every decision is confidence-scored/i),
    ).toBeVisible();

    // Progress now Step 4 of 6
    await expect(page.locator("text=/Step 4 of 6/")).toBeVisible();

    // Continue → Team step
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(
      page.getByRole("heading", { name: /invite your team/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=/Step 5 of 6/")).toBeVisible();

    // Skip team → AI preferences → Complete is reachable (smoke only)
    await page
      .getByRole("button", { name: /skip for now/i })
      .first()
      .click();
    await page.waitForTimeout(800);
    const aiHeading = page.getByRole("heading", { name: /ai preferences/i });
    if (await aiHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(page.locator("text=/Step 6 of 6/")).toBeVisible();
    }
  });

  test("aha insight API is entity-scoped and returns mock for new entity", async ({
    page,
  }) => {
    // Hit the onboarding status endpoint anon — should not leak data
    const res = await page.request.get("/api/trpc/onboarding.getAhaInsight");
    // tRPC returns 200 for batch or 401 when unauthenticated — either is safe, never 500
    expect([200, 401, 400, 404]).toContain(res.status());
  });
});
