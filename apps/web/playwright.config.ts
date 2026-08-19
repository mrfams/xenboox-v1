import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "demo1234";
// Headless by default in CI/local automation; headed when explicitly requested
// so humans can watch the browser.
const HEADLESS = process.env.HEADLESS !== "false";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  timeout: 90000,
  expect: {
    timeout: 15000,
    toMatchSnapshot: { maxDiffPixelRatio: 0.05 },
  },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 45000,
    headless: HEADLESS,
    launchOptions: {
      headless: HEADLESS,
      // Bypass any system proxy so localhost automation is never intercepted.
      args: ["--no-proxy-server"],
    },
    ignoreHTTPSErrors: true,
  },
  projects: [
    // 1. Auth setup — authenticate once via the real UI flow and persist
    //    storageState. All authenticated projects depend on this so they never
    //    hit the brute-force login rate limiter per-test.
    {
      name: "auth-setup",
      testMatch: /setup\/auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // 2. Unauthenticated specs (login page, auth redirects, marketing, security
    //    headers) run in a clean context.
    {
      name: "anon-chromium",
      testMatch:
        /(auth-flows|marketing-pages|edge-cases|enterprise-security|visual-ux)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: [],
    },
    // 3. Authenticated specs — reuse the session captured in auth-setup.
    {
      name: "chromium",
      testMatch:
        /(enterprise-production|production-infra|production-readiness|comprehensive-suite|chat-flow|stress|tax-estimates|mobile-navigation|a11y-axe)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["auth-setup"],
    },
    // 4. Firefox — cross-browser verification for enterprise buyers.
    {
      name: "firefox",
      testMatch:
        /(enterprise-production|production-infra|production-health|docs-integrity)\.spec\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["auth-setup"],
    },
    // 5. WebKit (Safari) — cross-browser verification for macOS/iOS users.
    {
      name: "webkit",
      testMatch:
        /(enterprise-production|production-infra|production-health|docs-integrity)\.spec\.ts/,
      use: {
        ...devices["Desktop Safari"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["auth-setup"],
    },
  ],
  globalSetup: "./e2e/setup/global-setup.ts",
});
