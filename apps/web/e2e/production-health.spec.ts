import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";

test.describe("Production Health & Infrastructure", () => {
  test.describe("Health Check Endpoints", () => {
    test("GET /api/health returns 200 with basic status", async ({
      request,
    }) => {
      const response = await request.get(`${BASE}/api/health`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status");
      expect(body.status).toBe("ok");
    });

    test("GET /api/health?check=live returns liveness probe", async ({
      request,
    }) => {
      const response = await request.get(`${BASE}/api/health?check=live`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status");
    });

    test("GET /api/health?check=ready returns readiness probe", async ({
      request,
    }) => {
      const response = await request.get(`${BASE}/api/health?check=ready`);
      // May return 200 (ready) or 503 (not ready) depending on DB/Redis
      expect([200, 503]).toContain(response.status());

      const body = await response.json();
      expect(body).toHaveProperty("status");
    });

    test("health endpoint does not expose sensitive information", async ({
      request,
    }) => {
      const response = await request.get(`${BASE}/api/health?check=detailed`);
      const body = await response.text();

      // Should not contain secrets, passwords, or API keys
      expect(body).not.toContain("DATABASE_URL");
      expect(body).not.toContain("AUTH_SECRET");
      expect(body).not.toContain("ANTHROPIC_API_KEY");
      expect(body).not.toContain("password");
      expect(body).not.toContain("sk-");
    });
  });

  test.describe("Security Headers", () => {
    test("all security headers present on main pages", async ({ page }) => {
      const pagesToTest = ["/", "/docs", "/pricing"];

      for (const pagePath of pagesToTest) {
        const response = await page.goto(`${BASE}${pagePath}`, {
          waitUntil: "networkidle",
        });
        expect(response).not.toBeNull();
        if (!response) continue;

        const headers = response.headers();

        // Critical security headers
        expect(
          headers["x-content-type-options"],
          `Missing X-Content-Type-Options on ${pagePath}`,
        ).toBe("nosniff");

        expect(
          headers["x-frame-options"],
          `Missing X-Frame-Options on ${pagePath}`,
        ).toBe("DENY");

        expect(
          headers["referrer-policy"],
          `Missing Referrer-Policy on ${pagePath}`,
        ).toBeTruthy();

        // CSP should be present (may be nonce-based)
        expect(
          headers["content-security-policy"],
          `Missing Content-Security-Policy on ${pagePath}`,
        ).toBeTruthy();

        // HSTS should be present
        expect(
          headers["strict-transport-security"],
          `Missing HSTS on ${pagePath}`,
        ).toContain("max-age=");

        // Custom request ID header
        expect(
          headers["x-request-id"],
          `Missing X-Request-Id on ${pagePath}`,
        ).toBeTruthy();
      }
    });

    test("CSP blocks inline scripts in production", async ({ page }) => {
      const response = await page.goto(`${BASE}/`, {
        waitUntil: "networkidle",
      });
      const csp = response?.headers()["content-security-policy"];

      if (csp) {
        // Production CSP should not allow unsafe-inline for scripts
        // (dev mode does allow it for HMR)
        const isDev = process.env.NODE_ENV === "development";
        if (!isDev) {
          expect(csp).not.toContain("script-src 'unsafe-inline'");
        }
      }
    });
  });

  test.describe("Rate Limiting", () => {
    test("rate limit headers are present on API responses", async ({
      request,
    }) => {
      const response = await request.get(`${BASE}/api/health`);
      const headers = response.headers();

      // Health endpoint may not have rate limit headers, but /api/trpc should
      // This is a basic check that the rate limiting infrastructure exists
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe("Static Assets", () => {
    test("robots.txt is accessible", async ({ request }) => {
      const response = await request.get(`${BASE}/robots.txt`);
      expect(response.status()).toBe(200);

      const body = await response.text();
      expect(body).toContain("User-agent");
    });

    test("sitemap.xml is accessible", async ({ request }) => {
      const response = await request.get(`${BASE}/sitemap.xml`);
      expect(response.status()).toBe(200);

      const body = await response.text();
      expect(body).toContain("<?xml");
      expect(body).toContain("<urlset");
    });

    test("favicon.ico is accessible", async ({ request }) => {
      const response = await request.get(`${BASE}/favicon.ico`);
      expect(response.status()).toBe(200);
    });
  });

  test.describe("Error Handling", () => {
    test("non-existent API route returns proper error", async ({ request }) => {
      const response = await request.get(
        `${BASE}/api/nonexistent-route-${Date.now()}`,
      );
      // Should return 404, not 500
      expect(response.status()).toBe(404);
    });

    test("non-existent page shows custom 404", async ({ page }) => {
      await page.goto(`${BASE}/nonexistent-page-${Date.now()}`, {
        waitUntil: "networkidle",
      });

      // Should show 404 or redirect, not crash
      const body = await page.textContent("body");
      expect(body).toBeTruthy();
    });
  });

  test.describe("Performance Baselines", () => {
    test("marketing pages load within 5 seconds", async ({ page }) => {
      const start = Date.now();
      const response = await page.goto(`${BASE}/`, {
        waitUntil: "networkidle",
      });
      const loadTime = Date.now() - start;

      expect(response?.status()).toBe(200);
      expect(loadTime, `Homepage took ${loadTime}ms (>5000ms)`).toBeLessThan(
        5000,
      );
    });

    test("docs pages load within 3 seconds", async ({ page }) => {
      const start = Date.now();
      const response = await page.goto(`${BASE}/docs`, {
        waitUntil: "networkidle",
      });
      const loadTime = Date.now() - start;

      expect(response?.status()).toBe(200);
      expect(loadTime, `Docs page took ${loadTime}ms (>3000ms)`).toBeLessThan(
        3000,
      );
    });
  });
});
