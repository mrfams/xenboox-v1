# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: edge-cases.spec.ts >> Edge Case & Security Testing >> Input Sanitization >> URL parameters are sanitized
- Location: e2e\edge-cases.spec.ts:65:9

# Error details

```
Error: expect(received).not.toContain(expected) // indexOf

Expected substring: not "evil"
Received string:        "https://xenboox.vercel.app/login?callbackUrl=https://evil.com"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - generic [ref=e3]:
        - generic [ref=e4]:
            - heading "Xenboox" [level=1] [ref=e5]
            - paragraph [ref=e6]: AI-native accounting for Africa
        - generic [ref=e7]:
            - generic [ref=e8]:
                - heading "Sign in" [level=3] [ref=e9]
                - paragraph [ref=e10]: Enter your credentials to access your account
            - generic [ref=e11]:
                - generic [ref=e12]:
                    - generic [ref=e13]:
                        - text: Email
                        - textbox "Email" [ref=e14]:
                            - /placeholder: you@company.com
                    - generic [ref=e15]:
                        - generic [ref=e16]:
                            - generic [ref=e17]: Password
                            - link "Forgot password?" [ref=e18] [cursor=pointer]:
                                - /url: /forgot-password
                        - textbox "Password" [ref=e19]:
                            - /placeholder: ••••••••
                    - button "Sign in" [ref=e20] [cursor=pointer]
                - generic [ref=e25]: or
                - button "Continue with Google" [ref=e26] [cursor=pointer]:
                    - img [ref=e27]
                    - text: Continue with Google
        - generic [ref=e32]:
            - text: Don't have an account?
            - link "Sign up free" [ref=e33] [cursor=pointer]:
                - /url: /register
    - alert [ref=e34]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   |
  3   | test.describe("Edge Case & Security Testing", () => {
  4   |   // ─── XSS / Injection Testing ────────────────────────────────────────────
  5   |
  6   |   test.describe("Input Sanitization", () => {
  7   |     test("login form rejects XSS in email field", async ({ page }) => {
  8   |       await page.goto("/login", { waitUntil: "networkidle" });
  9   |
  10  |       const xssPayloads = [
  11  |         '<script>alert("xss")</script>',
  12  |         '"><script>alert(1)</script>',
  13  |         "'; DROP TABLE users; --",
  14  |         "../../etc/passwd",
  15  |         ".././../etc/passwd",
  16  |       ];
  17  |
  18  |       for (const payload of xssPayloads) {
  19  |         // Clear and fill with XSS payload
  20  |         const emailInput = page.locator('input[type="email"]');
  21  |         await emailInput.clear();
  22  |         await emailInput.fill(payload);
  23  |         await page.locator('input[type="password"]').fill("password123");
  24  |
  25  |         // Submit — should not cause an error on the page
  26  |         await page.locator('button[type="submit"]').click();
  27  |         await page.waitForTimeout(2000);
  28  |
  29  |         // Page should not have crashed
  30  |         await expect(page.locator("body")).toBeVisible();
  31  |       }
  32  |     });
  33  |
  34  |     test("register form handles special characters in name", async ({
  35  |       page,
  36  |     }) => {
  37  |       await page.goto("/register", { waitUntil: "networkidle" });
  38  |
  39  |       const specialNames = [
  40  |         "John <script>alert('xss')</script> Doe",
  41  |         "'; DELETE FROM users; --",
  42  |         "<img src=x onerror=alert(1)>",
  43  |         "𝒥𝓊𝓈𝓉𝒾𝓃 𝓉ℯ𝓈𝓉",
  44  |         "John\u0000Doe\u0000<script>",
  45  |         "日本語の名前",
  46  |         "الاسم العربي",
  47  |       ];
  48  |
  49  |       for (const name of specialNames) {
  50  |         await page.locator('input[id="name"]').clear();
  51  |         await page.locator('input[id="name"]').fill(name);
  52  |         await page
  53  |           .locator('input[id="email"]')
  54  |           .fill(`test${Math.random()}@example.com`);
  55  |         await page.locator('input[id="password"]').fill("password123");
  56  |         await page.locator('input[id="orgName"]').fill("Test Org");
  57  |
  58  |         await page.waitForTimeout(500);
  59  |
  60  |         // Page should still be functional
  61  |         await expect(page.locator('input[id="name"]')).toHaveValue(name);
  62  |       }
  63  |     });
  64  |
  65  |     test("URL parameters are sanitized", async ({ page }) => {
  66  |       // Test for open redirect vulnerabilities
  67  |       const maliciousUrls = [
  68  |         "/login?callbackUrl=https://evil.com",
  69  |         "/login?redirect=https://malicious-site.com",
  70  |         "/login?next=//evil.com",
  71  |       ];
  72  |
  73  |       for (const url of maliciousUrls) {
  74  |         await page.goto(url, { waitUntil: "networkidle" });
  75  |         // Should not redirect to external site
  76  |         const currentUrl = page.url();
> 77  |         expect(currentUrl).not.toContain("evil");
      |                                ^ Error: expect(received).not.toContain(expected) // indexOf
  78  |         expect(currentUrl).not.toContain("malicious");
  79  |       }
  80  |     });
  81  |   });
  82  |
  83  |   // ─── Form Edge Cases ────────────────────────────────────────────────────
  84  |
  85  |   test.describe("Form Edge Cases", () => {
  86  |     test("double click on submit does not cause duplicate submission", async ({
  87  |       page,
  88  |     }) => {
  89  |       await page.goto("/login", { waitUntil: "networkidle" });
  90  |
  91  |       // Fill credentials
  92  |       await page.locator('input[type="email"]').fill("test@example.com");
  93  |       await page.locator('input[type="password"]').fill("testpassword123");
  94  |
  95  |       // Rapid double-click submit
  96  |       const submitBtn = page.locator('button[type="submit"]');
  97  |       await submitBtn.click({ clickCount: 2 });
  98  |
  99  |       // Button should be disabled after first click (loading state)
  100 |       await page.waitForTimeout(1000);
  101 |       const isDisabled = await submitBtn.isDisabled();
  102 |       expect(isDisabled).toBeTruthy();
  103 |     });
  104 |
  105 |     test("loading state appears on form submission", async ({ page }) => {
  106 |       await page.goto("/login", { waitUntil: "networkidle" });
  107 |
  108 |       // Fill credentials
  109 |       await page.locator('input[type="email"]').fill("test@example.com");
  110 |       await page.locator('input[type="password"]').fill("testpassword123");
  111 |
  112 |       // Submit
  113 |       await page.locator('button[type="submit"]').click();
  114 |
  115 |       // Button should show loading state
  116 |       await page.waitForTimeout(500);
  117 |       const buttonText = await page
  118 |         .locator('button[type="submit"]')
  119 |         .textContent();
  120 |       expect(buttonText?.toLowerCase()).toContain("sign");
  121 |     });
  122 |
  123 |     test("maximum length inputs are handled gracefully", async ({ page }) => {
  124 |       await page.goto("/register", { waitUntil: "networkidle" });
  125 |
  126 |       // Generate a very long string
  127 |       const longName = "A".repeat(1000);
  128 |       const longEmail = `${"a".repeat(200)}@${"b".repeat(200)}.com`;
  129 |
  130 |       await page.locator('input[id="name"]').fill(longName);
  131 |       await page.locator('input[id="email"]').fill(longEmail);
  132 |       await page.locator('input[id="password"]').fill("password123");
  133 |       await page.locator('input[id="orgName"]').fill("Test Org");
  134 |
  135 |       // Submit — should not crash
  136 |       await page.locator('button[type="submit"]').click();
  137 |       await page.waitForTimeout(2000);
  138 |
  139 |       // Page should still be functional
  140 |       await expect(page.locator("body")).toBeVisible();
  141 |     });
  142 |   });
  143 |
  144 |   // ─── Page Error Handling ─────────────────────────────────────────────────
  145 |
  146 |   test.describe("Error Handling", () => {
  147 |     test("404 page shows for non-existent routes", async ({ page }) => {
  148 |       const response = await page.goto("/this-route-does-not-exist-12345", {
  149 |         waitUntil: "networkidle",
  150 |       });
  151 |
  152 |       // Next.js not-found page — should return 200 (renders not-found.tsx)
  153 |       expect(response?.status()).toBe(200);
  154 |
  155 |       // Should show some indication of not-found
  156 |       const bodyText = await page.locator("body").textContent();
  157 |       const hasNotFound = /not.?found|404|missing/i.test(bodyText ?? "");
  158 |       expect(hasNotFound).toBeTruthy();
  159 |     });
  160 |
  161 |     test("protected API routes reject unauthenticated requests", async ({
  162 |       page,
  163 |     }) => {
  164 |       // Try to access a protected API route directly
  165 |       const response = await page.goto("/api/trpc/ar.listInvoices", {
  166 |         waitUntil: "networkidle",
  167 |       });
  168 |
  169 |       // Should not expose data to unauthenticated users
  170 |       const bodyText = await page.locator("body").textContent();
  171 |       expect(bodyText).not.toContain("invoices");
  172 |     });
  173 |
  174 |     test("health endpoint returns OK", async ({ page }) => {
  175 |       const response = await page.goto("/api/health", {
  176 |         waitUntil: "networkidle",
  177 |       });
```
