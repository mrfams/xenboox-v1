# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flows.spec.ts >> Authentication Flows >> Login >> login with valid credentials redirects to dashboard
- Location: e2e\auth-flows.spec.ts:71:9

# Error details

```
TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard**" until "load"
  navigated to "http://localhost:3001/login"
============================================================
```

# Page snapshot

```yaml
- 'heading "Application error: a client-side exception has occurred while loading localhost (see the browser console for more information)." [level=2] [ref=e4]'
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   |
  3   | const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";
  4   | const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";
  5   | const TEST_PASSWORD = process.env.TEST_PASSWORD || "demo1234";
  6   |
  7   | test.describe("Authentication Flows", () => {
  8   |   // ─── Login Page ──────────────────────────────────────────────────────────
  9   |
  10  |   test.describe("Login", () => {
  11  |     test("login page loads with correct elements", async ({ page }) => {
  12  |       await page.goto("/login", { waitUntil: "networkidle" });
  13  |
  14  |       // Should show the Xenboox branding (visible span, not the title tag)
  15  |       await expect(
  16  |         page.locator("span:has-text('Xenboox')").first(),
  17  |       ).toBeVisible();
  18  |
  19  |       // Should have email and password fields
  20  |       await expect(page.locator('input[type="email"]')).toBeVisible();
  21  |       await expect(page.locator('input[type="password"]')).toBeVisible();
  22  |
  23  |       // Should have submit button
  24  |       await expect(page.locator('button[type="submit"]')).toBeVisible();
  25  |
  26  |       // Should have "Forgot password?" link
  27  |       await expect(page.locator("text=Forgot password?")).toBeVisible();
  28  |
  29  |       // Should have link to register
  30  |       await expect(page.locator('a[href="/register"]')).toBeVisible();
  31  |     });
  32  |
  33  |     test("login with invalid credentials shows error", async ({ page }) => {
  34  |       await page.goto("/login", { waitUntil: "networkidle" });
  35  |
  36  |       // Fill with invalid credentials
  37  |       await page.locator('input[type="email"]').fill("invalid@test.com");
  38  |       await page.locator('input[type="password"]').fill("wrongpassword");
  39  |
  40  |       // Submit the form
  41  |       await page.locator('button[type="submit"]').click();
  42  |
  43  |       // Should show an error message (wait for response)
  44  |       await page.waitForTimeout(3000);
  45  |
  46  |       // Either we stay on login page with error or get redirected
  47  |       const currentUrl = page.url();
  48  |       expect(
  49  |         currentUrl.includes("/login") || currentUrl.includes("/auth/callback"),
  50  |       ).toBeTruthy();
  51  |     });
  52  |
  53  |     test("login with empty fields shows validation", async ({ page }) => {
  54  |       await page.goto("/login", { waitUntil: "networkidle" });
  55  |
  56  |       // Try to submit empty form
  57  |       await page.locator('button[type="submit"]').click();
  58  |
  59  |       // HTML5 validation should prevent submission
  60  |       // Check that we're still on the login page
  61  |       await expect(page).toHaveURL(/\/login/);
  62  |
  63  |       // Email field should show validation
  64  |       const emailInput = page.locator('input[type="email"]');
  65  |       const validity = await emailInput.evaluate(
  66  |         (el: HTMLInputElement) => el.validationMessage,
  67  |       );
  68  |       expect(validity).toBeTruthy();
  69  |     });
  70  |
  71  |     test("login with valid credentials redirects to dashboard", async ({
  72  |       page,
  73  |     }) => {
  74  |       // Skip if test credentials are not real
  75  |       test.skip(
  76  |         !TEST_EMAIL || !TEST_PASSWORD,
  77  |         "Test credentials not configured",
  78  |       );
  79  |
  80  |       await page.goto("/login", { waitUntil: "networkidle" });
  81  |
  82  |       // Fill with valid credentials
  83  |       await page.locator('input[type="email"]').fill(TEST_EMAIL);
  84  |       await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  85  |
  86  |       // Submit
  87  |       await page.locator('button[type="submit"]').click();
  88  |
  89  |       // Wait for navigation to dashboard
> 90  |       await page.waitForURL("**/dashboard**", { timeout: 20000 });
      |                  ^ TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
  91  |
  92  |       // Should be on dashboard
  93  |       expect(page.url()).toContain("/dashboard");
  94  |
  95  |       // Dashboard should have key sections
  96  |       await expect(page.locator("body")).toBeVisible();
  97  |     });
  98  |   });
  99  |
  100 |   // ─── Register Page ───────────────────────────────────────────────────────
  101 |
  102 |   test.describe("Register", () => {
  103 |     test("register page loads with correct elements", async ({ page }) => {
  104 |       await page.goto("/register", { waitUntil: "networkidle" });
  105 |
  106 |       // Should show registration form
  107 |       await expect(page.locator('input[id="name"]')).toBeVisible();
  108 |       await expect(page.locator('input[id="email"]')).toBeVisible();
  109 |       await expect(page.locator('input[id="password"]')).toBeVisible();
  110 |       // Should have submit button
  111 |       await expect(page.locator('button[type="submit"]')).toBeVisible();
  112 |
  113 |       // Should have link to login (use .first() because header + footer both have login links)
  114 |       await expect(page.locator('a[href="/login"]').first()).toBeVisible();
  115 |
  116 |       // Should NOT have orgName field (registration no longer creates org)
  117 |       await expect(page.locator('input[id="orgName"]')).toHaveCount(0);
  118 |     });
  119 |
  120 |     test("register with empty fields shows validation", async ({ page }) => {
  121 |       await page.goto("/register", { waitUntil: "networkidle" });
  122 |
  123 |       // Try to submit empty form
  124 |       await page.locator('button[type="submit"]').click();
  125 |
  126 |       // HTML5 validation should catch empty required fields
  127 |       await expect(page).toHaveURL(/\/register/);
  128 |
  129 |       // Check that validation messages exist on required fields
  130 |       const nameInput = page.locator('input[id="name"]');
  131 |       const nameValidity = await nameInput.evaluate(
  132 |         (el: HTMLInputElement) => el.validationMessage,
  133 |       );
  134 |       expect(nameValidity).toBeTruthy();
  135 |     });
  136 |
  137 |     test("register with short password shows client-side error", async ({
  138 |       page,
  139 |     }) => {
  140 |       await page.goto("/register", { waitUntil: "networkidle" });
  141 |
  142 |       // Fill form with short password
  143 |       await page.locator('input[id="name"]').fill("Test User");
  144 |       await page.locator('input[id="email"]').fill("test@example.com");
  145 |
  146 |       // Try to fill a short password - HTML5 minLength will catch it
  147 |       const passwordInput = page.locator('input[id="password"]');
  148 |       await passwordInput.fill("short");
  149 |
  150 |       // Submit
  151 |       await page.locator('button[type="submit"]').click();
  152 |
  153 |       // Should either show client validation or error text
  154 |       const hasError = await page
  155 |         .locator("text=at least 8 characters")
  156 |         .isVisible()
  157 |         .catch(() => false);
  158 |       const validityMsg = await passwordInput.evaluate(
  159 |         (el: HTMLInputElement) => el.validationMessage,
  160 |       );
  161 |
  162 |       expect(hasError || validityMsg.length > 0).toBeTruthy();
  163 |     });
  164 |
  165 |     test("register with invalid email shows validation", async ({ page }) => {
  166 |       await page.goto("/register", { waitUntil: "networkidle" });
  167 |
  168 |       // Fill form with invalid email
  169 |       await page.locator('input[id="name"]').fill("Test User");
  170 |       await page.locator('input[id="email"]').fill("not-an-email");
  171 |       await page.locator('input[id="password"]').fill("password123");
  172 |
  173 |       // Submit
  174 |       await page.locator('button[type="submit"]').click();
  175 |
  176 |       // HTML5 email validation should catch it
  177 |       await expect(page).toHaveURL(/\/register/);
  178 |     });
  179 |   });
  180 |
  181 |   // ─── Forgot Password ─────────────────────────────────────────────────────
  182 |
  183 |   test.describe("Forgot Password", () => {
  184 |     test("forgot password page loads with correct elements", async ({
  185 |       page,
  186 |     }) => {
  187 |       await page.goto("/forgot-password", { waitUntil: "networkidle" });
  188 |
  189 |       // Should show the form
  190 |       await expect(page.locator('input[type="email"]')).toBeVisible();
```
