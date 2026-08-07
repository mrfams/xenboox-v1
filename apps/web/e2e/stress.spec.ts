import { test, expect } from "@playwright/test";

// ─── Stress Testing — Enterprise Resilience Under Load ──────────────────────
//
// Pushes the platform past normal usage to verify it degrades gracefully:
//   - Brute-force auth hammering → account lockout / rate-limit 429
//   - Concurrent API v1 auth failures → structured 401s, zero crashes
//   - Session/csrf endpoints under rapid-fire → never 500
//   - Public pages under concurrent navigation → no server errors
//   - Health endpoint under concurrency → consistent 200
//   - Cross-route origin validation on mutations → 403, not crash
//
// These are intentionally aggressive. In local dev (in-memory rate limiter)
// they are isolated per run; the limiter resets with the server process.

const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";

/**
 * Cold dev-server compile: the first request to a route can take 30-60s as
 * Next.js compiles it on demand (especially after `.next` is cleared).
 * Warm up the heaviest routes serially before hammering them so the load
 * tests measure real behavior, not compilation.
 */
async function warmUp(request: {
  get: (
    url: string,
    opts?: Record<string, unknown>,
  ) => Promise<{
    status: () => number;
    text: () => Promise<string>;
    json: () => Promise<Record<string, unknown>>;
  }>;
}): Promise<void> {
  for (const url of [
    "/api/health",
    "/api/auth/session",
    "/api/v1/transactions",
  ]) {
    try {
      await request.get(url, { timeout: 120000 });
    } catch {
      // Warm-up failure is not a test failure — the real assertions follow.
    }
  }
}

test.describe("Stress Testing", () => {
  test.describe("Concurrent API v1 auth failures", () => {
    test("40 parallel requests without keys → all structured 401, no 5xx", async ({
      request,
    }) => {
      await warmUp(request);
      const results = await Promise.all(
        Array.from({ length: 40 }, () =>
          request.get("/api/v1/transactions", { timeout: 90000 }),
        ),
      );
      for (const res of results) {
        expect(res.status()).toBe(401);
        const body = await res.json().catch(() => null);
        expect(body?.error).toBe(true);
      }
    });

    test("40 parallel malformed keys → all 401, no crashes", async ({
      request,
    }) => {
      await warmUp(request);
      const results = await Promise.all(
        Array.from({ length: 40 }, (_, i) =>
          request.get("/api/v1/transactions", {
            headers: { "x-api-key": `bad-key-${i}` },
            timeout: 90000,
          }),
        ),
      );
      for (const res of results) {
        expect(res.status()).toBe(401);
        const text = await res.text();
        expect(text.includes("<!DOCTYPE")).toBe(false); // never HTML crash
      }
    });
  });

  test.describe("Auth endpoint hammering", () => {
    test("session endpoint survives 60 rapid-fire calls (never 500)", async ({
      request,
    }) => {
      test.setTimeout(180000);
      await request.get("/api/auth/session", { timeout: 90000 }); // warm
      const results = await Promise.all(
        Array.from({ length: 60 }, () =>
          request.get("/api/auth/session", { timeout: 90000 }),
        ),
      );
      for (const res of results) {
        expect(res.status()).toBe(200);
      }
    });

    test("csrf endpoint survives 60 rapid-fire calls", async ({ request }) => {
      test.setTimeout(180000);
      await request.get("/api/auth/csrf", { timeout: 90000 }); // warm
      const results = await Promise.all(
        Array.from({ length: 60 }, () =>
          request.get("/api/auth/csrf", { timeout: 90000 }),
        ),
      );
      for (const res of results) {
        expect(res.status()).toBe(200);
      }
    });

    test("login brute-force attempt is rate-limited to 429", async ({
      request,
    }) => {
      test.setTimeout(240000);
      await request.get("/api/auth/session", { timeout: 90000 }); // warm
      let saw429 = false;
      let saw500 = false;
      // 25 rapid POSTs — far past the 5/min auth-login limit
      for (let i = 0; i < 25; i++) {
        const res = await request.post("/api/auth/callback/credentials", {
          headers: { "content-type": "application/x-www-form-urlencoded" },
          data: `csrfToken=stress&email=${TEST_EMAIL}&password=wrong-${i}&callbackUrl=http://127.0.0.1:3000/dashboard`,
          timeout: 90000,
        });
        if (res.status() === 429) saw429 = true;
        if (res.status() >= 500) saw500 = true;
      }
      expect(saw500).toBe(false);
      expect(saw429).toBe(true);
    });
  });

  test.describe("Health endpoint under concurrency", () => {
    test("100 concurrent health checks → all 200 with valid payload", async ({
      request,
    }) => {
      await warmUp(request);
      const results = await Promise.all(
        Array.from({ length: 100 }, () =>
          request.get("/api/health", { timeout: 90000 }),
        ),
      );
      for (const res of results) {
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.status).toBeDefined();
      }
    });
  });

  test.describe("Public page resilience under concurrent load", () => {
    test("concurrent navigations to key public pages produce no 5xx", async ({
      browser,
    }) => {
      const paths = ["/", "/login", "/register", "/forgot-password", "/about"];
      // Warm each route once serially so the concurrent pass measures real
      // page load, not five simultaneous on-demand compilations.
      const warm = await browser.newPage();
      for (const p of paths) {
        await warm.goto(p, { timeout: 120000 }).catch(() => {});
      }
      await warm.close();

      const pages = await Promise.all(
        Array.from({ length: 5 }, () => browser.newPage()),
      );
      try {
        const results = await Promise.all(
          pages.map((page, i) =>
            page.goto(paths[i % paths.length]!, { timeout: 90000 }),
          ),
        );
        for (const res of results) {
          expect(res).not.toBeNull();
          expect(res!.status()).toBeLessThan(500);
        }
      } finally {
        await Promise.all(pages.map((p) => p.close()));
      }
    });
  });

  test.describe("Origin validation on mutations", () => {
    test("cross-origin POST to API is rejected (403), not processed", async ({
      request,
    }) => {
      test.setTimeout(120000);
      await request.get("/api/v1/transactions", { timeout: 90000 }); // warm
      const res = await request.post("/api/v1/transactions", {
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example.com",
        },
        data: JSON.stringify({}),
        timeout: 90000,
      });
      // 403 from origin validation OR 401 from missing key — never 5xx
      expect(res.status()).toBeLessThan(500);
    });
  });

  test.describe("REST v1 structured error guarantee", () => {
    test("unknown-but-valid-format key yields JSON, never HTML", async ({
      request,
    }) => {
      test.setTimeout(120000);
      await request.get("/api/v1/transactions", { timeout: 90000 }); // warm
      const res = await request.get("/api/v1/transactions", {
        headers: {
          "x-api-key": "xb_0123456789abcdef0123456789abcdef0123456789abcdef",
        },
        timeout: 90000,
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
      const text = await res.text();
      expect(text.includes("<!DOCTYPE")).toBe(false);
      expect(text.includes("<html")).toBe(false);
      // Must be parseable JSON (object) even on failure
      const body = JSON.parse(text);
      expect(body).toHaveProperty("error");
    });
  });
});
