# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flows.spec.ts >> Authentication Flows >> Forgot Password >> forgot password submit shows success message
- Location: e2e\auth-flows.spec.ts:194:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Check your email')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('text=Check your email')

```

```yaml
- 'heading "Application error: a client-side exception has occurred while loading localhost (see the browser console for more information)." [level=2]'
```

# Test source

```ts
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
  191 |       await expect(page.locator('button[type="submit"]')).toBeVisible();
  192 |     });
  193 |
  194 |     test("forgot password submit shows success message", async ({ page }) => {
  195 |       await page.goto("/forgot-password", { waitUntil: "networkidle" });
  196 |
  197 |       // Fill email
  198 |       await page.locator('input[type="email"]').fill("test@example.com");
  199 |
  200 |       // Submit
  201 |       await page.locator('button[type="submit"]').click();
  202 |
  203 |       // Should show success message (no email enumeration)
> 204 |       await expect(page.locator("text=Check your email")).toBeVisible();
      |                                                           ^ Error: expect(locator).toBeVisible() failed
  205 |     });
  206 |
  207 |     test("forgot password empty email shows validation", async ({ page }) => {
  208 |       await page.goto("/forgot-password", { waitUntil: "networkidle" });
  209 |
  210 |       // Try to submit empty form
  211 |       await page.locator('button[type="submit"]').click();
  212 |
  213 |       // HTML5 validation should prevent submission
  214 |       await expect(page).toHaveURL(/\/forgot-password/);
  215 |     });
  216 |   });
  217 |
  218 |   // ─── Auth Page Redirects ─────────────────────────────────────────────────
  219 |
  220 |   test.describe("Auth Page Redirects", () => {
  221 |     test("unauthenticated user redirected to login from dashboard", async ({
  222 |       page,
  223 |     }) => {
  224 |       await page.goto("/dashboard", {
  225 |         waitUntil: "networkidle",
  226 |         timeout: 15000,
  227 |       });
  228 |
  229 |       // Should be redirected to login
  230 |       await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  231 |     });
  232 |
  233 |     test("unauthenticated user redirected to login from protected pages", async ({
  234 |       page,
  235 |     }) => {
  236 |       const protectedRoutes = [
  237 |         "/dashboard/ap/invoices",
  238 |         "/dashboard/ar/invoices",
  239 |         "/dashboard/treasury",
  240 |         "/dashboard/close",
  241 |         "/dashboard/chat",
  242 |         "/dashboard/settings",
  243 |       ];
  244 |
  245 |       for (const route of protectedRoutes) {
  246 |         await page.goto(route, {
  247 |           waitUntil: "networkidle",
  248 |           timeout: 15000,
  249 |         });
  250 |
  251 |         // Should be redirected to login
  252 |         await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  253 |
  254 |         // Go back to clean state
  255 |         await page.goto("/login", { waitUntil: "networkidle" });
  256 |       }
  257 |     });
  258 |   });
  259 | });
  260 |
```
