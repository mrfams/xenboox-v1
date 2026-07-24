import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";

test.describe("Marketing Pages — Public Routes", () => {
  const publicPages = [
    { path: "/", title: /Xenboox|AI.native accounting/i },
    { path: "/features", title: /Features|Xenboox/i },
    { path: "/pricing", title: /Pricing|Xenboox/i },
    { path: "/about", title: /About|Xenboox/i },
    { path: "/blog", title: /Blog|Xenboox/i },
    { path: "/contact", title: /Contact|Xenboox/i },
    { path: "/privacy", title: /Privacy|Xenboox/i },
    { path: "/terms", title: /Terms|Xenboox/i },
    { path: "/cookies", title: /Cookies|Xenboox/i },
    { path: "/refund", title: /Refund|Xenboox/i },
    { path: "/sla", title: /SLA|Xenboox/i },
    { path: "/docs", title: /Docs|Xenboox/i },
  ];

  for (const { path, title } of publicPages) {
    test(`${path} loads with correct title and no errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      const response = await page.goto(path, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Should return 200
      expect(response?.status()).toBe(200);

      // Should have the correct title
      await expect(page).toHaveTitle(title);

      // Should not have JavaScript errors
      expect(
        errors.filter((e) => !e.includes("Failed to load resource")),
      ).toEqual([]);

      // Should have a visible body
      await expect(page.locator("body")).toBeVisible();
    });
  }
});
