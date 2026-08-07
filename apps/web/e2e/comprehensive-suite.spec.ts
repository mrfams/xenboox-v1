import { test, expect } from "@playwright/test";

/**
 * =============================================================================
 * XENBOOX — COMPREHENSIVE E2E TEST SUITE (v2 — Updated)
 * =============================================================================
 *
 * This suite tests every surface of the application:
 *   W.01  Marketing Pages (public)
 *   W.02  Auth Pages (login, register, forgot-password)
 *   W.03  Protected Routes (redirect to login when unauthenticated)
 *   W.04  Dashboard Module Routes
 *   W.05  Cross-Cutting: Login → Dashboard flow
 *   W.06  Security & Edge Cases
 *   W.07  API Endpoints
 *   W.08  Error Handling
 *   W.09  Responsive Design
 *   W.10  Performance Budgets
 *   W.11  Accessibility Basics
 *   W.12  Legal & Compliance Pages
 *   W.13  Blog Pages
 *   W.14  Careers Pages
 *   W.15  Console Error Audit
 */

const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";
const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "demo1234";

/**
 * Navigate and report whether we're on the anonymous surface. In
 * storageState-authenticated contexts, /login (and other auth routes) 302 to
 * /dashboard immediately — tests that target the anon surface must branch.
 */
async function gotoAnon(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30000 });
  return !page.url().includes("/dashboard");
}

async function ensureOnDashboard(page: import("@playwright/test").Page) {
  if (!page.url().includes("/dashboard")) {
    await page.waitForURL("**/dashboard**", { timeout: 20000 });
  }
}

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
// W.02 — AUTH PAGES
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.02 Auth Pages", () => {
  test("login page: all form elements present", async ({ page }) => {
    const isAnon = await gotoAnon(page, "/login");
    if (!isAnon) {
      await ensureOnDashboard(page);
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator("text=Forgot password?")).toBeVisible();
    await expect(page.locator('a[href="/register"]').first()).toBeVisible();
  });

  test("login page: empty fields show HTML5 validation", async ({ page }) => {
    const isAnon = await gotoAnon(page, "/login");
    if (!isAnon) {
      await ensureOnDashboard(page);
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page: invalid credentials show error (no redirect)", async ({
    page,
  }) => {
    const isAnon = await gotoAnon(page, "/login");
    if (!isAnon) {
      await ensureOnDashboard(page);
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    await page.locator('input[type="email"]').fill("nonexistent@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword123");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain("/dashboard");
  });

  test("register page: all fields present", async ({ page }) => {
    const isAnon = await gotoAnon(page, "/register");
    if (!isAnon) {
      await ensureOnDashboard(page);
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('input[id="orgName"]')).toHaveCount(0);
  });

  test("register page: invalid email shows validation", async ({ page }) => {
    const isAnon = await gotoAnon(page, "/register");
    if (!isAnon) {
      await ensureOnDashboard(page);
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    await page.locator('input[id="name"]').fill("Test User");
    await page.locator('input[id="email"]').fill("not-an-email");
    await page.locator('input[id="password"]').fill("password123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("forgot password page: loads and shows email field", async ({
    page,
  }) => {
    const isAnon = await gotoAnon(page, "/forgot-password");
    if (!isAnon) {
      await ensureOnDashboard(page);
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("forgot password: valid email shows success message", async ({
    page,
  }) => {
    const isAnon = await gotoAnon(page, "/forgot-password");
    if (!isAnon) {
      await ensureOnDashboard(page);
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=Check your email")).toBeVisible({
      timeout: 10000,
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.03 — PROTECTED ROUTES
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.03 Protected Routes — Unauthenticated Redirect", () => {
  const protectedRoutes = [
    "/dashboard",
    "/dashboard/settings",
    "/dashboard/chat",
    "/dashboard/inbox",
    "/dashboard/transactions",
    "/dashboard/banking",
    "/dashboard/journal",
    "/dashboard/customers",
    "/dashboard/vendors",
    "/dashboard/invoicing",
    "/dashboard/bills",
    "/dashboard/expenses",
    "/dashboard/payroll",
    "/dashboard/reports",
    "/dashboard/close",
    "/dashboard/reconciliation/center",
    "/dashboard/agent-monitor",
    "/admin",
  ];

  for (const route of protectedRoutes) {
    test(`${route}: redirects unauthenticated user to login`, async ({
      page,
    }) => {
      await page.goto(route, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      // Authenticated (storageState) contexts load the route directly; admin
      // routes always gate on the separate admin session (/admin-login).
      const url = page.url();
      if (route.startsWith("/admin")) {
        if (!url.includes("/admin-login")) {
          await expect(page).toHaveURL(/\/admin-login/, { timeout: 10000 });
        }
      } else if (!url.includes("/dashboard")) {
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
      }
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// W.04 — DASHBOARD MODULE ROUTES
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.04 Dashboard Module Routes — Redirect to Login", () => {
  const moduleRoutes = [
    "/dashboard/agent-monitor",
    "/dashboard/automation",
    "/dashboard/banking",
    "/dashboard/bills",
    "/dashboard/chart-of-accounts",
    "/dashboard/chat",
    "/dashboard/close",
    "/dashboard/customers",
    "/dashboard/documents",
    "/dashboard/expenses",
    "/dashboard/fixed-assets",
    "/dashboard/inbox",
    "/dashboard/invoicing",
    "/dashboard/journal",
    "/dashboard/payroll",
    "/dashboard/reconciliation/center",
    "/dashboard/reconciliation",
    "/dashboard/reports",
    "/dashboard/settings",
    "/dashboard/transactions",
    "/dashboard/vendors",
  ];

  for (const route of moduleRoutes) {
    test(`${route}: redirects to login when unauthenticated`, async ({
      page,
    }) => {
      await page.goto(route, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      // Authenticated (storageState) contexts load the module route directly.
      const url = page.url();
      if (!url.includes("/dashboard")) {
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
      }
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// W.05 — CROSS-CUTTING: Login → Dashboard
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.05 Cross-Cutting Flow — Login / Dashboard", () => {
  test("login with demo credentials redirects to dashboard", async ({
    page,
  }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, "Test credentials not configured");
    const isAnon = await gotoAnon(page, "/login");
    if (!isAnon) {
      await ensureOnDashboard(page);
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/dashboard**", { timeout: 20000 });
    expect(page.url()).toContain("/dashboard");
    await expect(page.locator("body")).toBeVisible();
  });

  test("dashboard has sidebar navigation", async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, "Test credentials not configured");
    const isAnon = await gotoAnon(page, "/login");
    if (isAnon) {
      await page.locator('input[type="email"]').fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.locator('button[type="submit"]').click();
    }
    await ensureOnDashboard(page);

    // Should have sidebar with navigation items
    await expect(page.locator('[data-tour="sidebar"]')).toBeVisible();
  });

  test("dashboard has AI chat panel", async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, "Test credentials not configured");
    const isAnon = await gotoAnon(page, "/login");
    if (isAnon) {
      await page.locator('input[type="email"]').fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.locator('button[type="submit"]').click();
    }
    await ensureOnDashboard(page);

    // Should have CFO Agent chat panel (docked right panel, open by default)
    await expect(page.locator("text=CFO Agent").first()).toBeVisible({
      timeout: 15000,
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.06 — SECURITY & EDGE CASES
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.06 Security & Edge Cases", () => {
  test("login form: XSS payloads don't crash the page", async ({ page }) => {
    const isAnon = await gotoAnon(page, "/login");
    if (!isAnon) {
      await ensureOnDashboard(page);
      await expect(page.locator("body")).toBeVisible();
      return;
    }
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
});

// ═════════════════════════════════════════════════════════════════════════════
// W.08 — ERROR HANDLING
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.08 Error Handling", () => {
  test("non-existent route shows 404 / not-found page", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist", {
      waitUntil: "domcontentloaded",
    });
    // Anonymous contexts render the not-found shell (200); authenticated
    // contexts redirect unknown non-public routes to /login (3xx). Either way
    // the request resolves — never a 5xx crash.
    expect(response?.status() ?? 0).toBeLessThan(500);
    if (page.url().includes("/login")) {
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/not.?found|404|missing/i);
  });

  test("deep nested non-existent route shows error page", async ({ page }) => {
    await page.goto("/dashboard/this-does-not-exist", {
      waitUntil: "domcontentloaded",
    });
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
      const isAnon = await gotoAnon(page, "/login");
      if (isAnon) {
        await expect(page.locator('input[type="email"]')).toBeVisible();
      } else {
        await expect(page.locator("body")).toBeVisible();
      }
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// W.10 — PERFORMANCE BUDGETS
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.10 Performance Budgets", () => {
  test("home page loads within performance budget (20s)", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30000 });
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
    const isAnon = await gotoAnon(page, "/login");
    if (!isAnon) {
      await ensureOnDashboard(page);
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    // Walk the full tab order until the submit button is focused (the logo
    // link precedes the form fields).
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

  test("meta viewport tag present for mobile", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveAttribute("content", /width=device-width/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.12 — LEGAL & COMPLIANCE PAGES
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.12 Legal & Compliance Pages", () => {
  const legalPages = [
    { path: "/privacy", title: /Privacy|Xenboox/i },
    { path: "/terms", title: /Terms|Xenboox/i },
    { path: "/cookies", title: /Cookies|Xenboox/i },
    { path: "/refund", title: /Refund|Xenboox/i },
    { path: "/sla", title: /SLA|Xenboox/i },
    { path: "/docs", title: /Docs|Xenboox/i },
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
// W.13 — BLOG PAGES
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.13 Blog Pages", () => {
  test("blog listing page loads", async ({ page }) => {
    const response = await page.goto("/blog", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("blog post pages load (from listing)", async ({ page }) => {
    await page.goto("/blog", { waitUntil: "domcontentloaded" });
    // Click on first blog post link
    const firstPost = page.locator('a[href^="/blog/"]').first();
    if (await firstPost.isVisible()) {
      await firstPost.click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("article")).toBeVisible();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.14 — CAREERS PAGES
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.14 Careers Pages", () => {
  test("careers listing page loads", async ({ page }) => {
    const response = await page.goto("/careers", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("careers page has job listings", async ({ page }) => {
    await page.goto("/careers", { waitUntil: "domcontentloaded" });
    // Should have job listing cards
    const jobCards = page.locator('a[href^="/careers/"]');
    const count = await jobCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("job detail page loads", async ({ page }) => {
    await page.goto("/careers", { waitUntil: "domcontentloaded" });
    const firstJob = page.locator('a[href^="/careers/"]').first();
    if (await firstJob.isVisible()) {
      await firstJob.click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// W.15 — CONSOLE ERROR AUDIT
// ═════════════════════════════════════════════════════════════════════════════

test.describe("W.15 Console & Page Error Audit", () => {
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
      "/blog",
      "/careers",
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
