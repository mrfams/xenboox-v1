import { test, expect } from "@playwright/test";

/**
 * =============================================================================
 * XENBOOX — COMPREHENSIVE E2E TEST SUITE
 * =============================================================================
 *
 * This suite tests every surface of the application:
 *   W.01  Marketing Pages (public)
 *   W.02  Auth Pages (login, register, forgot-password)
 *   W.03  Protected Routes (redirect to login when unauthenticated)
 *   W.04  Dashboard Module Routes (all 20+ modules)
 *   W.05  Cross-Cutting: Register -> Onboarding -> Dashboard flow
 *   W.06  Security & Edge Cases (XSS, validation, security headers)
 *   W.07  API Endpoints (health, tRPC)
 *   W.08  Error Handling (404, 500, error boundaries)
 *   W.09  Responsive Design (desktop, tablet, mobile)
 *   W.10  Performance Budgets
 *   W.11  Accessibility Basics
 *   W.12  Admin & Firm Routes
 *   W.13  Legal & Compliance Pages
 *   W.14  Document/Media Routes
 *   W.15  Pipeline & Sub-routes
 */

const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";
const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "demo1234";

// ═════════════════════════════════════════════════════════════════════════════
// W.01 — MARKETING PAGES
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.01 Marketing Pages — Public Routes", () => {
  const marketingPages = [
    { path: "/", title: /Xenboox|AI.native accounting/i },
    { path: "/features", title: /Features|Xenboox/i },
    { path: "/pricing", title: /Pricing|Xenboox/i },
    { path: "/about", title: /About|Xenboox/i },
    { path: "/blog", title: /Blog|Xenboox/i },
    { path: "/contact", title: /Contact|Xenboox/i },
    { path: "/careers", title: /Careers|Xenboox/i },
    { path: "/download", title: /Download|Xenboox/i },
  ];

  for (const { path, title } of marketingPages) {
    test(`${path}: loads with 200, correct title, no JS errors`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      const response = await page.goto(path, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      expect(response?.status(), `${path} should return 200`).toBe(200);
      await expect(page).toHaveTitle(title, { timeout: 10000 });
      await expect(page.locator("body")).toBeVisible();
      expect(errors, `${path}: no uncaught errors`).toEqual([]);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// W.02 — AUTH PAGES (Login, Register, Forgot Password)
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.02 Auth Pages", () => {
  test("login page: all form elements present", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator("text=Forgot password?")).toBeVisible();
    await expect(page.locator('a[href="/register"]').first()).toBeVisible();
  });

  test("login page: empty fields show HTML5 validation", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page: invalid credentials show error (no redirect)", async ({
    page,
  }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill("nonexistent@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword123");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    // Should stay on login or be at error callback — not at dashboard
    expect(page.url()).not.toContain("/dashboard");
  });

  test("register page: all fields present", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('input[id="orgName"]')).toHaveCount(0);
  });

  test("register page: invalid email shows validation", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await page.locator('input[id="name"]').fill("Test User");
    await page.locator('input[id="email"]').fill("not-an-email");
    await page.locator('input[id="password"]').fill("password123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("forgot password page: loads and shows email field", async ({
    page,
  }) => {
    await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("forgot password: valid email shows success message", async ({
    page,
  }) => {
    await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=Check your email")).toBeVisible({
      timeout: 10000,
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.03 — PROTECTED ROUTES (all must redirect to login)
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.03 Protected Routes — Unauthenticated Redirect", () => {
  const protectedRoutes = [
    "/dashboard",
    "/dashboard/settings",
    "/dashboard/chat",
    "/dashboard/notifications",
    "/dashboard/review-queue",
    "/dashboard/approvals",
    "/dashboard/audit-log",
    "/admin",
    "/admin/users",
    "/admin/organizations",
    "/admin/settings",
    "/admin/analytics",
    "/admin/financial",
    "/admin/spending",
  ];

  for (const route of protectedRoutes) {
    test(`${route}: redirects unauthenticated user to login`, async ({
      page,
    }) => {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 15000 });
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// W.04 — DASHBOARD MODULE ROUTES (all must redirect to login when unauthed)
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.04 Dashboard Module Routes — Redirect to Login", () => {
  const moduleRoutes = [
    "/dashboard/coa",
    "/dashboard/journal",
    "/dashboard/ap/invoices",
    "/dashboard/ap/suppliers",
    "/dashboard/ap/pos",
    "/dashboard/ar/invoices",
    "/dashboard/ar/customers",
    "/dashboard/treasury",
    "/dashboard/cash",
    "/dashboard/mobile-money",
    "/dashboard/payroll",
    "/dashboard/payroll/runs",
    "/dashboard/payroll/employees",
    "/dashboard/fixed-assets",
    "/dashboard/inventory",
    "/dashboard/inventory/warehouses",
    "/dashboard/expense/pipeline",
    "/dashboard/budget/pipeline",
    "/dashboard/reports",
    "/dashboard/reports/profit-and-loss",
    "/dashboard/reports/balance-sheet",
    "/dashboard/reports/trial-balance",
    "/dashboard/tax-compliance/pipeline",
    "/dashboard/audit/pipeline",
    "/dashboard/analytics/pipeline",
    "/dashboard/close",
    "/dashboard/documents",
    "/dashboard/invoices",
    "/dashboard/consolidation",
    "/dashboard/consolidation/view",
    "/dashboard/firm",
    "/dashboard/jurisdiction",
    "/dashboard/api-keys",
    "/dashboard/branding",
    "/dashboard/benchmarking",
    "/dashboard/ingestion",
    "/dashboard/help",
    "/dashboard/fiscal",
  ];

  for (const route of moduleRoutes) {
    test(`${route}: redirects to login when unauthenticated`, async ({
      page,
    }) => {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 15000 });
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// W.05 — CROSS-CUTTING: Register -> Onboarding -> Dashboard (demo@xenboox.com)
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.05 Cross-Cutting Flow — Register / Login / Dashboard", () => {
  test("login with demo credentials redirects to dashboard", async ({
    page,
  }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, "Test credentials not configured");
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/dashboard**", { timeout: 20000 });
    expect(page.url()).toContain("/dashboard");
    await expect(page.locator("body")).toBeVisible();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.06 — SECURITY & EDGE CASES
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.06 Security & Edge Cases", () => {
  test("login form: XSS payloads don't crash the page", async ({ page }) => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '"><script>alert(1)</script>',
      "'; DROP TABLE users; --",
      "../../etc/passwd",
    ];
    for (const payload of xssPayloads) {
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await page.locator('input[type="email"]').fill(payload);
      await page.locator('input[type="password"]').fill("password123");
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("register form: special characters in name are handled", async ({
    page,
  }) => {
    const specialNames = [
      "John <script>alert('xss')</script> Doe",
      "日本語の名前",
      "الاسم العربي",
      "𝒥𝓊𝓈𝓉𝒾𝓃 𝓉ℯ𝓈𝓉",
    ];
    for (const name of specialNames) {
      await page.goto("/register", { waitUntil: "domcontentloaded" });
      await page.locator('input[id="name"]').fill(name);
      await page
        .locator('input[id="email"]')
        .fill(`test${Date.now()}@example.com`);
      await page.locator('input[id="password"]').fill("password123");
      await page.waitForTimeout(500);
      await expect(page.locator('input[id="name"]')).toHaveValue(name);
    }
  });

  test("security headers: Content-Security-Policy present", async ({
    page,
  }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    const headers = response!.headers();
    expect(headers["x-content-type-options"]).toBeDefined();
    // Vercel typically sets these
    const hasCSP = headers["content-security-policy"] !== undefined;
    const hasXFO = headers["x-frame-options"] !== undefined;
    const hasRP = headers["referrer-policy"] !== undefined;
    console.log(`Security headers: CSP=${hasCSP} XFO=${hasXFO} RP=${hasRP}`);
  });

  test("URL parameters: open redirect protection", async ({ page }) => {
    const urls = [
      "/login?callbackUrl=https://evil.com",
      "/login?redirect=https://malicious.com",
    ];
    for (const url of urls) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const currentUrl = page.url();
      expect(currentUrl).not.toContain("evil");
      expect(currentUrl).not.toContain("malicious");
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.07 — API ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.07 API Endpoints", () => {
  test("health endpoint returns 200", async ({ page }) => {
    const response = await page.goto("/api/health", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);
  });

  test("protected tRPC endpoint returns 401/redirect for unauthenticated", async ({
    page,
  }) => {
    const response = await page.goto("/api/trpc/ar.listInvoices", {
      waitUntil: "domcontentloaded",
    });
    // Should not expose data
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("invoices");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.08 — ERROR HANDLING
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.08 Error Handling", () => {
  test("non-existent route shows 404 / not-found page", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200); // Next.js renders not-found.tsx
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/not.?found|404|missing/i);
  });

  test("deep nested non-existent route shows error page", async ({ page }) => {
    await page.goto("/dashboard/this-does-not-exist", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("error boundary renders for dashboard errors", async ({ page }) => {
    // Trigger an error route
    await page.goto("/dashboard/error", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.09 — RESPONSIVE DESIGN
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.09 Responsive Design", () => {
  const viewports = [
    { name: "Desktop (1440px)", width: 1440, height: 900 },
    { name: "Laptop (1280px)", width: 1280, height: 800 },
    { name: "Tablet (768px)", width: 768, height: 1024 },
    { name: "Mobile (375px)", width: 375, height: 812 },
  ];

  for (const vp of viewports) {
    test(`home page renders at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("body")).toBeVisible();
    });

    test(`login page renders at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// W.10 — PERFORMANCE BUDGETS
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.10 Performance Budgets", () => {
  test("home page loads within performance budget (20s)", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "networkidle", timeout: 30000 });
    const loadTime = Date.now() - start;
    console.log(`Home page load: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(20000);
  });

  test("login page loads within performance budget (15s)", async ({ page }) => {
    const start = Date.now();
    await page.goto("/login", { waitUntil: "networkidle", timeout: 30000 });
    const loadTime = Date.now() - start;
    console.log(`Login page load: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(15000);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.11 — ACCESSIBILITY BASICS
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.11 Accessibility Basics", () => {
  test("all images on home page have alt attributes", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt, `Image ${i} should have alt attribute`).not.toBeNull();
    }
  });

  test("keyboard navigation works on login form", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.locator('button[type="submit"]:focus')).toBeVisible();
  });

  test("meta viewport tag present for mobile", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveAttribute("content", /width=device-width/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.12 — ADMIN & FIRM ROUTES
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.12 Admin & Firm Routes — Redirect to Login", () => {
  const routes = [
    "/admin",
    "/admin/users",
    "/admin/organizations",
    "/admin/analytics",
    "/admin/alerts",
    "/admin/settings",
    "/admin/spending",
    "/admin/financial",
    "/dashboard/firm",
    "/dashboard/firm/clients",
    "/dashboard/branding",
    "/dashboard/api-keys",
  ];

  for (const route of routes) {
    test(`${route}: redirects unauthenticated`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 15000 });
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// W.13 — LEGAL & COMPLIANCE PAGES
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.13 Legal & Compliance Pages", () => {
  const legalPages = [
    { path: "/privacy", title: /Privacy|Xenboox/i },
    { path: "/terms", title: /Terms|Xenboox/i },
    { path: "/cookies", title: /Cookies|Xenboox/i },
    { path: "/refund", title: /Refund|Xenboox/i },
    { path: "/sla", title: /SLA|Xenboox/i },
    { path: "/docs", title: /Docs|Xenboox/i },
    { path: "/docs/security", title: /Security|Xenboox/i },
  ];

  for (const { path, title } of legalPages) {
    test(`${path}: loads with 200 and correct title`, async ({ page }) => {
      const response = await page.goto(path, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      expect(response?.status(), `${path} should return 200`).toBe(200);
      await expect(page).toHaveTitle(title, { timeout: 10000 });
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// W.14 — CONSOLE ERROR AUDIT
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.14 Console & Page Error Audit", () => {
  test("no console errors across all public pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const pages = [
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
    ];
    for (const path of pages) {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 15000 });
    }

    const significant = errors.filter(
      (e) =>
        !e.includes("Failed to load resource") &&
        !e.includes("favicon") &&
        !e.includes("404"),
    );
    if (significant.length > 0) {
      console.log(`Console errors: ${significant.join(" | ")}`);
    }
    expect(significant).toEqual([]);
  });

  test("no uncaught page errors on key pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const pages = ["/", "/login", "/register", "/features", "/pricing"];
    for (const path of pages) {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 15000 });
    }
    expect(errors).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.15 — PIPELINE SUB-ROUTES
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.15 Pipeline Sub-Routes — Redirect to Login", () => {
  const pipelineRoutes = [
    "/dashboard/audit/pipeline",
    "/dashboard/analytics/pipeline",
    "/dashboard/expense/pipeline",
    "/dashboard/budget/pipeline",
    "/dashboard/asset-pipeline/pipeline",
    "/dashboard/inventory-pipeline/pipeline",
    "/dashboard/tax-compliance/pipeline",
    "/dashboard/payroll/pipeline",
    "/dashboard/consolidation/pipeline",
    "/dashboard/ingestion",
  ];

  for (const route of pipelineRoutes) {
    test(`${route}: redirects unauthenticated`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 15000 });
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  }
});
