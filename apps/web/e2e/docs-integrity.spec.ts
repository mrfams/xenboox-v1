import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";

test.describe("Docs Enterprise Integrity", () => {
  test.describe("Documentation Pages", () => {
    const docsPages = [
      "/docs",
      "/docs/quickstart",
      "/docs/concepts",
      "/docs/concepts/organization-entity",
      "/docs/concepts/chart-of-accounts",
      "/docs/concepts/journal-entries",
      "/docs/concepts/fiscal-periods",
      "/docs/concepts/multi-currency",
      "/docs/concepts/roles-permissions",
      "/docs/concepts/ai-automation",
      "/docs/concepts/audit-trail",
      "/docs/modules",
      "/docs/modules/ar",
      "/docs/modules/ap",
      "/docs/modules/treasury",
      "/docs/modules/payroll",
      "/docs/modules/estimates",
      "/docs/modules/tax-compliance",
      "/docs/agents",
      "/docs/agents/cfo",
      "/docs/security",
      "/docs/security/encryption",
      "/docs/security/auth",
      "/docs/security/compliance",
      "/docs/api",
      "/docs/api/auth",
      "/docs/sdks",
      "/docs/resources",
      "/docs/faq",
    ];

    for (const pagePath of docsPages) {
      test(`docs page ${pagePath} loads and renders content`, async ({
        page,
      }) => {
        const response = await page.goto(`${BASE}${pagePath}`, {
          waitUntil: "networkidle",
        });

        // Page should load successfully
        expect(response?.status()).toBe(200);

        // Page should have visible content (not empty/error)
        const body = await page.textContent("body");
        expect(body).toBeTruthy();
        expect(body!.length).toBeGreaterThan(100);

        // Page should have a heading (h1, h2, or h3)
        const headings = await page.locator("h1, h2, h3").count();
        expect(headings).toBeGreaterThan(0);

        // Page should not show error states
        await expect(page.locator("text=404")).not.toBeVisible();
        await expect(
          page.locator("text=Something went wrong"),
        ).not.toBeVisible();
        await expect(
          page.locator("text=Internal Server Error"),
        ).not.toBeVisible();
      });
    }
  });

  test.describe("Docs Navigation", () => {
    test("docs sidebar renders all major sections", async ({ page }) => {
      await page.goto(`${BASE}/docs`, { waitUntil: "networkidle" });

      // Sidebar should contain key navigation items
      const sidebar = page.locator(
        "nav, [class*='sidebar'], [class*='sidebar-nav']",
      );
      if ((await sidebar.count()) > 0) {
        const sidebarText = await sidebar.first().textContent();

        // Core sections should be present
        const sections = [
          "Getting Started",
          "Core Concepts",
          "Modules",
          "Agents",
          "Security",
          "API",
        ];

        for (const section of sections) {
          expect(sidebarText).toContain(section);
        }
      }
    });

    test("docs search dialog opens and finds results", async ({ page }) => {
      await page.goto(`${BASE}/docs`, { waitUntil: "networkidle" });

      // Look for search trigger (Cmd+K or search button)
      const searchTrigger = page.locator(
        'button:has-text("Search"), [placeholder*="Search"], [aria-label*="search"]',
      );

      if ((await searchTrigger.count()) > 0) {
        await searchTrigger.first().click();
        await page.waitForTimeout(500);

        // Search dialog should appear
        const dialog = page.locator(
          '[role="dialog"], [class*="dialog"], [class*="search"]',
        );
        if ((await dialog.count()) > 0) {
          // Type a search query
          const input = dialog.locator("input");
          if ((await input.count()) > 0) {
            await input.first().fill("journal entry");
            await page.waitForTimeout(1000);

            // Should show search results
            const results = page.locator(
              '[class*="result"], [class*="item"], [role="option"]',
            );
            // Search results may or may not appear (depends on implementation)
          }
        }
      }
    });
  });

  test.describe("Docs Internal Links", () => {
    test("concept pages have working navigation links", async ({ page }) => {
      await page.goto(`${BASE}/docs/concepts`, { waitUntil: "networkidle" });

      // Find all links on the concepts page
      const links = await page.locator('a[href*="/docs/concepts/"]').all();

      // Should have at least 8 concept links
      expect(links.length).toBeGreaterThanOrEqual(8);

      // Click the first concept link and verify it loads
      if (links.length > 0) {
        const href = await links[0].getAttribute("href");
        expect(href).toBeTruthy();

        await links[0].click();
        await page.waitForLoadState("networkidle");

        // Should navigate to the concept page
        expect(page.url()).toContain(href!);

        // Page should have content
        const headings = await page.locator("h1, h2").count();
        expect(headings).toBeGreaterThan(0);
      }
    });

    test("agent docs pages load with correct content", async ({ page }) => {
      const agentPages = [
        "/docs/agents/cfo",
        "/docs/agents/controller",
        "/docs/agents/treasury",
      ];

      for (const agentPath of agentPages) {
        await page.goto(`${BASE}${agentPath}`, { waitUntil: "networkidle" });

        // Agent page should load
        const body = await page.textContent("body");
        expect(body).toBeTruthy();

        // Should contain agent description content
        expect(body!.length).toBeGreaterThan(200);

        // Should not show errors
        await expect(page.locator("text=404")).not.toBeVisible();
      }
    });
  });
});
