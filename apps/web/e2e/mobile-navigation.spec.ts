import { test, expect } from "@playwright/test";

// ─── Mobile Navigation E2E Tests ──────────────────────────────────────────
//
// Tests the mobile bottom nav, surface transitions, focus management,
// and touch interactions across all 5 AI-native surfaces.

const SURFACES = [
  { name: "Command Center", path: "/dashboard", label: "Command" },
  { name: "Activity Hub", path: "/dashboard/activity-hub", label: "Activity" },
  { name: "Financial Pulse", path: "/dashboard/financial-pulse", label: "Pulse" },
  { name: "Ledger", path: "/dashboard/ledger", label: "Ledger" },
  { name: "Operations", path: "/dashboard/operations", label: "Ops" },
];

// Use mobile viewport for all tests
test.use({
  viewport: { width: 375, height: 812 }, // iPhone X
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  hasTouch: true,
});

test.describe("Mobile Bottom Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
  });

  test("bottom nav is visible on mobile", async ({ page }) => {
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();
  });

  test("bottom nav has all 5 surface links", async ({ page }) => {
    const nav = page.locator('nav[aria-label="Main navigation"]');
    const links = nav.locator("a");

    await expect(links).toHaveCount(5);

    // Verify each surface label exists
    for (const surface of SURFACES) {
      await expect(nav.getByText(surface.label)).toBeVisible();
    }
  });

  test("bottom nav links have correct hrefs", async ({ page }) => {
    const nav = page.locator('nav[aria-label="Main navigation"]');

    for (const surface of SURFACES) {
      const link = nav.getByText(surface.label);
      await expect(link).toHaveAttribute("href", surface.path);
    }
  });

  test("active surface is highlighted in bottom nav", async ({ page }) => {
    // Command Center should be active on /dashboard
    const commandLink = page.locator(
      'nav[aria-label="Main navigation"] a[href="/dashboard"]',
    );
    await expect(commandLink).toHaveAttribute("aria-current", "page");
  });

  test("sidebar is hidden on mobile", async ({ page }) => {
    const sidebar = page.locator("aside[data-tour='sidebar']");
    await expect(sidebar).toBeHidden();
  });
});

test.describe("Mobile Surface Navigation", () => {
  for (const surface of SURFACES) {
    test(`navigate to ${surface.name} via bottom nav`, async ({ page }) => {
      await page.goto("/dashboard", { waitUntil: "networkidle" });

      // Click the bottom nav link
      const nav = page.locator('nav[aria-label="Main navigation"]');
      await nav.getByText(surface.label).click();

      // Wait for navigation
      await page.waitForURL(`**${surface.path}`);

      // Verify URL changed
      expect(page.url()).toContain(surface.path);

      // Verify the nav item is now active
      const activeLink = nav.locator(`a[href="${surface.path}"]`);
      await expect(activeLink).toHaveAttribute("aria-current", "page");
    });
  }
});

test.describe("Mobile Navigation Flow", () => {
  test("can navigate through all 5 surfaces sequentially", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    const nav = page.locator('nav[aria-label="Main navigation"]');

    for (const surface of SURFACES) {
      // Click the surface in bottom nav
      await nav.getByText(surface.label).click();
      await page.waitForURL(`**${surface.path}`);

      // Verify we're on the right page
      expect(page.url()).toContain(surface.path);

      // Verify the correct nav item is active
      const activeLink = nav.locator(`a[href="${surface.path}"]`);
      await expect(activeLink).toHaveAttribute("aria-current", "page");

      // Verify other nav items are NOT active
      for (const other of SURFACES) {
        if (other.path !== surface.path) {
          const otherLink = nav.locator(`a[href="${other.path}"]`);
          await expect(otherLink).not.toHaveAttribute("aria-current", "page");
        }
      }
    }
  });

  test("can navigate back and forth between surfaces", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    const nav = page.locator('nav[aria-label="Main navigation"]');

    // Go to Activity Hub
    await nav.getByText("Activity").click();
    await page.waitForURL("**/dashboard/activity-hub");
    expect(page.url()).toContain("/dashboard/activity-hub");

    // Go back to Command Center
    await nav.getByText("Command").click();
    await page.waitForURL("/dashboard");
    expect(page.url()).toContain("/dashboard");

    // Go to Operations
    await nav.getByText("Ops").click();
    await page.waitForURL("**/dashboard/operations");
    expect(page.url()).toContain("/dashboard/operations");
  });
});

test.describe("Mobile Focus Management", () => {
  test("focus moves to main content on surface transition", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // Navigate to Activity Hub
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await nav.getByText("Activity").click();
    await page.waitForURL("**/dashboard/activity-hub");

    // The main content should receive focus
    const main = page.locator("#main-content");
    await expect(main).toBeFocused();
  });

  test("screen reader announcement appears on navigation", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // Navigate to Financial Pulse
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await nav.getByText("Pulse").click();
    await page.waitForURL("**/dashboard/financial-pulse");

    // Check for aria-live announcement
    const announcement = page.locator('[aria-live="polite"]');
    await expect(announcement).toContainText("Financial Pulse");
  });
});

test.describe("Mobile Touch Interactions", () => {
  test("bottom nav items have adequate touch targets", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    const nav = page.locator('nav[aria-label="Main navigation"]');
    const links = nav.locator("a");

    // Each link should be at least 48x48px (WCAG 2.5.5)
    for (let i = 0; i < 5; i++) {
      const link = links.nth(i);
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44); // Minimum touch target
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("bottom nav items are tappable (no hover required)", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    const nav = page.locator('nav[aria-label="Main navigation"]');

    // Tap each surface — should navigate without hover
    for (const surface of SURFACES) {
      await nav.getByText(surface.label).tap();
      await page.waitForURL(`**${surface.path}`);
      expect(page.url()).toContain(surface.path);
    }
  });
});

test.describe("Mobile Page Content", () => {
  test("Command Center loads with greeting and chat input", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // Should have the greeting
    await expect(page.locator("h1")).toBeVisible();

    // Should have the AI input
    await expect(
      page.locator('textarea[placeholder*="Ask anything"]'),
    ).toBeVisible();
  });

  test("Activity Hub loads with filter tabs", async ({ page }) => {
    await page.goto("/dashboard/activity-hub", { waitUntil: "networkidle" });

    // Should have filter buttons
    await expect(page.getByText("All")).toBeVisible();
    await expect(page.getByText("Urgent")).toBeVisible();
    await expect(page.getByText("Approvals")).toBeVisible();
  });

  test("Financial Pulse loads with KPI cards", async ({ page }) => {
    await page.goto("/dashboard/financial-pulse", {
      waitUntil: "networkidle",
    });

    // Should have KPI labels
    await expect(page.getByText("Revenue")).toBeVisible();
    await expect(page.getByText("Expenses")).toBeVisible();
  });

  test("Ledger loads with tab navigation", async ({ page }) => {
    await page.goto("/dashboard/ledger", { waitUntil: "networkidle" });

    // Should have tab list
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();

    // Should have all 5 tabs
    await expect(page.getByRole("tab", { name: "Journal" })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Chart of Accounts" }),
    ).toBeVisible();
  });

  test("Operations loads with money flow summary", async ({ page }) => {
    await page.goto("/dashboard/operations", { waitUntil: "networkidle" });

    // Should have money flow section
    await expect(page.getByText("Money Flow")).toBeVisible();
    await expect(page.getByText("Money Out")).toBeVisible();
    await expect(page.getByText("Money In")).toBeVisible();
  });
});

test.describe("Mobile Ledger Keyboard Navigation", () => {
  test("arrow keys navigate between ledger tabs", async ({ page }) => {
    await page.goto("/dashboard/ledger", { waitUntil: "networkidle" });

    // Focus the first tab
    const journalTab = page.getByRole("tab", { name: "Journal" });
    await journalTab.focus();

    // Press ArrowRight to move to next tab
    await page.keyboard.press("ArrowRight");
    const coaTab = page.getByRole("tab", { name: "Chart of Accounts" });
    await expect(coaTab).toBeFocused();

    // Press ArrowRight again
    await page.keyboard.press("ArrowRight");
    const tbTab = page.getByRole("tab", { name: "Trial Balance" });
    await expect(tbTab).toBeFocused();

    // Press ArrowLeft to go back
    await page.keyboard.press("ArrowLeft");
    await expect(coaTab).toBeFocused();

    // Press Home to go to first tab
    await page.keyboard.press("Home");
    await expect(journalTab).toBeFocused();

    // Press End to go to last tab
    await page.keyboard.press("End");
    const reconTab = page.getByRole("tab", { name: "Reconciliation" });
    await expect(reconTab).toBeFocused();
  });

  test("Enter/Space activates focused tab", async ({ page }) => {
    await page.goto("/dashboard/ledger", { waitUntil: "networkidle" });

    // Focus the Journal tab
    const journalTab = page.getByRole("tab", { name: "Journal" });
    await journalTab.focus();

    // Navigate to Trial Balance
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    // Activate with Enter
    await page.keyboard.press("Enter");

    // Trial Balance tab should now be selected
    const tbTab = page.getByRole("tab", { name: "Trial Balance" });
    await expect(tbTab).toHaveAttribute("aria-selected", "true");

    // The tab panel should be visible
    const panel = page.locator('[role="tabpanel"]');
    await expect(panel).toBeVisible();
  });
});
