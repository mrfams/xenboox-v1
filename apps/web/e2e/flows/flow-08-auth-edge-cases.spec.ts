/**
 * W.F08 — Auth Edge Cases & Security Flows
 *
 * Tests authentication boundaries: logout, session expiry,
 * protected route enforcement, error pages, APIs.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";

test.describe("W.F08 Auth & Security Edge Cases", () => {
  test("08.01 404 page renders for non-existent route", async ({ page }) => {
    const response = await page.goto(
      "/this-route-definitely-does-not-exist-xyz",
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.status()).toBe(200);
    const bodyText = await page.locator("body").textContent();
    const hasNotFound = /not.?found|404|missing/i.test(bodyText ?? "");
    expect(hasNotFound).toBeTruthy();
  });

  test("08.02 protected route redirects to login", async ({ page }) => {
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("08.03 admin route redirects to admin login", async ({ page }) => {
    // Admin routes are gated by a separate admin session and redirect to
    // /admin-login (never the customer login) by design.
    await page.goto("/admin", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await expect(page).toHaveURL(/\/admin-login/, { timeout: 10000 });
  });

  test("08.04 health endpoint returns 200", async ({ page }) => {
    const response = await page.goto("/api/health", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);
  });

  test("08.05 forgot password shows success for valid email", async ({
    page,
  }) => {
    await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=Check your email")).toBeVisible({
      timeout: 10000,
    });
  });

  test("08.06 XSS payloads don't break login page", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const payloads = [
      '<script>alert("xss")</script>',
      '"><script>alert(1)</script>',
      "'; DROP TABLE users; --",
    ];
    for (const payload of payloads) {
      await page.locator('input[type="email"]').fill(payload);
      await page.locator('input[type="password"]').fill("password123");
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("08.07 unauthenticated tRPC endpoint hides data", async ({ page }) => {
    const response = await page.goto("/api/trpc/ar.listInvoices", {
      waitUntil: "domcontentloaded",
    });
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("invoices");
  });
});
