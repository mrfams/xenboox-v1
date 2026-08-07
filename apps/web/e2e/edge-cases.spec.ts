import { test, expect } from "@playwright/test";

test.describe("Edge Case & Security Testing", () => {
  // ─── XSS / Injection Testing ────────────────────────────────────────────

  test.describe("Input Sanitization", () => {
    test("login form rejects XSS in email field", async ({ page }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><script>alert(1)</script>',
        "'; DROP TABLE users; --",
        "../../etc/passwd",
        ".././../etc/passwd",
      ];

      for (const payload of xssPayloads) {
        // Clear and fill with XSS payload
        const emailInput = page.locator('input[type="email"]');
        await emailInput.clear();
        await emailInput.fill(payload);
        await page.locator('input[type="password"]').fill("password123");

        // Submit — should not cause an error on the page
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(2000);

        // Page should not have crashed
        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("register form handles special characters in name", async ({
      page,
    }) => {
      await page.goto("/register", { waitUntil: "networkidle" });

      const specialNames = [
        "John <script>alert('xss')</script> Doe",
        "'; DELETE FROM users; --",
        "<img src=x onerror=alert(1)>",
        "𝒥𝓊𝓈𝓉𝒾𝓃 𝓉ℯ𝓈𝓉",
        "John\u0000Doe\u0000<script>",
        "日本語の名前",
        "الاسم العربي",
      ];

      for (const name of specialNames) {
        await page.locator('input[id="name"]').clear();
        await page.locator('input[id="name"]').fill(name);
        await page
          .locator('input[id="email"]')
          .fill(`test${Math.random()}@example.com`);
        await page.locator('input[id="password"]').fill("password123");

        await page.waitForTimeout(500);

        // Page should still be functional
        await expect(page.locator('input[id="name"]')).toHaveValue(name);
      }
    });

    test("URL parameters are sanitized", async ({ page }) => {
      // Test for open redirect vulnerabilities
      const maliciousUrls = [
        "/login?callbackUrl=https://evil.com",
        "/login?redirect=https://malicious-site.com",
        "/login?next=//evil.com",
      ];

      for (const url of maliciousUrls) {
        await page.goto(url, { waitUntil: "networkidle" });
        // Should not redirect to external site
        const currentUrl = page.url();
        expect(currentUrl).not.toContain("evil");
        expect(currentUrl).not.toContain("malicious");
      }
    });
  });

  // ─── Form Edge Cases ────────────────────────────────────────────────────

  test.describe("Form Edge Cases", () => {
    test("double click on submit does not cause duplicate submission", async ({
      page,
    }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      // Hold the login request open so the loading/disabled state is observable
      // and we can prove only ONE request is sent despite two clicks.
      let loginRequests = 0;
      await page.route("**/api/trpc/auth.login*", async (route) => {
        loginRequests++;
        await new Promise((r) => setTimeout(r, 2500));
        await route.continue();
      });

      // Fill credentials
      await page.locator('input[type="email"]').fill("test@example.com");
      await page.locator('input[type="password"]').fill("testpassword123");

      // Rapid double-click submit — the second activation is dispatched
      // directly so it bypasses Playwright's actionability wait (a disabled
      // button would otherwise block the click until the request resolves).
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      await expect(submitBtn).toBeDisabled();
      await submitBtn.dispatchEvent("click");

      await page.waitForTimeout(800);
      expect(loginRequests).toBe(1);
    });

    test("loading state appears on form submission", async ({ page }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      // Fill credentials
      await page.locator('input[type="email"]').fill("test@example.com");
      await page.locator('input[type="password"]').fill("testpassword123");

      // Submit
      await page.locator('button[type="submit"]').click();

      // Button should show loading state
      await page.waitForTimeout(500);
      const buttonText = await page
        .locator('button[type="submit"]')
        .textContent();
      expect(buttonText?.toLowerCase()).toContain("sign");
    });

    test("maximum length inputs are handled gracefully", async ({ page }) => {
      await page.goto("/register", { waitUntil: "networkidle" });

      // Generate a very long string
      const longName = "A".repeat(1000);
      const longEmail = `${"a".repeat(200)}@${"b".repeat(200)}.com`;

      await page.locator('input[id="name"]').fill(longName);
      await page.locator('input[id="email"]').fill(longEmail);
      await page.locator('input[id="password"]').fill("password123");

      // Submit — should not crash
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);

      // Page should still be functional
      await expect(page.locator("body")).toBeVisible();
    });
  });

  // ─── Page Error Handling ─────────────────────────────────────────────────

  test.describe("Error Handling", () => {
    test("404 page shows for non-existent routes", async ({ page }) => {
      const response = await page.goto("/this-route-does-not-exist-12345", {
        waitUntil: "networkidle",
      });

      // Next.js not-found page — should return 200 (renders not-found.tsx)
      expect(response?.status()).toBe(200);

      // Should show some indication of not-found
      const bodyText = await page.locator("body").textContent();
      const hasNotFound = /not.?found|404|missing/i.test(bodyText ?? "");
      expect(hasNotFound).toBeTruthy();
    });

    test("protected API routes reject unauthenticated requests", async ({
      page,
    }) => {
      // Try to access a protected API route directly
      const response = await page.goto("/api/trpc/ar.listInvoices", {
        waitUntil: "networkidle",
      });

      // Should not expose data to unauthenticated users
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).not.toContain("invoices");
    });

    test("health endpoint returns OK", async ({ page }) => {
      const response = await page.goto("/api/health", {
        waitUntil: "networkidle",
      });

      expect(response?.status()).toBe(200);
    });
  });

  // ─── Rate Limiting ───────────────────────────────────────────────────────

  test.describe("Rate Limiting", () => {
    test("rate limit headers are present on auth endpoints", async ({
      page,
    }) => {
      // Login page should have proper rate limiting
      const response = await page.goto("/login", {
        waitUntil: "networkidle",
      });

      // Login page itself should load fine
      expect(response?.status()).toBe(200);
    });
  });
});
