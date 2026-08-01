# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flows.spec.ts >> Authentication Flows >> Auth Page Redirects >> unauthenticated user redirected to login from protected pages
- Location: e2e\auth-flows.spec.ts:233:9

# Error details

```
TimeoutError: page.goto: Timeout 15000ms exceeded.
Call log:
  - navigating to "http://localhost:3001/dashboard/ar/invoices", waiting until "networkidle"

```

# Page snapshot

```yaml
- generic [ref=e5]:
    - generic [ref=e6]:
        - link "X Xenboox" [ref=e7] [cursor=pointer]:
            - /url: /
            - generic [ref=e8]: X
            - text: Xenboox
        - paragraph [ref=e9]: AI-native accounting for Africa
    - generic [ref=e10]:
        - generic [ref=e11]:
            - heading "Welcome back" [level=3] [ref=e12]
            - paragraph [ref=e13]: Enter your credentials to access your account
        - generic [ref=e14]:
            - generic [ref=e15]:
                - generic [ref=e16]:
                    - text: Email
                    - textbox "Email" [ref=e17]:
                        - /placeholder: you@company.com
                - generic [ref=e18]:
                    - generic [ref=e19]:
                        - text: Password
                        - link "Forgot password?" [ref=e20] [cursor=pointer]:
                            - /url: /forgot-password
                    - textbox "Password" [ref=e21]:
                        - /placeholder: ••••••••
                - button "Sign in" [ref=e22]
            - generic [ref=e24]: or
            - button "Continue with Google" [ref=e25]:
                - img [ref=e26]
                - text: Continue with Google
    - generic [ref=e31]:
        - text: Don't have an account?
        - link "Sign up free" [ref=e32] [cursor=pointer]:
            - /url: /register
```

# Test source

```ts
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
  204 |       await expect(page.locator("text=Check your email")).toBeVisible();
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
> 246 |         await page.goto(route, {
      |                    ^ TimeoutError: page.goto: Timeout 15000ms exceeded.
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
