import { test, expect } from "@playwright/test";

test.describe("Visual & UX Testing", () => {
  // ─── Loading States ──────────────────────────────────────────────────────

  test.describe("Loading States", () => {
    test("marketing pages show content without loading flicker", async ({
      page,
    }) => {
      // Home page should render content immediately
      const startTime = Date.now();
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const loadTime = Date.now() - startTime;

      // Content should be visible
      await expect(page.locator("h1")).toBeVisible({ timeout: 5000 });

      // Should load within a reasonable time
      expect(loadTime).toBeLessThan(10000);
    });

    test("login page loads within acceptable time", async ({ page }) => {
      const startTime = Date.now();
      await page.goto("/login", { waitUntil: "networkidle" });
      const loadTime = Date.now() - startTime;

      // Form should be visible
      await expect(page.locator('input[type="email"]')).toBeVisible();

      // Network idle should happen quickly
      expect(loadTime).toBeLessThan(15000);
    });
  });

  // ─── Responsive Design ───────────────────────────────────────────────────

  test.describe("Responsive Layout", () => {
    test("desktop layout renders correctly", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/", { waitUntil: "networkidle" });

      // Hero section should have full content visible
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=Start Free").first()).toBeVisible();
      await expect(page.locator("text=See how it works").first()).toBeVisible();
    });

    test("tablet layout is functional", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/", { waitUntil: "networkidle" });

      // Content should be visible at tablet size
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=Start Free").first()).toBeVisible();
    });

    test("mobile layout is functional", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/", { waitUntil: "networkidle" });

      // Content should be visible at mobile size
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=Start Free").first()).toBeVisible();
    });

    test("mobile layout shows login page correctly", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/login", { waitUntil: "networkidle" });

      // Form inputs should be usable on mobile
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });

  // ─── Visual Elements ─────────────────────────────────────────────────────

  test.describe("Visual Elements", () => {
    test("navigation links on landing page work correctly", async ({
      page,
    }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      // Click "Start Free" CTA button — hero CTA routes to /onboarding, which
      // requires auth, so unauthenticated visitors are redirected to /login.
      await page.locator("text=Start Free").first().click();
      await page.waitForURL(/\/(register|onboarding|login)\b/, {
        timeout: 10000,
      });
      await expect(page.locator("body")).toBeVisible();
    });

    test("favicon and meta tags are present", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      // Check meta viewport tag
      const viewportMeta = page.locator('meta[name="viewport"]');
      await expect(viewportMeta).toHaveAttribute(
        "content",
        /width=device-width/,
      );

      // Check title
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    test("keyboard navigation works on login form", async ({ page }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      // Tab through form elements
      await page.keyboard.press("Tab");
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();

      // Keep tabbing until the submit button receives focus (order may include
      // the logo link before the form fields, so walk the full tab order).
      let submitFocused = false;
      for (let i = 0; i < 8; i++) {
        const tag = await page.evaluate(
          () =>
            document.activeElement?.getAttribute("type") ??
            document.activeElement?.tagName ??
            "",
        );
        if (tag === "submit") {
          submitFocused = true;
          break;
        }
        await page.keyboard.press("Tab");
      }
      expect(submitFocused).toBeTruthy();
    });

    test("images have alt attributes", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      // Check all images have alt text
      const images = page.locator("img");
      const count = await images.count();
      for (let i = 0; i < count; i++) {
        const alt = await images.nth(i).getAttribute("alt");
        // Allow decorative images with empty alt
        expect(alt).not.toBeNull();
      }
    });
  });

  // ─── Empty States ────────────────────────────────────────────────────────

  test.describe("Empty States", () => {
    test("login page shows proper empty state", async ({ page }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      // Input fields should be empty initially
      const emailValue = await page.locator('input[type="email"]').inputValue();
      expect(emailValue).toBe("");

      const passwordValue = await page
        .locator('input[type="password"]')
        .inputValue();
      expect(passwordValue).toBe("");
    });
  });
});
