# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows\flow-01-register-onboard.spec.ts >> W.F01 Register → Onboarding → Dashboard >> 01.04 register with valid details redirects to dashboard
- Location: e2e\flows\flow-01-register-onboard.spec.ts:45:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - generic [ref=e8]:
        - generic [ref=e9]:
            - link "X Xenboox" [ref=e10] [cursor=pointer]:
                - /url: /
                - generic [ref=e11]: X
                - generic [ref=e12]: Xenboox
            - paragraph [ref=e13]: AI-native accounting for Africa
        - generic [ref=e14]:
            - generic [ref=e15]:
                - heading "Create your account" [level=3] [ref=e16]
                - paragraph [ref=e17]: Start your free trial — no credit card required
            - generic [ref=e18]:
                - generic [ref=e19]:
                    - generic [ref=e20]:
                        - text: Full Name
                        - textbox "Full Name" [ref=e21]:
                            - /placeholder: John Doe
                            - text: E2E User 1785095080572
                    - generic [ref=e22]:
                        - text: Email
                        - textbox "Email" [ref=e23]:
                            - /placeholder: you@company.com
                            - text: e2e-1785095080572@xenboox.test
                    - generic [ref=e24]:
                        - text: Password
                        - textbox "Password" [ref=e25]:
                            - /placeholder: At least 8 characters
                            - text: TestPassword123!
                    - generic [ref=e26]:
                        - text: Organization Name
                        - textbox "Organization Name" [ref=e27]:
                            - /placeholder: Your company or organization
                            - text: E2E Org 1785095080572
                    - paragraph [ref=e28]: '[ { "code": "custom", "message": "Password must contain uppercase, lowercase, number, and special character", "path": [ "password" ] } ]'
                    - button "Create account" [ref=e29] [cursor=pointer]
                - paragraph [ref=e30]:
                    - text: Already have an account?
                    - link "Sign in" [ref=e31] [cursor=pointer]:
                        - /url: /login
        - generic [ref=e32]:
            - text: Already have an account?
            - link "Sign in" [ref=e33] [cursor=pointer]:
                - /url: /login
    - alert [ref=e34]
```

# Test source

```ts
  1  | /**
  2  |  * W.F01 — Register → Onboarding → First Dashboard Look
  3  |  *
  4  |  * Tests the complete new-user registration flow end-to-end.
  5  |  * Uses random credentials to avoid collisions.
  6  |  */
  7  |
  8  | import { test, expect } from "@playwright/test";
  9  |
  10 | const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";
  11 |
  12 | const testUser = {
  13 |   name: `E2E User ${Date.now()}`,
  14 |   email: `e2e-${Date.now()}@xenboox.test`,
  15 |   password: "TestPassword123!",
  16 |   orgName: `E2E Org ${Date.now()}`,
  17 | };
  18 |
  19 | test.describe("W.F01 Register → Onboarding → Dashboard", () => {
  20 |   test("01.01 register page loads with all form fields", async ({ page }) => {
  21 |     await page.goto("/register", { waitUntil: "domcontentloaded" });
  22 |     await expect(page.locator('input[id="name"]')).toBeVisible();
  23 |     await expect(page.locator('input[id="email"]')).toBeVisible();
  24 |     await expect(page.locator('input[id="password"]')).toBeVisible();
  25 |     await expect(page.locator('input[id="orgName"]')).toBeVisible();
  26 |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  27 |   });
  28 |
  29 |   test("01.02 register empty fields prevent submission", async ({ page }) => {
  30 |     await page.goto("/register", { waitUntil: "domcontentloaded" });
  31 |     await page.locator('button[type="submit"]').click();
  32 |     await expect(page).toHaveURL(/\/register/);
  33 |   });
  34 |
  35 |   test("01.03 register invalid email shows validation", async ({ page }) => {
  36 |     await page.goto("/register", { waitUntil: "domcontentloaded" });
  37 |     await page.locator('input[id="name"]').fill("Test User");
  38 |     await page.locator('input[id="email"]').fill("not-an-email");
  39 |     await page.locator('input[id="password"]').fill("TestPassword123!");
  40 |     await page.locator('input[id="orgName"]').fill("Test Org");
  41 |     await page.locator('button[type="submit"]').click();
  42 |     await expect(page).toHaveURL(/\/register/);
  43 |   });
  44 |
  45 |   test("01.04 register with valid details redirects to dashboard", async ({ page }) => {
  46 |     await page.goto("/register", { waitUntil: "domcontentloaded" });
  47 |     await page.locator('input[id="name"]').fill(testUser.name);
  48 |     await page.locator('input[id="email"]').fill(testUser.email);
  49 |     await page.locator('input[id="password"]').fill(testUser.password);
  50 |     await page.locator('input[id="orgName"]').fill(testUser.orgName);
  51 |     await page.locator('button[type="submit"]').click();
  52 |     // Should redirect to dashboard (or onboarding)
> 53 |     await page.waitForURL(/\/(dashboard|welcome|onboarding)/, { timeout: 20000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
  54 |     expect(page.url()).toMatch(/\/(dashboard|welcome|onboarding)/);
  55 |     await expect(page.locator("body")).toBeVisible();
  56 |   });
  57 |
  58 |   test("01.05 dashboard shows welcome message for new user", async ({ page }) => {
  59 |     // Login with demo credentials since the new user registration may not fully work
  60 |     await page.goto("/login", { waitUntil: "domcontentloaded" });
  61 |     const demoEmail = process.env.TEST_EMAIL || "demo@xenboox.com";
  62 |     const demoPass = process.env.TEST_PASSWORD || "demo1234";
  63 |     await page.locator('input[type="email"]').fill(demoEmail);
  64 |     await page.locator('input[type="password"]').fill(demoPass);
  65 |     await page.locator('button[type="submit"]').click();
  66 |     await page.waitForURL("**/dashboard**", { timeout: 20000 });
  67 |     expect(page.url()).toContain("/dashboard");
  68 |     // Dashboard should be visible
  69 |     await expect(page.locator("body")).toBeVisible();
  70 |   });
  71 | });
  72 |
```
