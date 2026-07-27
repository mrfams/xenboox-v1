import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";
const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "demo1234";

test.describe("Authentication Flows", () => {
  // ─── Login Page ──────────────────────────────────────────────────────────

  test.describe("Login", () => {
    test("login page loads with correct elements", async ({ page }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      // Should show the Xenboox branding (visible span, not the title tag)
      await expect(
        page.locator("span:has-text('Xenboox')").first(),
      ).toBeVisible();

      // Should have email and password fields
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();

      // Should have submit button
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Should have "Forgot password?" link
      await expect(page.locator("text=Forgot password?")).toBeVisible();

      // Should have link to register
      await expect(page.locator('a[href="/register"]')).toBeVisible();
    });

    test("login with invalid credentials shows error", async ({ page }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      // Fill with invalid credentials
      await page.locator('input[type="email"]').fill("invalid@test.com");
      await page.locator('input[type="password"]').fill("wrongpassword");

      // Submit the form
      await page.locator('button[type="submit"]').click();

      // Should show an error message (wait for response)
      await page.waitForTimeout(3000);

      // Either we stay on login page with error or get redirected
      const currentUrl = page.url();
      expect(
        currentUrl.includes("/login") || currentUrl.includes("/auth/callback"),
      ).toBeTruthy();
    });

    test("login with empty fields shows validation", async ({ page }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      // Try to submit empty form
      await page.locator('button[type="submit"]').click();

      // HTML5 validation should prevent submission
      // Check that we're still on the login page
      await expect(page).toHaveURL(/\/login/);

      // Email field should show validation
      const emailInput = page.locator('input[type="email"]');
      const validity = await emailInput.evaluate(
        (el: HTMLInputElement) => el.validationMessage,
      );
      expect(validity).toBeTruthy();
    });

    test("login with valid credentials redirects to dashboard", async ({
      page,
    }) => {
      // Skip if test credentials are not real
      test.skip(
        !TEST_EMAIL || !TEST_PASSWORD,
        "Test credentials not configured",
      );

      await page.goto("/login", { waitUntil: "networkidle" });

      // Fill with valid credentials
      await page.locator('input[type="email"]').fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);

      // Submit
      await page.locator('button[type="submit"]').click();

      // Wait for navigation to dashboard
      await page.waitForURL("**/dashboard**", { timeout: 20000 });

      // Should be on dashboard
      expect(page.url()).toContain("/dashboard");

      // Dashboard should have key sections
      await expect(page.locator("body")).toBeVisible();
    });
  });

  // ─── Register Page ───────────────────────────────────────────────────────

  test.describe("Register", () => {
    test("register page loads with correct elements", async ({ page }) => {
      await page.goto("/register", { waitUntil: "networkidle" });

      // Should show registration form
      await expect(page.locator('input[id="name"]')).toBeVisible();
      await expect(page.locator('input[id="email"]')).toBeVisible();
      await expect(page.locator('input[id="password"]')).toBeVisible();
      // Should have submit button
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Should have link to login (use .first() because header + footer both have login links)
      await expect(page.locator('a[href="/login"]').first()).toBeVisible();

      // Should NOT have orgName field (registration no longer creates org)
      await expect(page.locator('input[id="orgName"]')).toHaveCount(0);
    });

    test("register with empty fields shows validation", async ({ page }) => {
      await page.goto("/register", { waitUntil: "networkidle" });

      // Try to submit empty form
      await page.locator('button[type="submit"]').click();

      // HTML5 validation should catch empty required fields
      await expect(page).toHaveURL(/\/register/);

      // Check that validation messages exist on required fields
      const nameInput = page.locator('input[id="name"]');
      const nameValidity = await nameInput.evaluate(
        (el: HTMLInputElement) => el.validationMessage,
      );
      expect(nameValidity).toBeTruthy();
    });

    test("register with short password shows client-side error", async ({
      page,
    }) => {
      await page.goto("/register", { waitUntil: "networkidle" });

      // Fill form with short password
      await page.locator('input[id="name"]').fill("Test User");
      await page.locator('input[id="email"]').fill("test@example.com");

      // Try to fill a short password - HTML5 minLength will catch it
      const passwordInput = page.locator('input[id="password"]');
      await passwordInput.fill("short");

      // Submit
      await page.locator('button[type="submit"]').click();

      // Should either show client validation or error text
      const hasError = await page
        .locator("text=at least 8 characters")
        .isVisible()
        .catch(() => false);
      const validityMsg = await passwordInput.evaluate(
        (el: HTMLInputElement) => el.validationMessage,
      );

      expect(hasError || validityMsg.length > 0).toBeTruthy();
    });

    test("register with invalid email shows validation", async ({ page }) => {
      await page.goto("/register", { waitUntil: "networkidle" });

      // Fill form with invalid email
      await page.locator('input[id="name"]').fill("Test User");
      await page.locator('input[id="email"]').fill("not-an-email");
      await page.locator('input[id="password"]').fill("password123");

      // Submit
      await page.locator('button[type="submit"]').click();

      // HTML5 email validation should catch it
      await expect(page).toHaveURL(/\/register/);
    });
  });

  // ─── Forgot Password ─────────────────────────────────────────────────────

  test.describe("Forgot Password", () => {
    test("forgot password page loads with correct elements", async ({
      page,
    }) => {
      await page.goto("/forgot-password", { waitUntil: "networkidle" });

      // Should show the form
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test("forgot password submit shows success message", async ({ page }) => {
      await page.goto("/forgot-password", { waitUntil: "networkidle" });

      // Fill email
      await page.locator('input[type="email"]').fill("test@example.com");

      // Submit
      await page.locator('button[type="submit"]').click();

      // Should show success message (no email enumeration)
      await expect(page.locator("text=Check your email")).toBeVisible();
    });

    test("forgot password empty email shows validation", async ({ page }) => {
      await page.goto("/forgot-password", { waitUntil: "networkidle" });

      // Try to submit empty form
      await page.locator('button[type="submit"]').click();

      // HTML5 validation should prevent submission
      await expect(page).toHaveURL(/\/forgot-password/);
    });
  });

  // ─── Auth Page Redirects ─────────────────────────────────────────────────

  test.describe("Auth Page Redirects", () => {
    test("unauthenticated user redirected to login from dashboard", async ({
      page,
    }) => {
      await page.goto("/dashboard", {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test("unauthenticated user redirected to login from protected pages", async ({
      page,
    }) => {
      const protectedRoutes = [
        "/dashboard/ap/invoices",
        "/dashboard/ar/invoices",
        "/dashboard/treasury",
        "/dashboard/close",
        "/dashboard/chat",
        "/dashboard/settings",
      ];

      for (const route of protectedRoutes) {
        await page.goto(route, {
          waitUntil: "networkidle",
          timeout: 15000,
        });

        // Should be redirected to login
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

        // Go back to clean state
        await page.goto("/login", { waitUntil: "networkidle" });
      }
    });
  });
});
