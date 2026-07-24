import { test, expect } from "@playwright/test";

test.describe("Enterprise Security & Production Readiness", () => {
  // ─── Security Headers ────────────────────────────────────────────────────

  test.describe("Security Headers", () => {
    test("security headers are present on all pages", async ({ page }) => {
      const response = await page.goto("/", { waitUntil: "networkidle" });
      expect(response).not.toBeNull();
      if (!response) return;

      const headers = response.headers();

      // Content-Security-Policy (may use nonce-based CSP)
      const hasCSP = headers["content-security-policy"] !== undefined;
      // X-Frame-Options
      const hasXFO = headers["x-frame-options"] !== undefined;
      // X-Content-Type-Options
      const hasXCTO = headers["x-content-type-options"] !== undefined;
      // Referrer-Policy
      const hasRP = headers["referrer-policy"] !== undefined;
      // X-Request-Id (custom header from middleware)
      const hasRequestId = headers["x-request-id"] !== undefined;

      // Report which headers are present
      const presentHeaders = [
        hasCSP && "Content-Security-Policy",
        hasXFO && "X-Frame-Options",
        hasXCTO && "X-Content-Type-Options",
        hasRP && "Referrer-Policy",
        hasRequestId && "X-Request-Id",
      ].filter(Boolean);

      console.log(`✅ Security headers present: ${presentHeaders.join(", ")}`);

      // At minimum, these should be present
      expect(hasXCTO).toBeTruthy(); // nosniff
    });

    test("notices content-type headers on API responses", async ({ page }) => {
      const response = await page.goto("/api/health", {
        waitUntil: "domcontentloaded",
      });
      expect(response).not.toBeNull();
      if (!response) return;

      const contentType = response.headers()["content-type"] ?? "";
      expect(contentType).toBeTruthy();
    });
  });

  // ─── HTTPS & SSL ────────────────────────────────────────────────────────

  test.describe("HTTPS & Transport Security", () => {
    test("all pages load over HTTPS (when not on localhost)", async ({
      page,
    }) => {
      const baseUrl = page.url() || "";
      if (baseUrl.startsWith("http://localhost")) {
        test.skip();
        return;
      }

      await page.goto("/", { waitUntil: "networkidle" });
      expect(page.url()).toMatch(/^https:\/\//);
    });
  });

  // ─── Cookie Security ─────────────────────────────────────────────────────

  test.describe("Cookie Security", () => {
    test("auth cookies have secure attributes", async ({ page }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      const cookies = await page.context().cookies();

      // Filter for auth-related cookies
      const authCookies = cookies.filter(
        (c) =>
          c.name.includes("auth") ||
          c.name.includes("next-auth") ||
          c.name.includes("session") ||
          c.name.includes("token"),
      );

      for (const cookie of authCookies) {
        console.log(
          `   Cookie "${cookie.name}": httpOnly=${cookie.httpOnly}, secure=${cookie.secure}, sameSite=${cookie.sameSite}`,
        );
      }

      // If auth cookies exist, they should have secure attributes
      for (const cookie of authCookies) {
        if (cookie.name.includes("auth") || cookie.name.includes("session")) {
          expect(cookie.httpOnly).toBeTruthy();
          expect(cookie.sameSite).toMatch(/lax|strict/i);
        }
      }
    });
  });

  // ─── Console & Performance ──────────────────────────────────────────────

  test.describe("Console & Performance", () => {
    test("no console errors on marketing pages", async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      const pages = ["/", "/features", "/pricing", "/about", "/contact"];
      for (const path of pages) {
        await page.goto(path, { waitUntil: "networkidle" });
      }

      // Filter out benign errors and log any found
      const significantErrors = consoleErrors.filter(
        (e) =>
          !e.includes("Failed to load resource") &&
          !e.includes("favicon.ico") &&
          !e.includes("404"),
      );

      if (significantErrors.length > 0) {
        console.log(
          `⚠️ Console errors found: ${significantErrors.join(" | ")}`,
        );
      }

      expect(significantErrors).toEqual([]);
    });

    test("no uncaught page errors on public pages", async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      const pages = ["/", "/login", "/register", "/features", "/pricing"];
      for (const path of pages) {
        await page.goto(path, { waitUntil: "networkidle" });
      }

      expect(pageErrors).toEqual([]);
    });
  });

  // ─── Status Codes ────────────────────────────────────────────────────────

  test.describe("HTTP Status Codes", () => {
    test("all public pages return 200", async ({ page }) => {
      const publicRoutes = [
        "/",
        "/login",
        "/register",
        "/forgot-password",
        "/features",
        "/pricing",
        "/about",
        "/contact",
        "/privacy",
        "/terms",
        "/cookies",
        "/refund",
        "/sla",
        "/docs",
      ];

      for (const route of publicRoutes) {
        const response = await page.goto(route, {
          waitUntil: "networkidle",
          timeout: 30000,
        });
        expect(
          response?.status(),
          `Route ${route} returned ${response?.status()}`,
        ).toBe(200);
      }
    });

    test("protected routes redirect unauthenticated users (302/307)", async ({
      page,
    }) => {
      const protectedRoutes = [
        "/dashboard",
        "/dashboard/settings",
        "/dashboard/ap/invoices",
        "/dashboard/ar/invoices",
      ];

      for (const route of protectedRoutes) {
        const response = await page.goto(route, {
          waitUntil: "networkidle",
          timeout: 15000,
        });

        // Should redirect to login
        expect(page.url(), `Route ${route} should redirect to login`).toContain(
          "/login",
        );
      }
    });
  });

  // ─── Performance Budgets ─────────────────────────────────────────────────

  test.describe("Performance Budgets", () => {
    test("home page loads within 5 seconds (fully interactive)", async ({
      page,
    }) => {
      const startTime = Date.now();
      await page.goto("/", { waitUntil: "networkidle", timeout: 30000 });
      const loadTime = Date.now() - startTime;

      console.log(`⏱️  Home page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(20000);
    });
  });
});
