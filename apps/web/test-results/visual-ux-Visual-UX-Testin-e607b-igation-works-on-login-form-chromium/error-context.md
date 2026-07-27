# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-ux.spec.ts >> Visual & UX Testing >> Visual Elements >> keyboard navigation works on login form
- Location: e2e\visual-ux.spec.ts:107:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button[type="submit"]:focus')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('button[type="submit"]:focus')

```

```yaml
- link "X Xenboox":
    - /url: /
- paragraph: AI-native accounting for Africa
- heading "Welcome back" [level=3]
- paragraph: Enter your credentials to access your account
- text: Email
- textbox "Email":
    - /placeholder: you@company.com
- text: Password
- link "Forgot password?":
    - /url: /forgot-password
- textbox "Password":
    - /placeholder: ••••••••
- button "Sign in"
- text: or
- button "Continue with Google":
    - img
    - text: Continue with Google
- text: Don't have an account?
- link "Sign up free":
    - /url: /register
- alert
```

# Test source

```ts
  18  |       // Should load within a reasonable time
  19  |       expect(loadTime).toBeLessThan(10000);
  20  |     });
  21  |
  22  |     test("login page loads within acceptable time", async ({ page }) => {
  23  |       const startTime = Date.now();
  24  |       await page.goto("/login", { waitUntil: "networkidle" });
  25  |       const loadTime = Date.now() - startTime;
  26  |
  27  |       // Form should be visible
  28  |       await expect(page.locator('input[type="email"]')).toBeVisible();
  29  |
  30  |       // Network idle should happen quickly
  31  |       expect(loadTime).toBeLessThan(15000);
  32  |     });
  33  |   });
  34  |
  35  |   // ─── Responsive Design ───────────────────────────────────────────────────
  36  |
  37  |   test.describe("Responsive Layout", () => {
  38  |     test("desktop layout renders correctly", async ({ page }) => {
  39  |       await page.setViewportSize({ width: 1440, height: 900 });
  40  |       await page.goto("/", { waitUntil: "networkidle" });
  41  |
  42  |       // Hero section should have full content visible
  43  |       await expect(page.locator("h1")).toBeVisible();
  44  |       await expect(page.locator("text=Start Free")).toBeVisible();
  45  |       await expect(page.locator("text=Talk to Sales")).toBeVisible();
  46  |     });
  47  |
  48  |     test("tablet layout is functional", async ({ page }) => {
  49  |       await page.setViewportSize({ width: 768, height: 1024 });
  50  |       await page.goto("/", { waitUntil: "networkidle" });
  51  |
  52  |       // Content should be visible at tablet size
  53  |       await expect(page.locator("h1")).toBeVisible();
  54  |       await expect(page.locator("text=Start Free")).toBeVisible();
  55  |     });
  56  |
  57  |     test("mobile layout is functional", async ({ page }) => {
  58  |       await page.setViewportSize({ width: 375, height: 812 });
  59  |       await page.goto("/", { waitUntil: "networkidle" });
  60  |
  61  |       // Content should be visible at mobile size
  62  |       await expect(page.locator("h1")).toBeVisible();
  63  |       await expect(page.locator("text=Start Free")).toBeVisible();
  64  |     });
  65  |
  66  |     test("mobile layout shows login page correctly", async ({ page }) => {
  67  |       await page.setViewportSize({ width: 375, height: 812 });
  68  |       await page.goto("/login", { waitUntil: "networkidle" });
  69  |
  70  |       // Form inputs should be usable on mobile
  71  |       await expect(page.locator('input[type="email"]')).toBeVisible();
  72  |       await expect(page.locator('input[type="password"]')).toBeVisible();
  73  |       await expect(page.locator('button[type="submit"]')).toBeVisible();
  74  |     });
  75  |   });
  76  |
  77  |   // ─── Visual Elements ─────────────────────────────────────────────────────
  78  |
  79  |   test.describe("Visual Elements", () => {
  80  |     test("navigation links on landing page work correctly", async ({
  81  |       page,
  82  |     }) => {
  83  |       await page.goto("/", { waitUntil: "networkidle" });
  84  |
  85  |       // Click "Start Free" CTA button
  86  |       await page.locator("text=Start Free").first().click();
  87  |       await page.waitForURL("**/register**", { timeout: 10000 });
  88  |       await expect(page.locator('input[id="name"]')).toBeVisible();
  89  |     });
  90  |
  91  |     test("favicon and meta tags are present", async ({ page }) => {
  92  |       await page.goto("/", { waitUntil: "networkidle" });
  93  |
  94  |       // Check meta viewport tag
  95  |       const viewportMeta = page.locator('meta[name="viewport"]');
  96  |       await expect(viewportMeta).toHaveAttribute(
  97  |         "content",
  98  |         /width=device-width/,
  99  |       );
  100 |
  101 |       // Check title
  102 |       const title = await page.title();
  103 |       expect(title).toBeTruthy();
  104 |       expect(title.length).toBeGreaterThan(0);
  105 |     });
  106 |
  107 |     test("keyboard navigation works on login form", async ({ page }) => {
  108 |       await page.goto("/login", { waitUntil: "networkidle" });
  109 |
  110 |       // Tab through form elements
  111 |       await page.keyboard.press("Tab");
  112 |       const focusedElement = page.locator(":focus");
  113 |       await expect(focusedElement).toBeVisible();
  114 |
  115 |       // Should be able to tab through all form fields
  116 |       await page.keyboard.press("Tab"); // Should move to password or next field
  117 |       await page.keyboard.press("Tab"); // Should move to submit button
> 118 |       await expect(page.locator('button[type="submit"]:focus')).toBeVisible();
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  119 |     });
  120 |
  121 |     test("images have alt attributes", async ({ page }) => {
  122 |       await page.goto("/", { waitUntil: "networkidle" });
  123 |
  124 |       // Check all images have alt text
  125 |       const images = page.locator("img");
  126 |       const count = await images.count();
  127 |       for (let i = 0; i < count; i++) {
  128 |         const alt = await images.nth(i).getAttribute("alt");
  129 |         // Allow decorative images with empty alt
  130 |         expect(alt).not.toBeNull();
  131 |       }
  132 |     });
  133 |   });
  134 |
  135 |   // ─── Empty States ────────────────────────────────────────────────────────
  136 |
  137 |   test.describe("Empty States", () => {
  138 |     test("login page shows proper empty state", async ({ page }) => {
  139 |       await page.goto("/login", { waitUntil: "networkidle" });
  140 |
  141 |       // Input fields should be empty initially
  142 |       const emailValue = await page.locator('input[type="email"]').inputValue();
  143 |       expect(emailValue).toBe("");
  144 |
  145 |       const passwordValue = await page
  146 |         .locator('input[type="password"]')
  147 |         .inputValue();
  148 |       expect(passwordValue).toBe("");
  149 |     });
  150 |   });
  151 | });
  152 |
```
